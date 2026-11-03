<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Shared base controller for the JSON API (api/v1/*).
 *
 * Kept outside of the CI "MY_" subclass mechanism on purpose: each API
 * controller requires this file explicitly so the legacy app keeps working
 * untouched.
 */
class Api_controller extends CI_Controller
{
    const CSRF_SESSION_KEY = 'api_csrf_token';

    public function __construct()
    {
        parent::__construct();
        $this->load->database();
        $this->load->library('session');
        $this->load->helper('url');

        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: no-store, max-age=0');
    }

    protected function payload()
    {
        $raw = file_get_contents('php://input');

        if ($raw === FALSE || $raw === '') {
            return array();
        }

        $decoded = json_decode($raw, TRUE);

        return is_array($decoded) ? $decoded : array();
    }

    protected function input_value($key, $default = NULL)
    {
        $payload = $this->payload();

        if (array_key_exists($key, $payload)) {
            return $payload[$key];
        }

        $post = $this->input->post($key, TRUE);

        if ($post !== NULL) {
            return $post;
        }

        $get = $this->input->get($key, TRUE);

        return $get === NULL ? $default : $get;
    }

    protected function respond($data, $status = 200, $meta = NULL)
    {
        $body = array('data' => $data);

        if ($meta !== NULL) {
            $body['meta'] = $meta;
        }

        $this->output
            ->set_status_header((int) $status)
            ->set_content_type('application/json', 'utf-8')
            ->set_output(json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        return;
    }

    protected function fail($message, $status = 400, $extra = NULL)
    {
        $body = array(
            'data' => NULL,
            'error' => array('message' => $message)
        );

        if (is_array($extra)) {
            $body['error'] += $extra;
        }

        $this->output
            ->set_status_header((int) $status)
            ->set_content_type('application/json', 'utf-8')
            ->set_output(json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        return;
    }

    protected function admin_user()
    {
        $id = $this->session->userdata('admin_user_id');

        if (!$id) {
            return NULL;
        }

        $role = (string) $this->session->userdata('admin_role');

        return array(
            'id' => (int) $id,
            'username' => (string) $this->session->userdata('admin_username'),
            'display_name' => (string) $this->session->userdata('admin_display_name'),
            'role' => $role !== '' ? $role : 'admin'
        );
    }

    protected function require_admin()
    {
        $user = $this->admin_user();

        if ($user === NULL) {
            $this->fail('Sesi admin tidak ditemukan. Silakan login kembali.', 401);
            return NULL;
        }

        return $user;
    }

    /**
     * User management is restricted to the superadmin role. Existing installs
     * keep working because admin_users.role defaults to 'admin', and the first
     * account is promoted to superadmin by Tools::migrate.
     */
    protected function require_superadmin()
    {
        $user = $this->require_admin();

        if ($user === NULL) {
            return NULL;
        }

        $row = $this->db->select('role')->get_where('admin_users', array('id' => (int) $user['id']))->row();

        if (!$row || $row->role !== 'superadmin') {
            $this->fail('Hanya superadmin yang dapat melakukan aksi ini.', 403);
            return NULL;
        }

        return $user;
    }

    /** Best-effort audit trail; never blocks the actual operation. */
    protected function audit($action, $entity, $entity_id = NULL, $detail = NULL)
    {
        if (!$this->db->table_exists('audit_log')) {
            return;
        }

        $user = $this->admin_user();

        try {
            $this->db->insert('audit_log', array(
                'admin_id' => $user ? $user['id'] : NULL,
                'admin_username' => $user ? $user['username'] : NULL,
                'action' => (string) $action,
                'entity' => (string) $entity,
                'entity_id' => $entity_id === NULL ? NULL : (string) $entity_id,
                'detail' => $detail === NULL ? NULL : (is_string($detail) ? $detail : json_encode($detail, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)),
                'ip' => (string) $this->input->ip_address(),
                'created_at' => date('Y-m-d H:i:s')
            ));
        } catch (Exception $error) {
            log_message('error', 'audit failed: ' . $error->getMessage());
        }
    }

    protected function csrf_token($regenerate = FALSE)
    {
        $token = $this->session->userdata(self::CSRF_SESSION_KEY);

        if ($token === NULL || $token === '' || $regenerate) {
            $token = bin2hex(random_bytes(32));
            $this->session->set_userdata(self::CSRF_SESSION_KEY, $token);
        }

        return (string) $token;
    }

    /**
     * Double-submit check for JSON mutations. CI3's built-in CSRF filter only
     * reads $_POST, so the API validates the X-CSRF-TOKEN header against the
     * token bound to the PHP session instead.
     */
    protected function require_csrf()
    {
        $expected = (string) $this->session->userdata(self::CSRF_SESSION_KEY);
        $provided = (string) $this->input->get_request_header('X-CSRF-TOKEN', TRUE);

        if ($expected === '' || $provided === '' || !hash_equals($expected, $provided)) {
            $this->fail('Token CSRF tidak valid. Muat ulang halaman lalu coba lagi.', 403);
            return FALSE;
        }

        return TRUE;
    }

    protected function method()
    {
        return strtoupper((string) $this->input->method(TRUE));
    }

    protected function only_methods(array $allowed)
    {
        $method = $this->method();

        if (!in_array($method, $allowed, TRUE)) {
            header('Allow: ' . implode(', ', $allowed));
            $this->fail('Method tidak diizinkan.', 405);
            return FALSE;
        }

        return TRUE;
    }

    protected function rate_limit($bucket, $max, $window_seconds)
    {
        $key = 'rate_' . $bucket;
        $now = time();
        $state = $this->session->userdata($key);

        if (!is_array($state) || !isset($state['start']) || ($now - (int) $state['start']) > $window_seconds) {
            $state = array('start' => $now, 'count' => 0);
        }

        $state['count'] = (int) $state['count'] + 1;
        $this->session->set_userdata($key, $state);

        if ($state['count'] > $max) {
            header('Retry-After: ' . $window_seconds);
            $this->fail('Terlalu banyak percobaan. Coba lagi beberapa saat.', 429);
            return FALSE;
        }

        return TRUE;
    }

    protected function json_safe($value)
    {
        return json_decode(json_encode($value), TRUE);
    }
}
