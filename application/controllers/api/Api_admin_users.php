<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/Api_controller.php';

/**
 * Admin account management (superadmin only).
 */
class Api_admin_users extends Api_controller
{
    const ROLES = array('superadmin', 'admin', 'operator');

    public function index()
    {
        if ($this->require_superadmin() === NULL) {
            return;
        }

        if (!$this->only_methods(array('GET'))) {
            return;
        }

        $rows = $this->db
            ->select('id, username, display_name, role, is_active, last_login_at, created_at')
            ->order_by('id', 'ASC')
            ->get('admin_users')
            ->result();

        $users = array();

        foreach ($rows as $row) {
            $users[] = array(
                'id' => (int) $row->id,
                'username' => $row->username,
                'display_name' => $row->display_name,
                'role' => isset($row->role) ? $row->role : 'admin',
                'is_active' => (int) $row->is_active,
                'last_login_at' => $row->last_login_at,
                'created_at' => $row->created_at
            );
        }

        $this->respond(array('users' => $users, 'roles' => self::ROLES));
    }

    public function user($id = 0)
    {
        $actor = $this->require_superadmin();

        if ($actor === NULL) {
            return;
        }

        $row = $this->db->get_where('admin_users', array('id' => (int) $id))->row();

        if (!$row) {
            $this->fail('Pengguna tidak ditemukan.', 404);
            return;
        }

        $method = $this->method();

        if ($method === 'GET') {
            $this->respond($this->serialize($row));
            return;
        }

        if ($method === 'PATCH' || $method === 'PUT' || $method === 'POST') {
            if (!$this->require_csrf()) {
                return;
            }

            $payload = $this->payload();
            $update = array('updated_at' => date('Y-m-d H:i:s'));

            if (isset($payload['display_name'])) {
                $display_name = trim((string) $payload['display_name']);

                if ($display_name === '' || mb_strlen($display_name) > 120) {
                    $this->fail('Nama tampilan wajib diisi (maksimal 120 karakter).', 422);
                    return;
                }

                $update['display_name'] = $display_name;
            }

            if (isset($payload['role'])) {
                $role = (string) $payload['role'];

                if (!in_array($role, self::ROLES, TRUE)) {
                    $this->fail('Role tidak dikenal.', 422);
                    return;
                }

                if ((int) $row->id === (int) $actor['id'] && $role !== 'superadmin' && $this->superadmin_count() <= 1) {
                    $this->fail('Tidak dapat menurunkan superadmin terakhir.', 422);
                    return;
                }

                $update['role'] = $role;
            }

            if (isset($payload['is_active'])) {
                $active = (int) (bool) $payload['is_active'];

                if ((int) $row->id === (int) $actor['id'] && $active === 0) {
                    $this->fail('Tidak dapat menonaktifkan akun sendiri.', 422);
                    return;
                }

                $update['is_active'] = $active;
            }

            if (isset($payload['password']) && (string) $payload['password'] !== '') {
                $password = (string) $payload['password'];

                if (strlen($password) < 8) {
                    $this->fail('Password minimal 8 karakter.', 422);
                    return;
                }

                $update['password_hash'] = password_hash($password, PASSWORD_DEFAULT);
            }

            $this->db->where('id', (int) $row->id)->update('admin_users', $update);
            $this->audit('user.update', 'admin_user', (int) $row->id, array_keys($update));

            $this->respond($this->serialize($this->db->get_where('admin_users', array('id' => (int) $row->id))->row()));
            return;
        }

        if ($method === 'DELETE') {
            if (!$this->require_csrf()) {
                return;
            }

            if ((int) $row->id === (int) $actor['id']) {
                $this->fail('Tidak dapat menghapus akun sendiri.', 422);
                return;
            }

            if (isset($row->role) && $row->role === 'superadmin' && $this->superadmin_count() <= 1) {
                $this->fail('Tidak dapat menghapus superadmin terakhir.', 422);
                return;
            }

            $this->db->where('id', (int) $row->id)->delete('admin_users');
            $this->audit('user.delete', 'admin_user', (int) $row->id, $row->username);

            $this->respond(array('deleted' => TRUE));
            return;
        }

        $this->fail('Method tidak diizinkan.', 405);
    }

    public function store()
    {
        $actor = $this->require_superadmin();

        if ($actor === NULL) {
            return;
        }

        if (!$this->only_methods(array('POST'))) {
            return;
        }

        if (!$this->require_csrf()) {
            return;
        }

        $payload = $this->payload();
        $username = trim((string) (isset($payload['username']) ? $payload['username'] : ''));
        $display_name = trim((string) (isset($payload['display_name']) ? $payload['display_name'] : ''));
        $password = (string) (isset($payload['password']) ? $payload['password'] : '');
        $role = (string) (isset($payload['role']) ? $payload['role'] : 'operator');

        $errors = array();

        if (!preg_match('/^[A-Za-z0-9_-]{4,80}$/', $username)) {
            $errors['username'] = 'Username 4-80 karakter, hanya huruf, angka, garis bawah, atau strip.';
        }

        if ($display_name === '' || mb_strlen($display_name) > 120) {
            $errors['display_name'] = 'Nama tampilan wajib diisi.';
        }

        if (strlen($password) < 8) {
            $errors['password'] = 'Password minimal 8 karakter.';
        }

        if (!in_array($role, self::ROLES, TRUE)) {
            $errors['role'] = 'Role tidak dikenal.';
        }

        if (!empty($errors)) {
            $this->fail('Data belum valid.', 422, array('fields' => $errors));
            return;
        }

        $exists = $this->db->where('username', $username)->count_all_results('admin_users');

        if ($exists > 0) {
            $this->fail('Username sudah dipakai.', 422, array('fields' => array('username' => 'Username sudah dipakai.')));
            return;
        }

        $now = date('Y-m-d H:i:s');

        $this->db->insert('admin_users', array(
            'username' => $username,
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'display_name' => $display_name,
            'role' => $role,
            'is_active' => 1,
            'created_at' => $now,
            'updated_at' => $now
        ));

        $id = (int) $this->db->insert_id();
        $this->audit('user.create', 'admin_user', $id, array('username' => $username, 'role' => $role));

        $this->respond($this->serialize($this->db->get_where('admin_users', array('id' => $id))->row()), 201);
    }

    private function superadmin_count()
    {
        if (!$this->db->field_exists('role', 'admin_users')) {
            return 0;
        }

        return (int) $this->db->where('role', 'superadmin')->count_all_results('admin_users');
    }

    private function serialize($row)
    {
        if (!$row) {
            return NULL;
        }

        return array(
            'id' => (int) $row->id,
            'username' => $row->username,
            'display_name' => $row->display_name,
            'role' => isset($row->role) ? $row->role : 'admin',
            'is_active' => (int) $row->is_active,
            'last_login_at' => isset($row->last_login_at) ? $row->last_login_at : NULL,
            'created_at' => isset($row->created_at) ? $row->created_at : NULL
        );
    }
}
