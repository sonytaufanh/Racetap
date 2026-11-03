<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/Api_controller.php';

class Api_auth extends Api_controller
{
    public function session()
    {
        if (!$this->only_methods(array('GET'))) {
            return;
        }

        $admin = $this->admin_user();
        $has_admin = $this->db->count_all('admin_users') > 0;

        $this->respond(array(
            'admin' => $admin,
            'has_admin' => $has_admin,
            'csrf_token' => $this->csrf_token()
        ));
    }

    public function login()
    {
        if (!$this->only_methods(array('POST'))) {
            return;
        }

        if (!$this->rate_limit('login', 8, 300)) {
            return;
        }

        $username = trim((string) $this->input_value('username', ''));
        $password = (string) $this->input_value('password', '');

        if ($username === '' || $password === '') {
            $this->fail('Username dan password wajib diisi.', 422);
            return;
        }

        $user = $this->db->get_where('admin_users', array(
            'username' => $username,
            'is_active' => 1
        ))->row();

        if (!$user || !password_verify($password, $user->password_hash)) {
            $this->fail('Username atau password salah, atau akun tidak aktif.', 401);
            return;
        }

        $role = isset($user->role) && $user->role !== '' ? $user->role : 'admin';

        $this->session->sess_regenerate(TRUE);
        $this->session->set_userdata(array(
            'admin_user_id' => (int) $user->id,
            'admin_username' => $user->username,
            'admin_display_name' => $user->display_name,
            'admin_role' => $role
        ));

        $this->db->where('id', (int) $user->id)->update('admin_users', array(
            'last_login_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ));

        $this->respond(array(
            'admin' => $this->admin_user(),
            'csrf_token' => $this->csrf_token(TRUE)
        ));
    }

    public function logout()
    {
        if (!$this->only_methods(array('POST'))) {
            return;
        }

        if (!$this->require_csrf()) {
            return;
        }

        $this->session->unset_userdata(array(
            'admin_user_id',
            'admin_username',
            'admin_display_name',
            'admin_role'
        ));
        $this->session->sess_regenerate(TRUE);

        $this->respond(array('logged_out' => TRUE, 'csrf_token' => $this->csrf_token(TRUE)));
    }

    public function setup()
    {
        if (!$this->only_methods(array('POST'))) {
            return;
        }

        if ($this->db->count_all('admin_users') > 0) {
            $this->fail('Akun admin sudah dibuat. Halaman setup telah dikunci.', 403);
            return;
        }

        $display_name = trim((string) $this->input_value('display_name', ''));
        $username = trim((string) $this->input_value('username', ''));
        $password = (string) $this->input_value('password', '');
        $confirm = (string) $this->input_value('password_confirm', '');

        $errors = array();

        if ($display_name === '' || mb_strlen($display_name) > 120) {
            $errors['display_name'] = 'Nama admin wajib diisi (maksimal 120 karakter).';
        }

        if (!preg_match('/^[A-Za-z0-9_-]{4,80}$/', $username)) {
            $errors['username'] = 'Username 4-80 karakter, hanya huruf, angka, garis bawah, atau strip.';
        }

        if (strlen($password) < 8) {
            $errors['password'] = 'Password minimal 8 karakter.';
        }

        if ($password !== $confirm) {
            $errors['password_confirm'] = 'Konfirmasi password tidak sama.';
        }

        if (!empty($errors)) {
            $this->fail('Data belum valid.', 422, array('fields' => $errors));
            return;
        }

        if ($this->db->count_all('admin_users') > 0) {
            $this->fail('Akun admin sudah dibuat. Halaman setup telah dikunci.', 403);
            return;
        }

        $now = date('Y-m-d H:i:s');

        $data = array(
            'username' => $username,
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'display_name' => $display_name,
            'is_active' => 1,
            'created_at' => $now,
            'updated_at' => $now
        );

        if ($this->db->field_exists('role', 'admin_users')) {
            $data['role'] = 'superadmin';
        }

        $this->db->insert('admin_users', $data);

        $this->respond(array('created' => TRUE), 201);
    }
}
