<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/Api_controller.php';

/**
 * Contact form intake. Public + rate limited; the honeypot field keeps naive
 * bots out without a CAPTCHA.
 */
class Api_leads extends Api_controller
{
    public function index()
    {
        if (!$this->only_methods(array('POST'))) {
            return;
        }

        if (!$this->rate_limit('leads', 5, 600)) {
            return;
        }

        $payload = $this->payload();

        if (!empty($payload['website'])) {
            // Honeypot: pretend success so bots do not retry.
            $this->respond(array('received' => TRUE), 201);
            return;
        }

        $name = trim((string) (isset($payload['name']) ? $payload['name'] : ''));
        $email = trim((string) (isset($payload['email']) ? $payload['email'] : ''));
        $phone = trim((string) (isset($payload['phone']) ? $payload['phone'] : ''));
        $event_name = trim((string) (isset($payload['event_name']) ? $payload['event_name'] : ''));
        $message = trim((string) (isset($payload['message']) ? $payload['message'] : ''));

        $errors = array();

        if ($name === '' || mb_strlen($name) > 160) {
            $errors['name'] = 'Nama wajib diisi (maksimal 160 karakter).';
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
            $errors['email'] = 'Alamat email tidak valid.';
        }

        if (mb_strlen($message) < 10) {
            $errors['message'] = 'Pesan minimal 10 karakter.';
        }

        if (!empty($errors)) {
            $this->fail('Data belum valid.', 422, array('fields' => $errors));
            return;
        }

        if (!$this->db->table_exists('leads')) {
            $this->fail('Formulir belum siap. Jalankan migrasi database.', 503);
            return;
        }

        $this->db->insert('leads', array(
            'name' => $name,
            'email' => $email,
            'phone' => $phone !== '' ? $phone : NULL,
            'event_name' => $event_name !== '' ? $event_name : NULL,
            'message' => $message,
            'source' => 'contact',
            'ip' => (string) $this->input->ip_address(),
            'user_agent' => substr((string) $this->input->user_agent(), 0, 255),
            'status' => 'new',
            'created_at' => date('Y-m-d H:i:s')
        ));

        $this->respond(array('received' => TRUE), 201);
    }
}
