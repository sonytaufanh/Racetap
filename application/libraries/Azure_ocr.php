<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Azure AI Vision (free F0 tier available) synchronous OCR adapter.
 * Uses the v3.2 /ocr endpoint which returns words + bounding boxes.
 */
class Azure_ocr
{
    private $key = '';
    private $endpoint = '';
    private $timeout = 30;
    private $max_bytes = 4194304; // 4 MB request limit.

    public function __construct()
    {
        $CI =& get_instance();
        $CI->config->load('ocr', TRUE);
        $config = $CI->config->item('ocr');

        if (is_array($config)) {
            $this->key = (string) $config['azure_vision_key'];
            $this->endpoint = rtrim((string) $config['azure_vision_endpoint'], '/');
            $this->timeout = (int) $config['azure_vision_timeout'];
        }
    }

    public function name()
    {
        return 'azure';
    }

    public function enabled()
    {
        return $this->key !== '' && $this->endpoint !== '';
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

        $url = $this->endpoint . '/vision/v3.2/ocr?language=unk&detectOrientation=true';
        $ch = curl_init($url);

        curl_setopt_array($ch, array(
            CURLOPT_RETURNTRANSFER => TRUE,
            CURLOPT_POST => TRUE,
            CURLOPT_POSTFIELDS => (string) file_get_contents($prepared['path']),
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_HTTPHEADER => array(
                'Content-Type: application/octet-stream',
                'Ocp-Apim-Subscription-Key: ' . $this->key,
                'Accept: application/json'
            )
        ));

        $response = curl_exec($ch);
        $error = curl_error($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if (!empty($prepared['temp'])) {
            @unlink($prepared['path']);
        }

        if ($response === FALSE) {
            return $this->failure('Azure Vision gagal: ' . $error);
        }

        $decoded = json_decode($response, TRUE);

        if (!is_array($decoded)) {
            return $this->failure('Respons Azure Vision tidak valid (HTTP ' . $status . ').');
        }

        if (isset($decoded['error']['message'])) {
            return $this->failure('Azure Vision: ' . $decoded['error']['message']);
        }

        $words = array();
        $lines = array();

        foreach ((array) (isset($decoded['regions']) ? $decoded['regions'] : array()) as $region) {
            foreach ((array) (isset($region['lines']) ? $region['lines'] : array()) as $line) {
                $line_words = array();

                foreach ((array) (isset($line['words']) ? $line['words'] : array()) as $word) {
                    $text = isset($word['text']) ? (string) $word['text'] : '';

                    if ($text === '') {
                        continue;
                    }

                    $line_words[] = $text;
                    $words[] = array(
                        'text' => $text,
                        'confidence' => 0.0,
                        'box' => $this->parse_box(isset($word['boundingBox']) ? $word['boundingBox'] : '')
                    );
                }

                if (!empty($line_words)) {
                    $lines[] = implode(' ', $line_words);
                }
            }
        }

        return array(
            'ok' => TRUE,
            'engine' => 'azure',
            'text' => trim(implode("\n", $lines)),
            'confidence' => 60.0,
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
            return array('ok' => FALSE, 'error' => 'Foto melebihi 4 MB dan GD tidak tersedia untuk kompresi.');
        }

        $image = @imagecreatefromstring((string) file_get_contents($path));

        if ($image === FALSE) {
            return array('ok' => FALSE, 'error' => 'Gagal membaca foto untuk kompresi.');
        }

        $temp = tempnam(sys_get_temp_dir(), 'rtazure') . '.jpg';
        $width = imagesx($image);
        $height = imagesy($image);
        $target = 1400;

        if ($width > $target) {
            $height = (int) round($height * ($target / $width));
            $width = $target;
            $resized = imagecreatetruecolor($width, $height);
            imagecopyresampled($resized, $image, 0, 0, 0, 0, $width, $height, imagesx($image), imagesy($image));
            imagedestroy($image);
            $image = $resized;
        }

        imagejpeg($image, $temp, 78);
        imagedestroy($image);

        return array('ok' => TRUE, 'path' => $temp, 'temp' => TRUE);
    }

    private function parse_box($value)
    {
        if (!is_string($value) || strpos($value, ',') === FALSE) {
            return NULL;
        }

        $parts = array_map('floatval', explode(',', $value));

        if (count($parts) < 4) {
            return NULL;
        }

        return array($parts[0], $parts[1], $parts[0] + $parts[2], $parts[1] + $parts[3]);
    }

    private function failure($message)
    {
        return array('ok' => FALSE, 'engine' => 'azure', 'text' => '', 'confidence' => 0.0, 'words' => array(), 'error' => $message);
    }
}
