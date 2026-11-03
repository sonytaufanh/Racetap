<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/Api_controller.php';

/**
 * Admin authoring for the per-event e-certificate templates.
 *
 * Certificates are plain files under results/<slug>/ so the static results
 * viewer keeps working without an API call; this controller is only the
 * write path used by the admin editor.
 */
class Api_admin_certificates extends Api_controller
{
    public function __construct()
    {
        parent::__construct();
        $this->load->model('Certificate_model');
    }

    /** GET /admin/certificates */
    public function index()
    {
        if ($this->require_admin() === NULL) {
            return;
        }

        if (!$this->only_methods(array('GET'))) {
            return;
        }

        $this->respond(array('events' => $this->Certificate_model->events()));
    }

    /** GET/PUT/DELETE /admin/certificates/<slug> */
    public function event($slug = '')
    {
        if ($this->require_admin() === NULL) {
            return;
        }

        $slug = (string) $slug;
        $method = $this->method();

        if (!$this->Certificate_model->valid_slug($slug)) {
            $this->fail('Slug event tidak valid.', 422);
            return;
        }

        if ($method === 'GET') {
            $config = $this->Certificate_model->find($slug);

            $this->respond(array(
                'slug' => $slug,
                'config' => $config,
                'template_url' => $config !== NULL && $config['template'] !== NULL
                    ? $this->Certificate_model->template_url($slug, $config['template'])
                    : NULL
            ));
            return;
        }

        if ($method === 'PUT' || $method === 'PATCH' || $method === 'POST') {
            if (!$this->require_csrf()) {
                return;
            }

            $result = $this->Certificate_model->save_config($slug, $this->payload());

            if (empty($result['ok'])) {
                $this->fail($result['error'], 422);
                return;
            }

            $config = $result['config'];
            $this->audit('certificate.update', 'event', $slug, array(
                'fields' => count($config['fields']),
                'enabled' => $config['enabled']
            ));

            $this->respond(array(
                'slug' => $slug,
                'config' => $config,
                'template_url' => $config['template'] !== NULL
                    ? $this->Certificate_model->template_url($slug, $config['template'])
                    : NULL
            ));
            return;
        }

        if ($method === 'DELETE') {
            if (!$this->require_csrf()) {
                return;
            }

            $result = $this->Certificate_model->delete($slug);

            if (empty($result['ok'])) {
                $this->fail($result['error'], 422);
                return;
            }

            $this->audit('certificate.delete', 'event', $slug, $result['removed']);
            $this->respond(array('deleted' => TRUE, 'removed' => $result['removed']));
            return;
        }

        $this->fail('Method tidak diizinkan.', 405);
    }

    /** POST /admin/certificates/<slug>/template (multipart: template) */
    public function template($slug = '')
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

        $slug = (string) $slug;

        if (!$this->Certificate_model->valid_slug($slug)) {
            $this->fail('Slug event tidak valid.', 422);
            return;
        }

        if (empty($_FILES['template']) || !is_array($_FILES['template'])) {
            $this->fail('File template wajib diunggah.', 422);
            return;
        }

        $result = $this->Certificate_model->store_template($slug, $_FILES['template']);

        if (empty($result['ok'])) {
            $this->fail($result['error'], 422);
            return;
        }

        $this->audit('certificate.template', 'event', $slug, array(
            'template' => $result['template'],
            'width' => $result['width'],
            'height' => $result['height']
        ));

        $this->respond(array(
            'slug' => $slug,
            'template' => $result['template'],
            'template_url' => $result['template_url'],
            'width' => $result['width'],
            'height' => $result['height'],
            'config' => $result['config']
        ), 201);
    }

    /** GET /admin/certificates/<slug>/sample?q=&limit= */
    public function sample($slug = '')
    {
        if ($this->require_admin() === NULL) {
            return;
        }

        if (!$this->only_methods(array('GET'))) {
            return;
        }

        $slug = (string) $slug;

        if (!$this->Certificate_model->valid_slug($slug)) {
            $this->fail('Slug event tidak valid.', 422);
            return;
        }

        $query = (string) $this->input->get('q', TRUE);
        $limit = (int) $this->input->get('limit');
        $limit = $limit > 0 ? min($limit, 200) : 50;

        $result = $this->Certificate_model->sample($slug, $query, $limit);

        if (empty($result['ok'])) {
            $this->fail($result['error'], 422);
            return;
        }

        unset($result['ok']);
        $this->respond($result);
    }
}
