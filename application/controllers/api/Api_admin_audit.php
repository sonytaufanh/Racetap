<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/Api_controller.php';

/**
 * Read-only audit trail of admin mutations.
 */
class Api_admin_audit extends Api_controller
{
    public function index()
    {
        if ($this->require_admin() === NULL) {
            return;
        }

        if (!$this->only_methods(array('GET'))) {
            return;
        }

        if (!$this->db->table_exists('audit_log')) {
            $this->respond(array('entries' => array(), 'pagination' => array(
                'page' => 1, 'per_page' => 50, 'total' => 0, 'total_pages' => 1
            )));
            return;
        }

        $page = max(1, (int) $this->input->get('page'));
        $per_page = (int) $this->input->get('per_page');
        $per_page = in_array($per_page, array(25, 50, 100, 200), TRUE) ? $per_page : 50;
        $entity = trim((string) $this->input->get('entity', TRUE));

        if ($entity !== '') {
            $this->db->where('entity', $entity);
        }

        $total = (int) $this->db->count_all_results('audit_log');
        $total_pages = max(1, (int) ceil($total / $per_page));
        $page = min($page, $total_pages);

        if ($entity !== '') {
            $this->db->where('entity', $entity);
        }

        $rows = $this->db
            ->order_by('id', 'DESC')
            ->limit($per_page, ($page - 1) * $per_page)
            ->get('audit_log')
            ->result();

        $entries = array();

        foreach ($rows as $row) {
            $entries[] = array(
                'id' => (int) $row->id,
                'admin_username' => $row->admin_username,
                'action' => $row->action,
                'entity' => $row->entity,
                'entity_id' => $row->entity_id,
                'detail' => $row->detail,
                'ip' => $row->ip,
                'created_at' => $row->created_at
            );
        }

        $this->respond(array(
            'entries' => $entries,
            'pagination' => array(
                'page' => $page,
                'per_page' => $per_page,
                'total' => $total,
                'total_pages' => $total_pages
            )
        ));
    }
}
