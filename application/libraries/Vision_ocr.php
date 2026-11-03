<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Google Cloud Vision OCR adapter.
 *
 * Text detection is used (not document OCR) because race bibs are short
 * numeric tokens on bibs/jerseys. The API key stays server-side.
 */
class Vision_ocr
{
    private $key = '';
    private $endpoint = '';
    private $timeout = 45;
    private $max_bytes = 15728640;
    private $last_error = '';
    private $last_raw = '';

    public function __construct()
    {
        $CI =& get_instance();
        $CI->config->load('vision', TRUE);
        $config = $CI->config->item('vision');

        if (is_array($config)) {
            $this->key = (string) $config['vision_api_key'];
            $this->endpoint = (string) $config['vision_endpoint'];
            $this->timeout = (int) $config['vision_timeout'];
            $this->max_bytes = (int) $config['vision_max_bytes'];

            if ($this->timeout <= 0) {
                $this->timeout = 45;
            }
        }
    }

    public function enabled()
    {
        return $this->key !== '';
    }

    public function last_error()
    {
        return $this->last_error;
    }

    public function last_raw()
    {
        return $this->last_raw;
    }

    /**
     * @return array{ok:bool,bib:string,text:string,confidence:float,error:string}
     */
    public function scan_file($path)
    {
        $this->last_error = '';
        $this->last_raw = '';

        if (!$this->enabled()) {
            return $this->failure('Google Vision belum dikonfigurasi (GOOGLE_VISION_API_KEY kosong).');
        }

        if (!is_file($path) || !is_readable($path)) {
            return $this->failure('File foto tidak ditemukan: ' . $path);
        }

        $size = @filesize($path);

        if ($size === FALSE || $size > $this->max_bytes) {
            return $this->failure('Ukuran foto melebihi batas Google Vision (15 MB).');
        }

        $body = array(
            'requests' => array(array(
                'image' => array('content' => base64_encode((string) file_get_contents($path))),
                'features' => array(array('type' => 'TEXT_DETECTION', 'maxResults' => 1))
            ))
        );

        $ch = curl_init();

        curl_setopt_array($ch, array(
            CURLOPT_URL => $this->endpoint . '?key=' . rawurlencode($this->key),
            CURLOPT_RETURNTRANSFER => TRUE,
            CURLOPT_POST => TRUE,
            CURLOPT_POSTFIELDS => json_encode($body),
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_HTTPHEADER => array('Content-Type: application/json')
        ));

        $response = curl_exec($ch);
        $error = curl_error($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);

        curl_close($ch);

        if ($response === FALSE) {
            return $this->failure('Vision request gagal: ' . $error);
        }

        $decoded = json_decode($response, TRUE);

        if (!is_array($decoded)) {
            return $this->failure('Respons Vision tidak valid (HTTP ' . $status . ').');
        }

        if (isset($decoded['error']['message'])) {
            return $this->failure('Vision: ' . $decoded['error']['message']);
        }

        if (!isset($decoded['responses'][0]) || !is_array($decoded['responses'][0])) {
            return $this->failure('Vision tidak mengembalikan hasil.');
        }

        $first = $decoded['responses'][0];

        if (isset($first['error']['message'])) {
            return $this->failure('Vision: ' . $first['error']['message']);
        }

        $annotation = isset($first['fullTextAnnotation']) && is_array($first['fullTextAnnotation'])
            ? $first['fullTextAnnotation']
            : array();

        $text = isset($annotation['text']) ? trim((string) $annotation['text']) : '';
        $confidence = 0.0;

        if (isset($annotation['pages'][0]['confidence'])) {
            $confidence = round(((float) $annotation['pages'][0]['confidence']) * 100, 2);
        }

        if ($confidence <= 0) {
            $confidence = $text === '' ? 0.0 : 50.0;
        }

        $this->last_raw = $text;

        $picked = $this->pick_bib($annotation, $text);

        if ($picked === '') {
            return array(
                'ok' => TRUE,
                'engine' => 'google_vision',
                'bib' => '',
                'text' => $text,
                'confidence' => $confidence,
                'words' => $this->extract_words($annotation),
                'error' => ''
            );
        }

        return array(
            'ok' => TRUE,
            'engine' => 'google_vision',
            'bib' => $picked,
            'text' => $text !== '' ? $text : $picked,
            'confidence' => $confidence,
            'words' => $this->extract_words($annotation),
            'error' => ''
        );
    }

    private function failure($message)
    {
        $this->last_error = $message;

        return array(
            'ok' => FALSE,
            'bib' => '',
            'text' => '',
            'confidence' => 0.0,
            'error' => $message
        );
    }

