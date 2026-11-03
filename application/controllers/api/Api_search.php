<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/Api_controller.php';

/**
 * Cross-event athlete search over the race_results index.
 *
 * Populate the index with: php index.php tools index_results
 */
class Api_search extends Api_controller
{
    public function index()
    {
        if (!$this->only_methods(array('GET'))) {
            return;
        }

        if (!$this->rate_limit('search', 30, 60)) {
            return;
        }

        $query = trim((string) $this->input->get('q', TRUE));
        $limit = (int) $this->input->get('limit');
        $limit = $limit > 0 ? min($limit, 50) : 20;

        if (mb_strlen($query) < 2) {
            $this->respond(array('query' => $query, 'results' => array(), 'truncated' => FALSE));
            return;
        }

        if (!$this->db->table_exists('race_results')) {
            $this->respond(array('query' => $query, 'results' => array(), 'truncated' => FALSE));
            return;
        }

        $rows = $this->db
            ->select('r.name, r.bib, r.category, r.gender, r.age_group, r.gun_time, r.net_time, r.overall_rank, e.slug AS race_slug, e.name AS race_name')
            ->from('race_results r')
            ->join('race_events e', 'e.id = r.race_id', 'inner')
            ->group_start()
            ->like('r.name', $query)
            ->or_like('r.bib', $query)
            ->group_end()
            ->order_by('r.name', 'ASC')
            ->limit($limit + 1, 0)
            ->get()
            ->result();

        $truncated = count($rows) > $limit;

        if ($truncated) {
            array_pop($rows);
        }

        $results = array();

        foreach ($rows as $row) {
            $results[] = array(
                'name' => (string) $row->name,
                'bib' => (string) $row->bib,
                'category' => (string) $row->category,
                'gender' => (string) $row->gender,
                'age_group' => (string) $row->age_group,
                'gun_time' => (string) $row->gun_time,
                'net_time' => (string) $row->net_time,
                'overall_rank' => $row->overall_rank !== NULL ? (int) $row->overall_rank : NULL,
                'race_slug' => (string) $row->race_slug,
                'race_name' => (string) $row->race_name
            );
        }

        $this->respond(array(
            'query' => $query,
            'results' => $results,
            'truncated' => $truncated
        ));
    }
}
