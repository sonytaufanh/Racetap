<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Admin_auth extends CI_Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->load->database();
        $this->load->library(array('session', 'form_validation'));
        $this->load->helper(array('url', 'form'));
    }

    public function index()
    {
        redirect('admin/login');
    }

    public function login()
    {
        if ($this->session->userdata('admin_user_id')) {
            redirect('admin/races');
            return;
        }

        $this->form_validation->set_rules('username', 'Username', 'trim|required|max_length[80]');
        $this->form_validation->set_rules('password', 'Password', 'required|max_length[200]');

        $error = '';
        if ($this->form_validation->run()) {
            $username = trim($this->input->post('username', TRUE));
            // Ambil hash berdasarkan username; jangan pernah menyimpan password asli.
            $user = $this->db->get_where('admin_users', array(
                'username' => $username,
                'is_active' => 1
            ))->row();

            if ($user && password_verify((string) $this->input->post('password', FALSE), $user->password_hash)) {
                $this->session->sess_regenerate(TRUE);
                $this->session->set_userdata(array(
                    'admin_user_id' => (int) $user->id,
                    'admin_username' => $user->username,
                    'admin_display_name' => $user->display_name
                ));
                $this->db->where('id', (int) $user->id)->update('admin_users', array(
                    'last_login_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s')
                ));
                redirect('admin/races');
                return;
            }
            $error = 'Username atau password salah, atau akun tidak aktif.';
        }

        $data['error'] = $error;
        $this->load->view('admin_auth/login', $data);
    }

    public function setup()
    {
        // Pendaftaran hanya tersedia saat tabel belum memiliki akun.
        if ($this->db->count_all('admin_users') > 0) {
            show_error('Akun admin sudah dibuat. Halaman setup telah dikunci.', 403);
            return;
        }

        $this->form_validation->set_rules('display_name', 'Nama admin', 'trim|required|max_length[120]');
        $this->form_validation->set_rules('username', 'Username', 'trim|required|min_length[4]|max_length[80]|alpha_dash|is_unique[admin_users.username]');
        $this->form_validation->set_rules('password', 'Password', 'required|min_length[12]|max_length[200]');
        $this->form_validation->set_rules('password_confirm', 'Konfirmasi password', 'required|matches[password]');

        $error = '';
        if ($this->form_validation->run()) {
            // Re-check inside the request to reduce the chance of two simultaneous first-user setups.
            if ($this->db->count_all('admin_users') > 0) {
                show_error('Akun admin sudah dibuat. Halaman setup telah dikunci.', 403);
                return;
            }
            $now = date('Y-m-d H:i:s');
            $inserted = $this->db->insert('admin_users', array(
                'username' => trim($this->input->post('username', TRUE)),
                'password_hash' => password_hash((string) $this->input->post('password', FALSE), PASSWORD_DEFAULT),
                'display_name' => trim($this->input->post('display_name', TRUE)),
                'is_active' => 1,
                'created_at' => $now,
                'updated_at' => $now
            ));
            if ($inserted) {
                $this->session->set_flashdata('success', 'Akun admin berhasil dibuat. Silakan login.');
                redirect('admin/login');
                return;
            }
            $error = 'Akun admin gagal dibuat. Coba lagi.';
        }

        $data['error'] = $error;
        $this->load->view('admin_auth/setup', $data);
    }

    public function logout()
    {
        if ($this->input->method(TRUE) !== 'POST') {
            show_error('Method not allowed', 405);
            return;
        }
        $this->session->unset_userdata(array(
            'admin_user_id',
            'admin_username',
            'admin_display_name'
        ));
        $this->session->sess_regenerate(TRUE);
        $this->session->set_flashdata('success', 'Anda telah logout.');
        redirect('admin/login');
    }
}
