"""
RapidOCR microservice for Racetap.

Free, self-hosted OCR (Apache-2.0) using the PaddleOCR PP-OCR models through
ONNX Runtime. The CodeIgniter app calls this over HTTP when OCR_SERVICE_URL is
set; no API key and no quota.

Accuracy notes:
- Two passes (native + upscaled/enhanced) are merged by text + position, so
  small bibs that fail in one scale are still picked up in the other.
- Contrast-limited adaptive histogram equalisation + unsharp mask help with
  jerseys that are backlit or low contrast.

    pip install -r requirements.txt
    uvicorn app:app --host 0.0.0.0 --port 8010

Endpoints:
    GET  /health  -> {ok: true, engine: "rapidocr"}
    POST /ocr     -> multipart "file"; returns text + words with boxes
"""

from __future__ import annotations

import os
import statistics
import tempfile

import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse

try:
    from rapidocr import RapidOCR
except Exception as exc:  # pragma: no cover - surfaced through /health
    RapidOCR = None  # type: ignore[assignment]
    IMPORT_ERROR = str(exc)
else:
    IMPORT_ERROR = ""

app = FastAPI(title="Racetap OCR", version="1.1.0")

_engine = None

MAX_WIDTH = int(os.environ.get("OCR_MAX_WIDTH", "2400"))
MIN_WIDTH = int(os.environ.get("OCR_MIN_WIDTH", "1800"))
UPSCALE_MAX = float(os.environ.get("OCR_UPSCALE_MAX", "2.0"))
DUAL_PASS = os.environ.get("OCR_DUAL_PASS", "1") not in ("0", "false", "False")


def engine():
    global _engine

    if _engine is None:
        if RapidOCR is None:
            raise RuntimeError("RapidOCR tidak terpasang: " + IMPORT_ERROR)

        _engine = RapidOCR()

    return _engine


@app.get("/health")
def health():
    return {
        "ok": RapidOCR is not None,
        "engine": "rapidocr",
        "error": IMPORT_ERROR,
        "dual_pass": DUAL_PASS,
    }


@app.post("/ocr")
async def ocr(file: UploadFile = File(...)):
    payload = await file.read()

    try:
        image = decode(payload)

        if image is None:
            return JSONResponse(status_code=422, content={"ok": False, "engine": "rapidocr", "error": "Gambar tidak valid."})

        words = []

        for variant in build_variants(image):
            words.extend(run_pass(engine(), variant))

        words = merge_words(words)
        words.sort(key=lambda word: (word["box"][1] if word["box"] else 0, word["box"][0] if word["box"] else 0))

        text = "\n".join(word["text"] for word in words)
        confidence = round(statistics.mean(word["confidence"] for word in words), 2) if words else 0.0

        return {
            "ok": True,
            "engine": "rapidocr",
            "text": text,
            "confidence": confidence,
            "words": words,
        }
    except Exception as exc:  # pragma: no cover - runtime guard
        return JSONResponse(status_code=500, content={"ok": False, "engine": "rapidocr", "error": str(exc)})


def decode(payload: bytes):
    buffer = np.frombuffer(payload, dtype=np.uint8)
    return cv2.imdecode(buffer, cv2.IMREAD_COLOR)


def build_variants(image):
    """Returns the images handed to RapidOCR (first pass + optional second pass)."""
    base = fit_width(image, MAX_WIDTH)
    variants = [enhance(base)]

    if DUAL_PASS:
        upscaled = upscale(base)

        if upscaled.shape[:2] != base.shape[:2]:
            variants.append(enhance(upscaled))
        else:
            # Already wide enough: use the raw colour frame as the second pass
            # so the merge still sees two independent reads.
            variants.append(base)

    return variants


def fit_width(image, max_width):
    height, width = image.shape[:2]

    if width <= max_width:
        return image

    scale = max_width / width
    return cv2.resize(image, (max_width, int(round(height * scale))), interpolation=cv2.INTER_AREA)


