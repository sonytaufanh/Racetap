<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/Api_controller.php';

/**
 * Admin event publishing: results/portfolio metadata stored in site_events,
 * with data.json / banner uploads and static shell generation via Cms_publisher.
 */
class Api_admin_events extends Api_controller
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
                'events' => $this->Cms_model->events(FALSE),
                'manifest' => $this->manifest_events()
            ));
            return;
        }

        if ($method === 'POST') {
            if (!$this->require_csrf()) {
                return;
            }

            $result = $this->Cms_model->save_event($this->payload());

            if (empty($result['ok'])) {
                $this->fail($result['error'], 422);
                return;
            }

            $this->audit('event.create', 'event', $result['id'], $result['event']['slug']);
            $this->respond($result['event'], 201);
            return;
        }

        $this->fail('Method tidak diizinkan.', 405);
    }

    public function event($id = 0)
    {
        if ($this->require_admin() === NULL) {
            return;
        }

        $event = $this->event_by_id((int) $id);

        if (!$event) {
            $this->fail('Event tidak ditemukan.', 404);
            return;
        }

        $method = $this->method();

        if ($method === 'GET') {
            $this->respond($event);
            return;
        }

        if ($method === 'PATCH' || $method === 'PUT' || $method === 'POST') {
            if (!$this->require_csrf()) {
                return;
            }

            $payload = $this->payload();
            $payload = array_merge($event, $payload);
            $result = $this->Cms_model->save_event($payload, (int) $id);

            if (empty($result['ok'])) {
                $this->fail($result['error'], 422);
                return;
            }

            $this->audit('event.update', 'event', (int) $id, $result['event']['slug']);
            $this->respond($result['event']);
            return;
        }

        if ($method === 'DELETE') {
            if (!$this->require_csrf()) {
                return;
            }

            $this->Cms_model->delete_event((int) $id);
            $this->audit('event.delete', 'event', (int) $id, $event['slug']);
            $this->respond(array('deleted' => TRUE));
            return;
        }

        $this->fail('Method tidak diizinkan.', 405);
    }

    public function data($id = 0)
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

        $event = $this->event_by_id((int) $id);

        if (!$event) {
            $this->fail('Event tidak ditemukan.', 404);
            return;
        }

        if (empty($_FILES['data']) || $_FILES['data']['error'] !== UPLOAD_ERR_OK) {
            $this->fail('File data.json wajib diunggah.', 422);
            return;
        }

        $stored = $this->cms_publisher->store_event_data($event, $_FILES['data']['tmp_name']);

        if (empty($stored['ok'])) {
            $this->fail($stored['error'], 422);
            return;
        }

        $publish = $this->cms_publisher->publish_event($event);
        $this->audit('event.data', 'event', (int) $id, array('rows' => $stored['count']));

        $this->respond(array(
            'rows' => $stored['count'],
            'published' => !empty($publish['ok']),
            'summary' => !empty($publish['summary']),
            'message' => empty($publish['ok']) ? $publish['error'] : NULL
        ));
    }

    public function banner($id = 0)
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

        $event = $this->event_by_id((int) $id);

        if (!$event) {
            $this->fail('Event tidak ditemukan.', 404);
            return;
        }

        if (empty($_FILES['banner']) || $_FILES['banner']['error'] !== UPLOAD_ERR_OK) {
            $this->fail('File banner wajib diunggah.', 422);
            return;
        }

        $extension = pathinfo((string) $_FILES['banner']['name'], PATHINFO_EXTENSION);
        $stored = $this->cms_publisher->store_event_banner($event, $_FILES['banner']['tmp_name'], $extension);

        if (empty($stored['ok'])) {
            $this->fail($stored['error'], 422);
            return;
        }

        $event['banner'] = $stored['banner'];
        $saved = $this->Cms_model->save_event($event, (int) $id);

        if (!empty($event['is_published'])) {
            $this->cms_publisher->publish_event($saved['event']);
        }

        $this->audit('event.banner', 'event', (int) $id, $stored['banner']);
        $this->respond($saved['event']);
    }

    public function publish($id = 0)
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

        $event = $this->event_by_id((int) $id);

        if (!$event) {
            $this->fail('Event tidak ditemukan.', 404);
            return;
        }

        $event['is_published'] = 1;
        $saved = $this->Cms_model->save_event($event, (int) $id);
        $result = $this->cms_publisher->publish_event($saved['event']);

        if (empty($result['ok'])) {
            $this->fail($result['error'], 500);
            return;
        }

        $this->audit('event.publish', 'event', (int) $id, $saved['event']['slug']);

        $this->respond(array(
            'event' => $saved['event'],
            'summary' => !empty($result['summary']),
            'url' => rtrim(base_url(), '/') . '/results/' . $saved['event']['slug'] . '/'
        ));
    }

    private function event_by_id($id)
    {
        foreach ($this->Cms_model->events(FALSE) as $event) {
            if ((int) $event['id'] === (int) $id) {
                return $event;
            }
        }

        return NULL;
    }

    /** Existing hand-written manifest, returned read-only so admins can see it. */
    private function manifest_events()
    {
        $file = FCPATH . 'web/src/results/events.json';

        if (!is_file($file)) {
            return array();
        }

        $decoded = json_decode((string) @file_get_contents($file), TRUE);

        return is_array($decoded) && isset($decoded['events']) && is_array($decoded['events']) ? $decoded['events'] : array();
    }
}
