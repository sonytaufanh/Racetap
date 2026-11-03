<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Automatic OCR engine resolver.
 *
 * RapidOCR (the self-hosted Python service in ocr_service/) is the primary
 * engine and is always tried first. With `ocr_required_engine` enabled it is
 * also the ONLY engine: a stopped service produces an actionable error instead
 * of silently re-indexing photos with a weaker engine. "tesseract" means the
 * scan runs in the admin browser and is the last resort in both modes.
 */
class Ocr_service
{
    const PRIMARY_ENGINE = 'rapidocr';

    private $CI;
    private $config;
    private $adapters = array();
    private $resolver;
    private $health_cache = array();
    private $last_health_message = '';

    public function __construct()
    {
        $this->CI =& get_instance();
        $this->CI->config->load('ocr', TRUE);
        $this->config = $this->CI->config->item('ocr');

        $this->CI->load->library('Bib_resolver');
        $this->CI->load->library('vision_ocr');
        $this->CI->load->library('Rapidocr_service');
        $this->CI->load->library('Paddleocr_service');
        $this->CI->load->library('Azure_ocr');
        $this->CI->load->library('Ocrspace_ocr');

        $this->adapters = array(
            'rapidocr' => $this->CI->rapidocr_service,
            'paddleocr' => $this->CI->paddleocr_service,
            'azure' => $this->CI->azure_ocr,
            'ocrspace' => $this->CI->ocrspace_ocr,
            'vision' => $this->CI->vision_ocr
        );

        $this->resolver = $this->CI->bib_resolver;
    }

    /** RapidOCR is pinned to the front of the configured order. */
    public function order()
    {
        $order = isset($this->config['ocr_engine_order'])
            ? (array) $this->config['ocr_engine_order']
            : array('rapidocr', 'paddleocr', 'azure', 'ocrspace', 'vision', 'tesseract');

        if (!$this->required()) {
            return $order;
        }

        $filtered = array_values(array_diff($order, array(self::PRIMARY_ENGINE)));

        // "tesseract" is the browser fallback and must stay reachable.
        array_unshift($filtered, self::PRIMARY_ENGINE);

        return $filtered;
    }

    /** True when RapidOCR is not just preferred but mandatory. */
    public function required()
    {
        return is_array($this->config) && !empty($this->config['ocr_required_engine']);
    }

    public function available()
    {
        $out = array();

        foreach ($this->order() as $engine) {
            $out[$engine] = $this->engine_available($engine);
        }

        return $out;
    }

    public function mode()
    {
        $primary_ok = $this->engine_available(self::PRIMARY_ENGINE);

        foreach ($this->order() as $engine) {
            if ($engine === 'tesseract') {
                break;
            }

            if ($primary_ok && $engine !== self::PRIMARY_ENGINE) {
                continue;
            }

            if ($this->engine_available($engine)) {
                return $this->format_mode('server', $engine);
            }
        }

        // Without a server engine the scan falls back to the admin's browser.
        $mode = $this->format_mode('browser', 'tesseract');

        if ($this->required() && !$primary_ok) {
            $mode['warning'] = $this->primary_warning();
        }

        return $mode;
    }

    /**
     * Actionable message when the mandatory engine is unreachable. The admin UI
     * shows this verbatim, so it names the command that fixes it.
     */
    public function primary_warning()
    {
        $url = isset($this->config['ocr_service_url']) ? (string) $this->config['ocr_service_url'] : '(kosong)';

        return 'RapidOCR wajib aktif tetapi tidak dapat dihubungi di ' . $url
            . '. Jalankan ocr_service\\start.ps1 (Windows) atau "uvicorn app:app --host 127.0.0.1 --port 8010" '
            . 'di folder ocr_service, lalu muat ulang halaman ini.'
            . ($this->last_health_message !== '' ? ' Detail: ' . $this->last_health_message : '');
    }

    private function format_mode($mode, $engine)
    {
        $labels = isset($this->config['ocr_labels']) ? $this->config['ocr_labels'] : array();

        return array(
            'mode' => $mode,
            'engine' => $engine,
            'label' => isset($labels[$engine]) ? $labels[$engine] : ucfirst($engine),
            'required_engine' => $this->required() ? self::PRIMARY_ENGINE : '',
            'primary_ready' => $this->engine_available(self::PRIMARY_ENGINE),
            'available' => $this->available()
        );
    }

