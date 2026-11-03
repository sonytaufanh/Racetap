<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * RapidOCR (free, self-hosted PaddleOCR ONNX) HTTP adapter.
 *
 * The microservice lives in ocr_service/ and exposes:
 *   GET  /health  -> { ok: true }
 *   POST /ocr     -> { ok, text, confidence, words: [{text, confidence, box}] }
 */
class Rapidocr_service
{
    private $url = '';
    private $timeout = 30;
    private $health_timeout = 2;
    private $healthy = NULL;

    public function __construct()
    {
        $CI =& get_instance();
        $CI->config->load('ocr', TRUE);
        $config = $CI->config->item('ocr');

        if (is_array($config)) {
            $this->url = rtrim((string) $config['ocr_service_url'], '/');
            $this->timeout = (int) $config['ocr_service_timeout'];
            $this->health_timeout = (int) $config['ocr_service_health_timeout'];
        }
    }

    public function name()
    {
        return 'rapidocr';
    }

    public function enabled()
    {
        return $this->url !== '';
    }

    public function healthy()
    {
        if (!$this->enabled()) {
            return FALSE;
        }

        if ($this->healthy !== NULL) {
            return $this->healthy;
        }

        $ch = curl_init($this->url . '/health');

        curl_setopt_array($ch, array(
            CURLOPT_RETURNTRANSFER => TRUE,
            CURLOPT_CONNECTTIMEOUT => 1,
            CURLOPT_TIMEOUT => $this->health_timeout,
            CURLOPT_FAILONERROR => TRUE
        ));

        $response = curl_exec($ch);
        $ok = curl_errno($ch) === 0 && $response !== FALSE;
        curl_close($ch);

        $this->healthy = $ok;

        return $this->healthy;
    }

    public function scan_file($path)
    {
        if (!is_file($path) || !is_readable($path)) {
            return $this->failure('File foto tidak ditemukan.');
        }

        $post = array('file' => new CURLFile($path));

        $ch = curl_init($this->url . '/ocr');

        curl_setopt_array($ch, array(
            CURLOPT_RETURNTRANSFER => TRUE,
            CURLOPT_POST => TRUE,
            CURLOPT_POSTFIELDS => $post,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_HTTPHEADER => array('Accept: application/json')
        ));

        $response = curl_exec($ch);
        $error = curl_error($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === FALSE) {
            $this->healthy = FALSE;

            return $this->failure('RapidOCR service gagal: ' . $error);
        }

        $decoded = json_decode($response, TRUE);

        if (!is_array($decoded) || empty($decoded['ok'])) {
            $message = isset($decoded['error']) ? $decoded['error'] : 'Respons RapidOCR tidak valid (HTTP ' . $status . ').';

            return $this->failure($message);
        }

        return array(
            'ok' => TRUE,
            'engine' => 'rapidocr',
            'text' => isset($decoded['text']) ? trim((string) $decoded['text']) : '',
            'confidence' => isset($decoded['confidence']) ? (float) $decoded['confidence'] : 60.0,
            'words' => $this->normalize_words(isset($decoded['words']) ? $decoded['words'] : array()),
            'error' => ''
        );
    }

    private function normalize_words($words)
    {
        $out = array();

        foreach ((array) $words as $word) {
            $text = isset($word['text']) ? (string) $word['text'] : '';

            if ($text === '') {
                continue;
            }

            $out[] = array(
                'text' => $text,
                'confidence' => isset($word['confidence']) ? (float) $word['confidence'] : 0.0,
                'box' => $this->normalize_box($word)
            );
        }

        return $out;
    }

    private function normalize_box($word)
    {
        if (isset($word['box']) && is_array($word['box']) && count($word['box']) >= 4) {
            return array(
                (float) $word['box'][0],
                (float) $word['box'][1],
                (float) $word['box'][2],
                (float) $word['box'][3]
            );
        }

        if (isset($word['bbox']) && is_array($word['bbox']) && count($word['bbox']) >= 4) {
            return array(
                (float) $word['bbox']['x0'],
                (float) $word['bbox']['y0'],
                (float) $word['bbox']['x1'],
                (float) $word['bbox']['y1']
            );
        }

        return NULL;
    }

    private function failure($message)
    {
        return array('ok' => FALSE, 'engine' => 'rapidocr', 'text' => '', 'confidence' => 0.0, 'words' => array(), 'error' => $message);
    }
}
