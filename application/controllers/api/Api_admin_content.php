<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/Api_controller.php';

/**
 * Admin content editor API. Sections are stored as JSON so the editor can work
 * with the same shapes the React pages already use.
 */
class Api_admin_content extends Api_controller
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
        $locale = (string) $this->input->get('locale', TRUE);
        $locale = $locale === 'en' ? 'en' : 'id';

        if ($method === 'GET') {
            $this->respond(array(
                'locale' => $locale,
                'sections' => $this->Cms_model->sections($locale, FALSE)
            ));
            return;
        }

        if ($method === 'PUT' || $method === 'PATCH' || $method === 'POST') {
            if (!$this->require_csrf()) {
                return;
            }

            $payload = $this->payload();
            $sections = isset($payload['sections']) && is_array($payload['sections']) ? $payload['sections'] : array();
            $locale = isset($payload['locale']) && $payload['locale'] === 'en' ? 'en' : 'id';
            $publish = !isset($payload['publish']) || (bool) $payload['publish'];
            $admin = $this->require_admin();
            $saved = array();

            foreach ($sections as $key => $value) {
                if (!preg_match('/^[a-z0-9._-]{2,120}$/i', (string) $key)) {
                    continue;
                }

                $result = $this->Cms_model->save_section($key, $locale, $value, $publish, $admin['id']);

                if (!empty($result['ok'])) {
                    $saved[] = $key;
                }
            }

            $this->audit('content.save', 'content', NULL, array('locale' => $locale, 'sections' => $saved));

            $this->respond(array('saved' => $saved, 'locale' => $locale));
            return;
        }

        $this->fail('Method tidak diizinkan.', 405);
    }

    public function reset($key = '')
    {
        if ($this->require_admin() === NULL) {
            return;
        }

        if (!$this->only_methods(array('DELETE'))) {
            return;
        }

        if (!$this->require_csrf()) {
            return;
        }

        $locale = (string) $this->input->get('locale', TRUE);
        $locale = $locale === 'en' ? 'en' : 'id';

        $this->Cms_model->delete_section((string) $key, $locale);
        $this->audit('content.reset', 'content', $key, $locale);

        $this->respond(array('reset' => TRUE, 'key' => $key, 'locale' => $locale));
    }
}
