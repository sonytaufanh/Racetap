<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/Api_controller.php';

class Api_races extends Api_controller
{
    public function __construct()
    {
        parent::__construct();
        $this->load->model('Race_api_model');
    }

    public function index()
    {
        if (!$this->only_methods(array('GET'))) {
            return;
        }

        $races = array();

        foreach ($this->Race_api_model->all_events() as $race) {
            $races[] = array(
                'id' => (int) $race->id,
                'name' => $race->name,
                'slug' => $race->slug,
                'is_active' => (int) $race->is_active,
                'last_sync_status' => $race->last_sync_status,
                'last_sync_at' => $race->last_sync_at,
                'last_sync_message' => $race->last_sync_message,
                'last_sync_count' => $race->last_sync_count !== NULL ? (int) $race->last_sync_count : NULL,
                'created_at' => $race->created_at
            );
        }

        $this->respond(array('races' => $races));
    }

    public function show($slug = '')
    {
        if (!$this->only_methods(array('GET'))) {
            return;
        }

        $race = $this->Race_api_model->get_event_by_slug($slug, TRUE);

        if (!$race) {
            $this->fail('Race tidak ditemukan.', 404);
            return;
        }

        $q = trim((string) $this->input->get('q', TRUE));
        $category = trim((string) $this->input->get('category', TRUE));
        $per_page = (int) $this->input->get('per_page');
        $per_page = in_array($per_page, array(25, 50, 100), TRUE) ? $per_page : 25;
        $page = max(1, (int) $this->input->get('page'));

        $total = (int) $this->Race_api_model->count_results((int) $race->id, $q, $category);
        $total_pages = max(1, (int) ceil($total / $per_page));
        $page = min($page, $total_pages);
        $offset = ($page - 1) * $per_page;

        $rows = $this->Race_api_model->get_results((int) $race->id, $per_page, $offset, $q, $category);

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
                'gender_rank' => $row->gender_rank !== NULL ? (int) $row->gender_rank : NULL,
                'age_rank' => $row->age_rank !== NULL ? (int) $row->age_rank : NULL,
                'status' => $row->status
            );
        }

        $categories = array();

        foreach ($this->Race_api_model->categories_for_race((int) $race->id) as $row) {
            if ($row->category !== NULL && $row->category !== '') {
                $categories[] = $row->category;
            }
        }

        $this->respond(array(
            'race' => array(
                'name' => $race->name,
                'slug' => $race->slug,
                'last_sync_at' => $race->last_sync_at
            ),
            'results' => $results,
            'categories' => $categories,
            'filters' => array('q' => $q, 'category' => $category, 'per_page' => $per_page),
            'pagination' => array(
                'page' => $page,
                'per_page' => $per_page,
                'total' => $total,
                'total_pages' => $total_pages
            )
        ));
    }
}
