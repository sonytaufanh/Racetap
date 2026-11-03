<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/Api_controller.php';

/** Per-route SEO meta managed from the CMS. */
class Api_admin_seo extends Api_controller
{
    public function __construct()
    {
        parent::__construct();
        $this->load->model('Cms_model');
    }

    public function index()
    {
        if ($this->require_admin() === NULL) {
            return;
        }

        $method = $this->method();

        if ($method === 'GET') {
            $this->respond(array('pages' => array_values($this->Cms_model->seo())));
            return;
        }

        if ($method === 'PUT' || $method === 'PATCH' || $method === 'POST') {
            if (!$this->require_csrf()) {
                return;
            }

            $payload = $this->payload();
            $pages = isset($payload['pages']) && is_array($payload['pages']) ? $payload['pages'] : array($payload);
            $saved = array();

            foreach ($pages as $page) {
                if (!is_array($page)) {
                    continue;
                }

                $result = $this->Cms_model->save_seo($page);

                if (!empty($result['ok'])) {
                    $saved[] = $page['route'] . '|' . (isset($page['locale']) ? $page['locale'] : 'id');
                }
            }

            $this->audit('seo.save', 'seo', NULL, $saved);
            $this->respond(array('saved' => $saved));
            return;
        }

        $this->fail('Method tidak diizinkan.', 405);
    }
}
