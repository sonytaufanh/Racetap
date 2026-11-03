<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * OCR.space free-tier adapter.
 * Free key required (https://ocr.space/ocrapi/freekey); max 1 MB per image.
 */
class Ocrspace_ocr
{
    private $key = '';
    private $endpoint = '';
    private $timeout = 45;
    private $max_bytes = 1048576;

    public function __construct()
    {
        $CI =& get_instance();
        $CI->config->load('ocr', TRUE);
        $config = $CI->config->item('ocr');

        if (is_array($config)) {
            $this->key = (string) $config['ocrspace_api_key'];
            $this->endpoint = (string) $config['ocrspace_endpoint'];
            $this->timeout = (int) $config['ocrspace_timeout'];
            $this->max_bytes = (int) $config['ocrspace_max_bytes'];
        }
    }

    public function name()
    {
        return 'ocrspace';
    }

    public function enabled()
    {
        return $this->key !== '';
    }

    public function scan_file($path)
    {
        if (!is_file($path) || !is_readable($path)) {
            return $this->failure('File foto tidak ditemukan.');
        }

        $prepared = $this->prepare($path);

        if (empty($prepared['ok'])) {
            return $this->failure($prepared['error']);
        }

        $post = array(
            'file' => new CURLFile($prepared['path']),
            'apikey' => $this->key,
            'language' => 'eng',
            'isOverlayRequired' => 'true',
            'OCREngine' => '2',
            'scale' => 'true',
            'isTable' => 'false'
        );

        $ch = curl_init($this->endpoint);

        curl_setopt_array($ch, array(
            CURLOPT_RETURNTRANSFER => TRUE,
            CURLOPT_POST => TRUE,
            CURLOPT_POSTFIELDS => $post,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => $this->timeout
        ));

        $response = curl_exec($ch);
        $error = curl_error($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if (!empty($prepared['temp'])) {
            @unlink($prepared['path']);
        }

        if ($response === FALSE) {
            return $this->failure('OCR.space gagal: ' . $error);
        }

        $decoded = json_decode($response, TRUE);

        if (!is_array($decoded)) {
            return $this->failure('Respons OCR.space tidak valid (HTTP ' . $status . ').');
        }

        if (!empty($decoded['IsErroredOnProcessing'])) {
            $message = isset($decoded['ErrorMessage']) ? implode(' ', (array) $decoded['ErrorMessage']) : 'OCR.space memproses dengan error.';

            return $this->failure($message);
        }

        if (empty($decoded['ParsedResults'][0])) {
            return $this->failure('OCR.space tidak mengembalikan hasil.');
        }

        $parsed = $decoded['ParsedResults'][0];
        $text = isset($parsed['ParsedText']) ? trim((string) $parsed['ParsedText']) : '';
        $words = array();

        if (!empty($parsed['TextOverlay']['Lines'])) {
            foreach ($parsed['TextOverlay']['Lines'] as $line) {
                foreach ((array) (isset($line['Words']) ? $line['Words'] : array()) as $word) {
                    $wtext = isset($word['WordText']) ? (string) $word['WordText'] : '';

                    if ($wtext === '') {
                        continue;
                    }

                    $left = isset($word['Left']) ? (float) $word['Left'] : 0.0;
                    $top = isset($word['Top']) ? (float) $word['Top'] : 0.0;
                    $w = isset($word['Width']) ? (float) $word['Width'] : 0.0;
                    $h = isset($word['Height']) ? (float) $word['Height'] : 0.0;

                    $words[] = array(
                        'text' => $wtext,
                        'confidence' => 0.0,
                        'box' => array($left, $top, $left + $w, $top + $h)
                    );
                }
            }
        }

        return array(
            'ok' => TRUE,
            'engine' => 'ocrspace',
            'text' => $text,
            'confidence' => 50.0,
            'words' => $words,
            'error' => ''
        );
    }

    private function prepare($path)
    {
        $size = @filesize($path);

        if ($size !== FALSE && $size <= $this->max_bytes) {
            return array('ok' => TRUE, 'path' => $path, 'temp' => FALSE);
        }

        if (!function_exists('imagecreatefromstring')) {
            return array('ok' => FALSE, 'error' => 'Foto melebihi 1 MB dan GD tidak tersedia untuk kompresi.');
        }

        $image = @imagecreatefromstring((string) file_get_contents($path));

        if ($image === FALSE) {
            return array('ok' => FALSE, 'error' => 'Gagal membaca foto untuk kompresi.');
        }

        $temp = tempnam(sys_get_temp_dir(), 'rtocr') . '.jpg';
        $source_width = imagesx($image);
        $source_height = imagesy($image);
        $quality = 75;

        for ($target = 1300; $target >= 700; $target -= 300) {
            $width = min($target, $source_width);
            $height = (int) round($source_height * ($width / max(1, $source_width)));
            $resized = imagecreatetruecolor($width, $height);

            imagecopyresampled($resized, $image, 0, 0, 0, 0, $width, $height, $source_width, $source_height);
            imagejpeg($resized, $temp, $quality);
            imagedestroy($resized);

            if (@filesize($temp) <= $this->max_bytes) {
                break;
            }

            $quality -= 15;
        }

        imagedestroy($image);

        return array('ok' => TRUE, 'path' => $temp, 'temp' => TRUE);
    }

    private function failure($message)
    {
        return array('ok' => FALSE, 'engine' => 'ocrspace', 'text' => '', 'confidence' => 0.0, 'words' => array(), 'error' => $message);
    }
}
