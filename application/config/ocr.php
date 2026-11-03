<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/*
 | OCR engine configuration (automatic, no UI picker).
 |
 | The CMS always tries the first available engine from OCR_ENGINE_ORDER and
 | only falls back to the next one when a call fails. RapidOCR (free, self
 | hosted) is first by default; Google Vision stays available as the premium
 | option once GOOGLE_VISION_API_KEY is set.
 |
 | All keys stay server-side (application/config/.env or real env vars).
 */

$order = racetap_env('OCR_ENGINE_ORDER', 'rapidocr,paddleocr,azure,ocrspace,vision,tesseract');
$engines = array();

foreach (explode(',', (string) $order) as $engine) {
    $engine = strtolower(trim($engine));

    if (in_array($engine, array('rapidocr', 'paddleocr', 'azure', 'ocrspace', 'vision', 'tesseract'), TRUE)) {
        $engines[] = $engine;
    }
}

$config['ocr_engine_order'] = !empty($engines) ? $engines : array('rapidocr', 'paddleocr', 'azure', 'ocrspace', 'vision', 'tesseract');

$config['ocr_service_url'] = rtrim((string) racetap_env('OCR_SERVICE_URL', 'http://127.0.0.1:8010'), '/');
$config['paddleocr_service_url'] = rtrim((string) racetap_env('PADDLEOCR_SERVICE_URL', 'http://127.0.0.1:8015'), '/');
$config['ocr_service_timeout'] = 45;
$config['ocr_service_health_timeout'] = 2;

/**
 * RapidOCR is the required engine for this deployment.
 *
 * The CMS resolves OCR in this order and RapidOCR is always tried first. When it
 * is down, `ocr_required_engine` makes the resolver keep retrying it instead of
 * silently falling back, so a misconfigured service shows up as an error rather
 * than as half-indexed photos:
 *
 *   FALSE -> RapidOCR first, fall back to the next healthy engine (legacy
 *            behaviour, useful for development without the Python service)
 *   TRUE  -> RapidOCR only; every other engine is skipped
 */
$config['ocr_required_engine'] = strtolower((string) racetap_env('OCR_REQUIRED_ENGINE', 'rapidocr')) === 'rapidocr';

$config['ocrspace_api_key'] = (string) racetap_env('OCRSPACE_API_KEY', '');
$config['ocrspace_endpoint'] = (string) racetap_env('OCRSPACE_ENDPOINT', 'https://api.ocr.space/parse/image');
$config['ocrspace_timeout'] = 45;
$config['ocrspace_max_bytes'] = 1048576; // Free plan accepts ~1 MB per image.

$config['azure_vision_key'] = (string) racetap_env('AZURE_VISION_KEY', '');
$config['azure_vision_endpoint'] = rtrim((string) racetap_env('AZURE_VISION_ENDPOINT', ''), '/');
$config['azure_vision_timeout'] = 30;

$config['ocr_batch'] = 6; // RapidOCR dual-pass ~2-4s/photo; keep under PHP's time limit.
$config['ocr_max_bibs'] = 8;

$config['ocr_labels'] = array(
    'rapidocr' => 'RapidOCR',
    'paddleocr' => 'PaddleOCR',
    'azure' => 'Azure Vision',
    'ocrspace' => 'OCR.space',
    'vision' => 'Google Vision',
    'tesseract' => 'Tesseract (browser)'
);
