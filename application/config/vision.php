<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/*
 | Google Cloud Vision configuration.
 |
 | The API key must only exist server-side (environment variable
 | GOOGLE_VISION_API_KEY or application/config/.env). It is never sent to the
 | browser. When the key is empty the admin OCR action reports that Vision is
 | disabled and the UI falls back to manual / Tesseract OCR.
 */
$config['vision_api_key'] = racetap_env('GOOGLE_VISION_API_KEY', '');
$config['vision_endpoint'] = 'https://vision.googleapis.com/v1/images:annotate';
$config['vision_timeout'] = 45;
$config['vision_max_batch'] = 16;
$config['vision_max_bytes'] = 15728640; // 15 MB per image (Vision limit ~20 MB)
