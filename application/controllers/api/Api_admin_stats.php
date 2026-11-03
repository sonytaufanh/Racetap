<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/Api_controller.php';

/**
 * Dashboard KPIs and recent activity for the admin home screen.
 */
class Api_admin_stats extends Api_controller
{
    public function index()
    {
        if ($this->require_admin() === NULL) {
            return;
        }

        if (!$this->only_methods(array('GET'))) {
            return;
        }

        $stats = array(
            'photo_events' => (int) $this->db->count_all('photo_events'),
            'photos' => (int) $this->db->count_all('photos'),
            'photos_with_bib' => (int) $this->db->where('bib IS NOT NULL', NULL, FALSE)->where('bib !=', '')->count_all_results('photos'),
            'ocr_indexed' => (int) $this->db->where('ocr_indexed_at IS NOT NULL', NULL, FALSE)->count_all_results('photos'),
            'races' => (int) $this->db->count_all('race_events'),
            'race_results' => (int) $this->db->count_all('race_results'),
            'leads_new' => 0
        );

        if ($this->db->table_exists('leads')) {
            $stats['leads_new'] = (int) $this->db->where('status', 'new')->count_all_results('leads');
        }

        $syncs = $this->db
            ->select('id, name, slug, is_active, last_sync_status, last_sync_at, last_sync_message, last_sync_count')
            ->order_by('last_sync_at', 'DESC')
            ->limit(5)
            ->get('race_events')
            ->result();

        $recent = array();

        if ($this->db->table_exists('audit_log')) {
            $recent = $this->db
                ->select('admin_username, action, entity, entity_id, detail, created_at')
                ->order_by('id', 'DESC')
                ->limit(12)
                ->get('audit_log')
                ->result();
        }

        $this->respond(array(
            'stats' => $stats,
            'recent_syncs' => array_map(array($this, 'sync_row'), $syncs),
            'recent_activity' => $recent
        ));
    }

    private function sync_row($row)
    {
        return array(
            'id' => (int) $row->id,
            'name' => $row->name,
            'slug' => $row->slug,
            'is_active' => (int) $row->is_active,
            'last_sync_status' => $row->last_sync_status,
            'last_sync_at' => $row->last_sync_at,
            'last_sync_message' => $row->last_sync_message,
            'last_sync_count' => $row->last_sync_count !== NULL ? (int) $row->last_sync_count : NULL
        );
    }
}
