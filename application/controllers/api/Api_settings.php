<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/Api_controller.php';

/**
 * Public site settings (contact details, social links, SEO defaults).
 * Values are managed from the admin settings screen.
 */
class Api_settings extends Api_controller
{
    const PUBLIC_KEYS = array(
        'site_name',
        'tagline',
        'whatsapp',
        'email',
        'address',
        'instagram',
        'facebook',
        'youtube',
        'tiktok',
        'seo_description'
    );

    public function index()
    {
        if (!$this->only_methods(array('GET'))) {
            return;
        }

        $this->respond(self::read($this->db, self::PUBLIC_KEYS));
    }

    public static function read($db, array $keys = NULL)
    {
        $values = array();

        if (!$db->table_exists('app_settings')) {
            return $values;
        }

        $rows = $db->get('app_settings')->result();

        foreach ($rows as $row) {
            if ($keys === NULL || in_array($row->setting_key, $keys, TRUE)) {
                $values[$row->setting_key] = $row->setting_value;
            }
        }

        return $values;
    }
}
