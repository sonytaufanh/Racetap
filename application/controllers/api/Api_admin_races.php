<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/Api_controller.php';

class Api_admin_races extends Api_controller
{
    public function __construct()
    {
        parent::__construct();
        $this->load->model('Race_api_model');
    }

    public function index()
    {
        if ($this->require_admin() === NULL) {
            return;
        }

        if ($this->method() === 'GET') {
            $races = array();

            foreach ($this->Race_api_model->all_events() as $race) {
                $races[] = $this->serialize($race);
            }

            $this->respond(array('races' => $races));
            return;
        }

        if ($this->method() === 'POST') {
            if (!$this->require_csrf()) {
                return;
            }

            $payload = $this->payload();
            $name = trim((string) (isset($payload['name']) ? $payload['name'] : ''));
            $api_url = trim((string) (isset($payload['api_url']) ? $payload['api_url'] : ''));

            if ($name === '' || $api_url === '') {
                $this->fail('Nama race dan URL API wajib diisi.', 422);
                return;
            }

            $validation = $this->Race_api_model->validate_api_url($api_url);

            if ($validation !== TRUE) {
                $this->fail($validation, 422);
                return;
            }

            $saved = $this->Race_api_model->save_event(array('name' => $name, 'api_url' => $api_url));

            if (!$saved) {
                $this->fail('Data race gagal disimpan. Periksa apakah nama race menghasilkan slug yang sama.', 422);
                return;
            }

            $this->respond(array('created' => TRUE), 201);
            return;
        }

        $this->fail('Method tidak diizinkan.', 405);
    }

    public function race($id = 0)
    {
        if ($this->require_admin() === NULL) {
            return;
        }

        $race = $this->Race_api_model->get_event((int) $id);

        if (!$race) {
            $this->fail('Race tidak ditemukan.', 404);
            return;
        }

        $method = $this->method();

        if ($method === 'GET') {
            $this->respond($this->serialize($race));
            return;
        }

        if ($method === 'PATCH' || $method === 'PUT' || $method === 'POST') {
            if (!$this->require_csrf()) {
                return;
            }

            $payload = $this->payload();
            $name = trim((string) (isset($payload['name']) ? $payload['name'] : $race->name));
            $api_url = trim((string) (isset($payload['api_url']) ? $payload['api_url'] : $race->api_url));

            $validation = $this->Race_api_model->validate_api_url($api_url);

            if ($validation !== TRUE) {
                $this->fail($validation, 422);
                return;
            }

            $saved = $this->Race_api_model->save_event(array('name' => $name, 'api_url' => $api_url), (int) $id);

            if (!$saved) {
                $this->fail('Data race gagal disimpan.', 422);
                return;
            }

            $this->respond($this->serialize($this->Race_api_model->get_event((int) $id)));
            return;
        }

        if ($method === 'DELETE') {
            if (!$this->require_csrf()) {
                return;
            }

            $this->db->where('id', (int) $id)->delete('race_events');
            $this->respond(array('deleted' => TRUE));
            return;
        }

        $this->fail('Method tidak diizinkan.', 405);
    }

    public function sync($id = 0)
    {
        if ($this->require_admin() === NULL) {
            return;
        }

        if (!$this->only_methods(array('POST'))) {
            return;
        }

        if (!$this->require_csrf()) {
            return;
        }

        $result = $this->Race_api_model->sync_event((int) $id);

        if (empty($result['ok'])) {
            $this->fail($result['message'], 502);
            return;
        }

        $this->respond(array('message' => $result['message'], 'race' => $this->serialize($this->Race_api_model->get_event((int) $id))));
    }

    public function toggle($id = 0)
    {
        if ($this->require_admin() === NULL) {
            return;
        }

        if (!$this->only_methods(array('POST'))) {
            return;
        }

        if (!$this->require_csrf()) {
            return;
        }

        $this->Race_api_model->toggle_event((int) $id);

        $this->respond($this->serialize($this->Race_api_model->get_event((int) $id)));
    }

    private function serialize($race)
    {
        if (!$race) {
            return NULL;
        }

        return array(
            'id' => (int) $race->id,
            'name' => $race->name,
            'slug' => $race->slug,
            'api_url' => $race->api_url,
            'is_active' => (int) $race->is_active,
            'last_sync_status' => $race->last_sync_status,
            'last_sync_at' => $race->last_sync_at,
            'last_sync_message' => $race->last_sync_message,
            'last_sync_count' => $race->last_sync_count !== NULL ? (int) $race->last_sync_count : NULL,
            'created_at' => $race->created_at,
            'updated_at' => $race->updated_at
        );
    }
}