    /**
     * Scans one photo file with the first available server engine, falling
     * back to the next engine on error.
     *
     * @param array $rule Per-event OCR rule (digitsOnly + exact digit count).
     * @return array{ok:bool, engine:string, text:string, confidence:float, bibs:array, primary:string, words:array, error:string}
     */
    public function scan_file($path, $known = array(), $rule = array())
    {
        $last_error = 'Tidak ada server OCR yang tersedia.';
        $required = $this->required();
        $primary_ready = $this->engine_available(self::PRIMARY_ENGINE);

        if ($required && !$primary_ready) {
            return $this->failure($this->primary_warning());
        }

        foreach ($this->order() as $engine) {
            if ($engine === 'tesseract') {
                break;
            }

            // Required mode never degrades to a weaker engine.
            if ($required && $engine !== self::PRIMARY_ENGINE) {
                break;
            }

            $adapter = isset($this->adapters[$engine]) ? $this->adapters[$engine] : NULL;

            if (!$adapter || !$adapter->enabled()) {
                continue;
            }

            $result = $adapter->scan_file($path);

            if (empty($result['ok'])) {
                $last_error = $result['error'];
                log_message('error', 'OCR ' . $engine . ' gagal: ' . $result['error']);

                if ($required) {
                    break;
                }

                continue;
            }

            $resolved = $this->resolver->resolve(
                isset($result['words']) ? $result['words'] : array(),
                isset($result['text']) ? $result['text'] : '',
                $known,
                isset($this->config['ocr_max_bibs']) ? (int) $this->config['ocr_max_bibs'] : 8,
                $rule
            );

            return array(
                'ok' => TRUE,
                'engine' => $engine,
                'text' => isset($result['text']) ? $result['text'] : '',
                'confidence' => isset($result['confidence']) ? (float) $result['confidence'] : 0.0,
                'words' => isset($result['words']) ? $result['words'] : array(),
                'bibs' => $resolved,
                'primary' => $this->resolver->primary_bib($resolved),
                'error' => ''
            );
        }

        return $this->failure($last_error);
    }

    private function failure($message)
    {
        return array(
            'ok' => FALSE,
            'engine' => '',
            'text' => '',
            'confidence' => 0.0,
            'bibs' => array(),
            'primary' => '',
            'words' => array(),
            'error' => $message
        );
    }

    /**
     * Resolves raw OCR words/text (e.g. from the browser Tesseract worker)
     * against the known bib whitelist. Used by the ocr-result endpoint.
     */
    public function resolve_words($words, $text, $known = array(), $rule = array())
    {
        $resolved = $this->resolver->resolve($words, $text, $known, isset($this->config['ocr_max_bibs']) ? (int) $this->config['ocr_max_bibs'] : 8, $rule);

        return array(
            'bibs' => $resolved,
            'primary' => $this->resolver->primary_bib($resolved)
        );
    }

    private function engine_available($engine)
    {
        if ($engine === 'tesseract') {
            return TRUE;
        }

        if (isset($this->health_cache[$engine])) {
            return $this->health_cache[$engine];
        }

        $adapter = isset($this->adapters[$engine]) ? $this->adapters[$engine] : NULL;

        if (!$adapter || !$adapter->enabled()) {
            if ($engine === self::PRIMARY_ENGINE) {
                $this->last_health_message = 'OCR_SERVICE_URL belum diisi.';
            }

            $this->health_cache[$engine] = FALSE;
            return FALSE;
        }

        if (method_exists($adapter, 'healthy')) {
            $this->health_cache[$engine] = $adapter->healthy();

            if ($engine === self::PRIMARY_ENGINE && !$this->health_cache[$engine]) {
                $this->last_health_message = 'endpoint /health tidak merespons.';
            }

            return $this->health_cache[$engine];
        }

        $this->health_cache[$engine] = TRUE;
        return TRUE;
    }
}
