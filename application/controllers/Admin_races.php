<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Admin_races extends CI_Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->load->model('Race_api_model');
        $this->load->library('session');
        $this->load->helper(array('url', 'form'));
    }

    private function require_admin()
    {
        if (!$this->session->userdata('admin_user_id')) {
            redirect('admin/login');
            exit;
        }
    }

    public function index()
    {
        $this->require_admin();
        $data['races'] = $this->Race_api_model->all_events();
        $this->load->view('admin_races/index', $data);
    }

    public function create()
    {
        $this->require_admin();
        $this->form_page();
    }

    public function edit($id)
    {
        $this->require_admin();
        $race = $this->Race_api_model->get_event((int) $id);
        if (!$race) show_404();
        $this->form_page($race);
    }

    private function form_page($race = NULL)
    {
        $this->load->library('form_validation');
        $this->form_validation->set_rules('name', 'Nama race', 'trim|required|max_length[190]');
        $this->form_validation->set_rules('api_url', 'URL API', 'trim|required|max_length[1000]');
        if ($this->form_validation->run()) {
            $payload = array(
                'name' => trim($this->input->post('name', TRUE)),
                'api_url' => trim($this->input->post('api_url', TRUE))
            );
            $validation = $this->Race_api_model->validate_api_url($payload['api_url']);
            if ($validation !== TRUE) {
                $data['error'] = $validation;
            } else {
                $saved = $this->Race_api_model->save_event($payload, $race ? (int) $race->id : NULL);
                if ($saved) {
                    $this->session->set_flashdata('success', 'Data race berhasil disimpan.');
                    redirect('admin/races');
                    return;
                }
                $data['error'] = 'Data race gagal disimpan. Periksa apakah nama race menghasilkan slug yang sama.';
            }
        }
        $data['race'] = $race;
        $this->load->view('admin_races/form', $data);
    }

    public function sync($id)
    {
        $this->require_admin();
        if ($this->input->method(TRUE) !== 'POST') show_error('Method not allowed', 405);
        $result = $this->Race_api_model->sync_event((int) $id);
        $this->session->set_flashdata($result['ok'] ? 'success' : 'error', $result['message']);
        redirect('admin/races');
    }

    public function toggle($id)
    {
        $this->require_admin();
        if ($this->input->method(TRUE) !== 'POST') show_error('Method not allowed', 405);
        $this->Race_api_model->toggle_event((int) $id);
        redirect('admin/races');
    }
}
