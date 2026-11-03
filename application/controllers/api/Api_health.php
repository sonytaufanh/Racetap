<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/Api_controller.php';

/**
 * Lightweight health probe for uptime checks and deploy smoke tests.
 */
class Api_health extends Api_controller
{
    public function index()
    {
        if (!$this->only_methods(array('GET'))) {
            return;
        }

        $checks = array(
            'database' => FALSE,
            'results' => 0,
            'sitemap' => is_file(FCPATH . 'sitemap.xml'),
            'build' => is_file(FCPATH . 'assets/app/site.js')
        );

        try {
            $this->db->query('SELECT 1');
            $checks['database'] = TRUE;
        } catch (Exception $error) {
            log_message('error', 'health: database check failed: ' . $error->getMessage());
        }

        $dirs = glob(FCPATH . 'results/*', GLOB_ONLYDIR);
        $checks['results'] = $dirs === FALSE ? 0 : count($dirs);

        $healthy = $checks['database'] && $checks['results'] > 0;

        $this->respond(array(
            'status' => $healthy ? 'ok' : 'degraded',
            'time' => date('c'),
            'checks' => $checks
        ), $healthy ? 200 : 503);
    }
}
