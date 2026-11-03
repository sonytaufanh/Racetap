# Racetap OCR service (RapidOCR)

Free, self-hosted OCR for the Racetap photo library. It wraps
[RapidOCR](https://github.com/RapidAI/RapidOCR) (Apache-2.0, PaddleOCR
PP-OCR models via ONNX Runtime) and exposes a tiny HTTP API that the
CodeIgniter backend calls automatically.

This is the recommended free engine: no API key, no quota, good accuracy on
race photos. Google Vision (premium) stays available as a fallback.

## Run with Python

```bash
cd ocr_service
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux/macOS
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8010
```

Windows shortcut: `powershell -ExecutionPolicy Bypass -File ocr_service\start.ps1`
(creates the venv and installs the requirements on first run).

First start downloads the ONNX models (~100–300 MB depending on model set) and
keeps them in the user cache. Warm it up once before an event:

```bash
curl -F "file=@sample.jpg" http://127.0.0.1:8010/ocr
```

## Accuracy knobs

The service runs up to two OCR passes and merges the results by text position:

| Env | Default | Effect |
|---|---|---|
| `OCR_DUAL_PASS` | `1` | `1` = native + upscaled/contrast pass (best accuracy, ~2x time); `0` = single pass |
| `OCR_MIN_WIDTH` | `1800` | Upscale photos narrower than this before the second pass |
| `OCR_MAX_WIDTH` | `2400` | Downscale very large photos before OCR |
| `OCR_UPSCALE_MAX` | `2.0` | Maximum upscale factor for the second pass |

Preprocessing: grayscale + CLAHE (contrast-limited histogram equalisation) +
unsharp mask. The CodeIgniter `Bib_resolver` then keeps only numbers that match
the event's `race_results` whitelist and also fixes common OCR confusions
(`O/0`, `I/1`, `S/5`, `B/8`, `Z/2`, `U/0`, …) and extra glued digits
(`14127` → `1412`).

## Run with Docker

```bash
cd ocr_service
docker compose up -d --build
```

Models are cached in the `rapidocr-models` volume.

## Point Racetap at it

Add to `application/config/.env`:

```dotenv
OCR_SERVICE_URL=http://127.0.0.1:8010
```

No rebuild is needed. The admin gallery header shows the active engine
(`RapidOCR (otomatis)`) and OCR runs automatically.

## API

`GET /health`

```json
{ "ok": true, "engine": "rapidocr", "error": "" }
```

`POST /ocr` (multipart field `file`)

```json
{
  "ok": true,
  "engine": "rapidocr",
  "text": "BIB 1234 5678",
  "confidence": 91.4,
  "words": [
    { "text": "1234", "confidence": 94.2, "box": [120, 300, 190, 340] }
  ]
}
```

The CodeIgniter `Rapidocr_service` library consumes this shape; the
`Bib_resolver` then keeps only numbers that match the event's known bibs.

## Notes

- CPU only is fine; a single worker handles a few photos per second.
- If the service is offline, Racetap automatically falls back to the next
  configured engine (Azure → OCR.space → Google Vision → browser Tesseract).
- Shared hosting without Python/Docker: skip this service and configure the
  free cloud tiers instead (`AZURE_VISION_KEY` or `OCRSPACE_API_KEY`).
