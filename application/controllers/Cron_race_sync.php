<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Cron_race_sync extends CI_Controller
{
    public function __construct()
    {
        parent::__construct();
        if (!$this->input->is_cli_request()) {
            show_404();
        }
        $this->load->model('Race_api_model');
    }

    public function sync_due_events()
    {
        $results = $this->Race_api_model->sync_due_events();
        foreach ($results as $item) {
            echo '[' . date('Y-m-d H:i:s') . '] Race #' . $item['id'] . ': ' . $item['message'] . PHP_EOL;
        }
        echo 'Selesai. Diproses: ' . count($results) . PHP_EOL;
    }
}
