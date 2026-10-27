<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Race_results extends CI_Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->load->model('Race_api_model');
        $this->load->library('pagination');
        $this->load->helper(array('url', 'form'));
    }

    public function index($slug = '')
    {
        $race = $this->Race_api_model->get_event_by_slug($slug, TRUE);
        if (!$race) show_404();

        $q = trim((string) $this->input->get('q', TRUE));
        $category = trim((string) $this->input->get('category', TRUE));
        $per_page = 25;
        $page = max(1, (int) $this->input->get('page'));
        $offset = ($page - 1) * $per_page;

        $total = $this->Race_api_model->count_results($race->id, $q, $category);
        $data['race'] = $race;
        $data['q'] = $q;
        $data['category'] = $category;
        $data['categories'] = $this->Race_api_model->categories_for_race($race->id);
        $data['results'] = $this->Race_api_model->get_results($race->id, $per_page, $offset, $q, $category);
        $data['total'] = $total;

        $config['base_url'] = site_url('race/' . rawurlencode($race->slug));
        $config['total_rows'] = $total;
        $config['per_page'] = $per_page;
        $config['page_query_string'] = TRUE;
        $config['query_string_segment'] = 'page';
        $config['use_page_numbers'] = TRUE;
        $config['reuse_query_string'] = TRUE;
        $config['num_links'] = 3;
        $config['full_tag_open'] = '<nav class="pagination">';
        $config['full_tag_close'] = '</nav>';
        $config['attributes'] = array('class' => 'page-link');
        $this->pagination->initialize($config);
        $data['pagination'] = $this->pagination->create_links();
        $this->load->view('race_results/index', $data);
    }
}