    /**
     * Flattens the Vision fullTextAnnotation tree into unified word entries
     * (text, confidence 0-100 and box [x0,y0,x1,y1]) for the Bib_resolver.
     */
    private function extract_words($annotation)
    {
        $out = array();

        if (!isset($annotation['pages']) || !is_array($annotation['pages'])) {
            return $out;
        }

        foreach ($annotation['pages'] as $page) {
            if (empty($page['blocks'])) {
                continue;
            }

            foreach ((array) $page['blocks'] as $block) {
                if (empty($block['paragraphs'])) {
                    continue;
                }

                foreach ((array) $block['paragraphs'] as $paragraph) {
                    if (empty($paragraph['words'])) {
                        continue;
                    }

                    foreach ((array) $paragraph['words'] as $word) {
                        $word_text = $this->word_text($word);

                        if ($word_text === '') {
                            continue;
                        }

                        $confidence = isset($word['confidence'])
                            ? round(((float) $word['confidence']) * 100, 2)
                            : (isset($word['symbols'][0]['confidence']) ? round(((float) $word['symbols'][0]['confidence']) * 100, 2) : 0.0);

                        $out[] = array(
                            'text' => $word_text,
                            'confidence' => $confidence,
                            'box' => $this->box_vertices(isset($word['boundingBox']) ? $word['boundingBox'] : array())
                        );
                    }
                }
            }
        }

        return $out;
    }

    private function box_vertices($bounding_box)
    {
        if (empty($bounding_box['vertices']) || !is_array($bounding_box['vertices'])) {
            return NULL;
        }

        $xs = array();
        $ys = array();

        foreach ($bounding_box['vertices'] as $vertex) {
            $xs[] = isset($vertex['x']) ? (float) $vertex['x'] : 0.0;
            $ys[] = isset($vertex['y']) ? (float) $vertex['y'] : 0.0;
        }

        if (empty($xs)) {
            return NULL;
        }

        return array(min($xs), min($ys), max($xs), max($ys));
    }

    /**
     * Prefer the largest bounding box among 3-6 digit tokens, mirroring the
     * heuristic used by the browser Tesseract implementation.
     */
    private function pick_bib($annotation, $full_text)
    {
        $candidates = array();

        if (isset($annotation['pages']) && is_array($annotation['pages'])) {
            foreach ($annotation['pages'] as $page) {
                if (empty($page['blocks'])) {
                    continue;
                }

                foreach ((array) $page['blocks'] as $block) {
                    if (empty($block['paragraphs'])) {
                        continue;
                    }

                    foreach ((array) $block['paragraphs'] as $paragraph) {
                        if (empty($paragraph['words'])) {
                            continue;
                        }

                        foreach ((array) $paragraph['words'] as $word) {
                            $word_text = $this->word_text($word);

                            if ($word_text === '') {
                                continue;
                            }

                            $area = $this->bbox_area(isset($word['boundingBox']) ? $word['boundingBox'] : array());

                            if (preg_match_all('/\d{3,6}/', $word_text, $matches)) {
                                foreach ($matches[0] as $token) {
                                    $candidates[] = array('bib' => $token, 'area' => $area);
                                }
                            }
                        }
                    }
                }
            }
        }

        if (empty($candidates)) {
            if (preg_match_all('/\d{3,6}/', $full_text, $matches)) {
                foreach ($matches[0] as $token) {
                    $candidates[] = array('bib' => $token, 'area' => 0);
                }
            }
        }

        if (empty($candidates)) {
            return '';
        }

        usort($candidates, function ($a, $b) {
            return $b['area'] <=> $a['area'];
        });

        return (string) $candidates[0]['bib'];
    }

    private function word_text($word)
    {
        if (isset($word['symbols']) && is_array($word['symbols'])) {
            $text = '';

            foreach ($word['symbols'] as $symbol) {
                if (isset($symbol['text'])) {
                    $text .= $symbol['text'];
                }
            }

            return $text;
        }

        return '';
    }

    private function bbox_area($bounding_box)
    {
        if (empty($bounding_box['vertices']) || !is_array($bounding_box['vertices'])) {
            return 0;
        }

        $xs = array();
        $ys = array();

        foreach ($bounding_box['vertices'] as $vertex) {
            $xs[] = isset($vertex['x']) ? (int) $vertex['x'] : 0;
            $ys[] = isset($vertex['y']) ? (int) $vertex['y'] : 0;
        }

        if (empty($xs) || empty($ys)) {
            return 0;
        }

        return (max($xs) - min($xs)) * (max($ys) - min($ys));
    }
}