def upscale(image):
    height, width = image.shape[:2]

    if width >= MIN_WIDTH:
        return image

    scale = min(UPSCALE_MAX, MIN_WIDTH / width)
    return cv2.resize(
        image,
        (int(round(width * scale)), int(round(height * scale))),
        interpolation=cv2.INTER_CUBIC,
    )


def enhance(image):
    """Grayscale + CLAHE + unsharp mask (keeps text edges crisp)."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    equalised = clahe.apply(gray)
    blurred = cv2.GaussianBlur(equalised, (0, 0), 2.5)
    sharpened = cv2.addWeighted(equalised, 1.5, blurred, -0.5, 0)
    return cv2.cvtColor(sharpened, cv2.COLOR_GRAY2BGR)


def run_pass(ocr_engine, image):
    height, width = image.shape[:2]
    raw = ocr_engine(image)
    words = extract_words(raw)

    for word in words:
        box = word.get("box")

        if not box or width == 0 or height == 0:
            word["_center"] = (0.0, 0.0)
            continue

        word["_center"] = (
            ((box[0] + box[2]) / 2.0) / width,
            ((box[1] + box[3]) / 2.0) / height,
        )

    return words


def extract_words(raw):
    """Normalises RapidOCR output across versions into a word list."""
    result = raw

    if isinstance(raw, tuple):
        result = raw[0]

    boxes = getattr(result, "boxes", None)
    txts = getattr(result, "txts", None)
    scores = getattr(result, "scores", None)

    if boxes is None and isinstance(result, dict):
        boxes = result.get("boxes")
        txts = result.get("txts")
        scores = result.get("scores")

    words = []

    if boxes is not None and txts is not None:
        for index, text in enumerate(txts):
            if text is None or str(text).strip() == "":
                continue

            score = 0.0

            if scores is not None:
                try:
                    score = float(scores[index]) * 100
                except (TypeError, ValueError, IndexError):
                    score = 0.0

            words.append(
                {
                    "text": str(text),
                    "confidence": round(score, 2),
                    "box": box_to_flat(boxes[index]),
                    "passes": 1,
                }
            )

        return words

    # Older output: [ [box, text, score], ... ]
    for item in result or []:
        try:
            box, text, score = item[0], item[1], item[2]
        except (TypeError, IndexError):
            continue

        if text is None or str(text).strip() == "":
            continue

        words.append(
            {
                "text": str(text),
                "confidence": round(float(score) * 100, 2),
                "box": box_to_flat(box),
                "passes": 1,
            }
        )

    return words


def merge_words(words):
    """Merges duplicate detections from the two passes.

    Two words are the same bib when their normalised text matches and their
    relative centres are close. The best confidence wins and agreement between
    passes adds a small confidence bonus.
    """
    merged = []

    for word in words:
        text = normalise_text(word["text"])
        centre = word.get("_center", (0.0, 0.0))
        match = None

        for existing in merged:
            if existing["_norm"] != text:
                continue

            other = existing.get("_center", (0.0, 0.0))

            if abs(other[0] - centre[0]) > 0.05:
                continue

            if abs(other[1] - centre[1]) > 0.05:
                continue

            match = existing
            break

        if match is None:
            word["_norm"] = text
            merged.append(word)
            continue

        previous_confidence = match["confidence"]
        match["passes"] = int(match.get("passes", 1)) + 1
        match["confidence"] = min(100.0, max(previous_confidence, word["confidence"]) + 4.0)

        if word["confidence"] > previous_confidence:
            match["box"] = word["box"]
            match["_center"] = centre

    for word in merged:
        word.pop("_norm", None)
        word.pop("_center", None)

    return merged


def normalise_text(text):
    return "".join(character for character in str(text).upper() if character.isalnum())


def box_to_flat(box):
    """Converts a polygon [[x, y], ...] into [x0, y0, x1, y1]."""
    if box is None:
        return None

    try:
        points = [(float(point[0]), float(point[1])) for point in box]
    except (TypeError, IndexError, ValueError):
        return None

    if not points:
        return None

    xs = [point[0] for point in points]
    ys = [point[1] for point in points]

    return [min(xs), min(ys), max(xs), max(ys)]
