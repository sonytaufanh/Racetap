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

            if ($name === '') {
                $this->fail('Nama race wajib diisi.', 422);
                return;
            }

            // Events imported from results/<slug>/data.json have no upstream API.
            if ($api_url !== '') {
                $validation = $this->Race_api_model->validate_api_url($api_url);

                if ($validation !== TRUE) {
                    $this->fail($validation, 422);
                    return;
                }
            }

            $saved = $this->Race_api_model->save_event(array('name' => $name, 'api_url' => $api_url));

            if (!$saved) {
                $this->fail('Data race gagal disimpan. Periksa apakah nama race menghasilkan slug yang sama.', 422);
                return;
            }

            $this->audit('race.create', 'race', (int) $this->db->insert_id(), array('name' => $name));

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

            if ($api_url !== '') {
                $validation = $this->Race_api_model->validate_api_url($api_url);

                if ($validation !== TRUE) {
                    $this->fail($validation, 422);
                    return;
                }
            }

            $saved = $this->Race_api_model->save_event(array('name' => $name, 'api_url' => $api_url), (int) $id);

            if (!$saved) {
                $this->fail('Data race gagal disimpan.', 422);
                return;
            }

            $this->audit('race.update', 'race', (int) $id, array('name' => $name));

            $this->respond($this->serialize($this->Race_api_model->get_event((int) $id)));
            return;
        }

        if ($method === 'DELETE') {
            if (!$this->require_csrf()) {
                return;
            }

            $this->db->where('id', (int) $id)->delete('race_events');
            $this->audit('race.delete', 'race', (int) $id, $race->slug);
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
            $this->audit('race.sync.failed', 'race', (int) $id, $result['message']);
            $this->fail($result['message'], 502);
            return;
        }

        $this->audit('race.sync', 'race', (int) $id, $result['message']);

        $this->respond(array('message' => $result['message'], 'race' => $this->serialize($this->Race_api_model->get_event((int) $id))));
    }

    /**
     * Paginated results preview for the admin race detail screen.
     */
    public function results($id = 0)
    {
        if ($this->require_admin() === NULL) {
            return;
        }

        if (!$this->only_methods(array('GET'))) {
            return;
        }

        $race = $this->Race_api_model->get_event((int) $id);

        if (!$race) {
            $this->fail('Race tidak ditemukan.', 404);
            return;
        }

        $q = trim((string) $this->input->get('q', TRUE));
        $page = max(1, (int) $this->input->get('page'));
        $per_page = (int) $this->input->get('per_page');
        $per_page = in_array($per_page, array(25, 50, 100), TRUE) ? $per_page : 25;

        $this->db->from('race_results')->where('race_id', (int) $id);

        if ($q !== '') {
            $this->db->group_start()->like('name', $q)->or_like('bib', $q)->group_end();
        }

        $total = (int) $this->db->count_all_results();
        $total_pages = max(1, (int) ceil($total / $per_page));
        $page = min($page, $total_pages);

        $this->db->from('race_results')->where('race_id', (int) $id);

        if ($q !== '') {
            $this->db->group_start()->like('name', $q)->or_like('bib', $q)->group_end();
        }

        $rows = $this->db
            ->order_by('overall_rank IS NULL', '', FALSE)
            ->order_by('overall_rank', 'ASC')
            ->limit($per_page, ($page - 1) * $per_page)
            ->get()
            ->result();

        $results = array();

        foreach ($rows as $row) {
            $results[] = array(
                'bib' => $row->bib,
                'name' => $row->name,
                'category' => $row->category,
                'gender' => $row->gender,
                'age_group' => $row->age_group,
                'gun_time' => $row->gun_time,
                'net_time' => $row->net_time,
                'overall_rank' => $row->overall_rank !== NULL ? (int) $row->overall_rank : NULL,
                'status' => $row->status
            );
        }

        $this->respond(array(
            'race' => $this->serialize($race),
            'results' => $results,
            'pagination' => array(
                'page' => $page,
                'per_page' => $per_page,
                'total' => $total,
                'total_pages' => $total_pages
            )
        ));
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
        $this->audit('race.toggle', 'race', (int) $id);

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
