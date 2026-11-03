<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/Api_controller.php';

/** Kiosk registry + config publishing (writes setting JSON + shell). */
class Api_admin_kiosk extends Api_controller
{
    public function __construct()
    {
        parent::__construct();
        $this->load->model('Cms_model');
        $this->load->library('cms_publisher');
    }

    public function index()
    {
        if ($this->require_admin() === NULL) {
            return;
        }

        $method = $this->method();

        if ($method === 'GET') {
            $this->respond(array(
                'kiosks' => $this->Cms_model->kiosks(),
                'manifest' => $this->manifest_instances()
            ));
            return;
        }

        if ($method === 'POST' || $method === 'PUT' || $method === 'PATCH') {
            if (!$this->require_csrf()) {
                return;
            }

            $payload = $this->payload();
            $id = isset($payload['id']) ? (int) $payload['id'] : NULL;
            $result = $this->Cms_model->save_kiosk($payload, $id);

            if (empty($result['ok'])) {
                $this->fail($result['error'], 422);
                return;
            }

            $publish = !empty($payload['publish']);
            $published = NULL;

            if ($publish) {
                $kiosk = $this->kiosk_by_id($result['id']);
                $published = $this->cms_publisher->publish_kiosk(
                    $kiosk,
                    isset($payload['config_file']) ? (string) $payload['config_file'] : 'setting-kiosk.json'
                );
            }

            $this->audit('kiosk.save', 'kiosk', $result['id'], array('publish' => $publish));

            $this->respond(array(
                'id' => $result['id'],
                'published' => $published === NULL ? NULL : !empty($published['ok']),
                'message' => is_array($published) && empty($published['ok']) ? $published['error'] : NULL
            ));
            return;
        }

        $this->fail('Method tidak diizinkan.', 405);
    }

    private function kiosk_by_id($id)
    {
        foreach ($this->Cms_model->kiosks() as $kiosk) {
            if ((int) $kiosk['id'] === (int) $id) {
                return $kiosk;
            }
        }

        return NULL;
    }

    private function manifest_instances()
    {
        $file = FCPATH . 'web/src/kiosk/instances.json';

        if (!is_file($file)) {
            return array();
        }

        $decoded = json_decode((string) @file_get_contents($file), TRUE);

        return is_array($decoded) && isset($decoded['instances']) && is_array($decoded['instances']) ? $decoded['instances'] : array();
    }
}
