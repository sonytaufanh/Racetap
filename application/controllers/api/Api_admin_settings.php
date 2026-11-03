<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/Api_controller.php';

/**
 * Site settings managed from the admin settings screen.
 */
class Api_admin_settings extends Api_controller
{
    const ALLOWED = array(
        'site_name',
        'tagline',
        'whatsapp',
        'email',
        'address',
        'instagram',
        'facebook',
        'youtube',
        'tiktok',
        'seo_description',
        'maintenance_notice'
    );

    public function index()
    {
        if ($this->require_admin() === NULL) {
            return;
        }

        $method = $this->method();

        if ($method === 'GET') {
            $this->respond(array('settings' => $this->read_all()));
            return;
        }

        if ($method === 'PUT' || $method === 'PATCH' || $method === 'POST') {
            if (!$this->require_csrf()) {
                return;
            }

            if (!$this->db->table_exists('app_settings')) {
                $this->fail('Tabel app_settings belum ada. Jalankan: php index.php tools migrate', 503);
                return;
            }

            $payload = $this->payload();
            $saved = array();
            $now = date('Y-m-d H:i:s');

            foreach (self::ALLOWED as $key) {
                if (!array_key_exists($key, $payload)) {
                    continue;
                }

                $value = $payload[$key];

                if (!is_scalar($value) && $value !== NULL) {
                    continue;
                }

                $value = $value === NULL ? '' : trim((string) $value);
                $saved[$key] = $value;

                $this->db->replace('app_settings', array(
                    'setting_key' => $key,
                    'setting_value' => $value,
                    'updated_at' => $now
                ));
            }

            $this->audit('settings.update', 'settings', NULL, array_keys($saved));

            $this->respond(array('settings' => $this->read_all(), 'saved' => array_keys($saved)));
            return;
        }

        $this->fail('Method tidak diizinkan.', 405);
    }

    private function read_all()
    {
        $settings = array();

        foreach (self::ALLOWED as $key) {
            $settings[$key] = '';
        }

        if (!$this->db->table_exists('app_settings')) {
            return $settings;
        }

        foreach ($this->db->get('app_settings')->result() as $row) {
            if (in_array($row->setting_key, self::ALLOWED, TRUE)) {
                $settings[$row->setting_key] = (string) $row->setting_value;
            }
        }

        return $settings;
    }
}
