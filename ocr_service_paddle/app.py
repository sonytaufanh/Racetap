"""
PaddleOCR microservice for Racetap (free, self-hosted).

Second free OCR engine in the automatic chain (RapidOCR is preferred first).
PaddleOCR and RapidOCR run in separate virtualenvs on purpose: PaddlePaddle pins
different numpy/opencv versions and mixing them can break RapidOCR.

    pip install -r requirements.txt
    uvicorn app:app --host 127.0.0.1 --port 8015

Endpoints:
    GET  /health  -> {ok, engine: "paddleocr", engines: {paddleocr: true}}
    POST /ocr     -> multipart "file"; returns text + words with boxes
"""

from __future__ import annotations

import os
import statistics
import tempfile

# PaddlePaddle 3.x + oneDNN (PIR) crashes on some Windows CPUs with
# "ConvertPirAttribute2RuntimeAttribute". Use the plain paddle runner instead.
os.environ.setdefault("PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT", "0")
os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse

try:
    from paddleocr import PaddleOCR
except Exception as exc:  # pragma: no cover - surfaced through /health
    PaddleOCR = None  # type: ignore[assignment]
    IMPORT_ERROR = str(exc)
else:
    IMPORT_ERROR = ""

app = FastAPI(title="Racetap PaddleOCR", version="1.0.0")

_engine = None

OCR_VERSION = os.environ.get("PADDLEOCR_VERSION") or None
MAX_SIDE = int(os.environ.get("PADDLEOCR_MAX_SIDE", "1600"))


def engine():
    global _engine

    if _engine is None:
        if PaddleOCR is None:
            raise RuntimeError("PaddleOCR tidak terpasang: " + IMPORT_ERROR)

        params = {
            "lang": "en",
            "use_doc_orientation_classify": False,
            "use_doc_unwarping": False,
            "use_textline_orientation": True,
            "text_det_limit_type": "max",
            "text_det_limit_side_len": MAX_SIDE,
        }

        if OCR_VERSION:
            params["ocr_version"] = OCR_VERSION

        try:
            _engine = PaddleOCR(**params)
        except TypeError:
            # Older PaddleOCR releases reject the 3.x keyword arguments.
            _engine = PaddleOCR(lang="en", use_angle_cls=True, show_log=False)

    return _engine


@app.get("/health")
def health():
    return {
        "ok": PaddleOCR is not None,
        "engine": "paddleocr",
        "engines": {"paddleocr": PaddleOCR is not None},
        "error": IMPORT_ERROR,
    }


@app.post("/ocr")
async def ocr(file: UploadFile = File(...)):
    payload = await file.read()

    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as handle:
        handle.write(payload)
        path = handle.name

    try:
        result = engine().predict(path)
        words = extract_words(result)
        words.sort(key=lambda word: (word["box"][1] if word["box"] else 0, word["box"][0] if word["box"] else 0))

        text = "\n".join(word["text"] for word in words)
        confidence = round(statistics.mean(word["confidence"] for word in words), 2) if words else 0.0

        return {
            "ok": True,
            "engine": "paddleocr",
            "text": text,
            "confidence": confidence,
            "words": words,
        }
    except Exception as exc:  # pragma: no cover - runtime guard
        return JSONResponse(status_code=500, content={"ok": False, "engine": "paddleocr", "error": str(exc)})
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass


def extract_words(results):
    words = []

    for page in results or []:
        data = page

        if hasattr(page, "json"):
            try:
                data = page.json.get("res", page.json)
            except Exception:
                data = page

        if isinstance(data, dict) and "res" in data and isinstance(data["res"], dict):
            data = data["res"]

        if not isinstance(data, dict):
            continue

        texts = data.get("rec_texts") or []
        scores = data.get("rec_scores") or []
        polys = data.get("rec_polys")

        if polys is None:
            polys = data.get("dt_polys") or []

        for index, text in enumerate(texts):
            if text is None or str(text).strip() == "":
                continue

            score = 0.0

            if index < len(scores):
                try:
                    score = float(scores[index]) * 100
                except (TypeError, ValueError):
                    score = 0.0

            box = None

            if index < len(polys):
                box = box_to_flat(polys[index])

            words.append({"text": str(text), "confidence": round(score, 2), "box": box})

    return words


def box_to_flat(box):
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
