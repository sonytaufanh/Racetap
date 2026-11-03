<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/Api_controller.php';

/**
 * Contact form inbox for the admin.
 */
class Api_admin_leads extends Api_controller
{
    const STATUSES = array('new', 'contacted', 'won', 'archived');

    public function index()
    {
        if ($this->require_admin() === NULL) {
            return;
        }

        if (!$this->only_methods(array('GET'))) {
            return;
        }

        if (!$this->db->table_exists('leads')) {
            $this->respond(array('leads' => array(), 'pagination' => array(
                'page' => 1, 'per_page' => 25, 'total' => 0, 'total_pages' => 1
            )));
            return;
        }

        $page = max(1, (int) $this->input->get('page'));
        $per_page = (int) $this->input->get('per_page');
        $per_page = in_array($per_page, array(25, 50, 100), TRUE) ? $per_page : 25;
        $status = trim((string) $this->input->get('status', TRUE));

        if ($status !== '') {
            $this->db->where('status', $status);
        }

        $total = (int) $this->db->count_all_results('leads');
        $total_pages = max(1, (int) ceil($total / $per_page));
        $page = min($page, $total_pages);

        if ($status !== '') {
            $this->db->where('status', $status);
        }

        $rows = $this->db
            ->order_by('id', 'DESC')
            ->limit($per_page, ($page - 1) * $per_page)
            ->get('leads')
            ->result();

        $leads = array();

        foreach ($rows as $row) {
            $leads[] = array(
                'id' => (int) $row->id,
                'name' => $row->name,
                'email' => $row->email,
                'phone' => $row->phone,
                'event_name' => $row->event_name,
                'message' => $row->message,
                'source' => $row->source,
                'status' => $row->status,
                'created_at' => $row->created_at
            );
        }

        $this->respond(array(
            'leads' => $leads,
            'statuses' => self::STATUSES,
            'pagination' => array(
                'page' => $page,
                'per_page' => $per_page,
                'total' => $total,
                'total_pages' => $total_pages
            )
        ));
    }

    public function lead($id = 0)
    {
        if ($this->require_admin() === NULL) {
            return;
        }

        if (!$this->only_methods(array('PATCH', 'PUT', 'POST', 'DELETE'))) {
            return;
        }

        if (!$this->require_csrf()) {
            return;
        }

        if (!$this->db->table_exists('leads')) {
            $this->fail('Tabel leads belum ada.', 503);
            return;
        }

        $row = $this->db->get_where('leads', array('id' => (int) $id))->row();

        if (!$row) {
            $this->fail('Lead tidak ditemukan.', 404);
            return;
        }

        if ($this->method() === 'DELETE') {
            $this->db->where('id', (int) $id)->delete('leads');
            $this->audit('lead.delete', 'lead', (int) $id, $row->email);
            $this->respond(array('deleted' => TRUE));
            return;
        }

        $payload = $this->payload();
        $status = isset($payload['status']) ? (string) $payload['status'] : '';

        if (!in_array($status, self::STATUSES, TRUE)) {
            $this->fail('Status tidak dikenal.', 422);
            return;
        }

        $this->db->where('id', (int) $id)->update('leads', array('status' => $status));
        $this->audit('lead.status', 'lead', (int) $id, $status);

        $this->respond(array('id' => (int) $id, 'status' => $status));
    }
}
