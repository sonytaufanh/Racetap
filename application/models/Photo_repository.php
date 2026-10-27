<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Data access for the photo library.
 *
 * Uses MySQL when the new tables exist and transparently falls back to the
 * legacy assets/data/photos.json seed so the old PHP pages keep working
 * before the migration is applied.
 */
class Photo_repository extends CI_Model
{
    private $tables_ready = NULL;

    public function __construct()
    {
        parent::__construct();
        $this->load->database();
        $this->load->model('Photo_model');
    }

    public function has_tables()
    {
        if ($this->tables_ready !== NULL) {
            return $this->tables_ready;
        }

        $this->tables_ready = $this->db->table_exists('photo_events') && $this->db->table_exists('photos');

        return $this->tables_ready;
    }

    public function events($include_inactive = FALSE)
    {
        if (!$this->has_tables()) {
            return $this->Photo_model->all_events();
        }

        $where = $include_inactive ? '1 = 1' : 'e.is_active = 1';

        $sql = "SELECT e.*,
                    (SELECT COUNT(*) FROM photos p WHERE p.event_id = e.id) AS photo_count,
                    (SELECT COUNT(DISTINCT p.bib) FROM photos p WHERE p.event_id = e.id AND p.bib IS NOT NULL AND p.bib <> '') AS bib_count,
                    (SELECT COUNT(*) FROM photos p WHERE p.event_id = e.id AND ((p.bib IS NOT NULL AND p.bib <> '') OR (p.ocr_text IS NOT NULL AND p.ocr_text <> ''))) AS ocr_indexed
                FROM photo_events e
                WHERE $where
                ORDER BY e.event_date DESC, e.id DESC";

        $rows = $this->db->query($sql)->result_array();

        return array_map(array($this, 'normalize_event'), $rows);
    }

    public function stats()
    {
        $stats = array('events' => 0, 'photos' => 0, 'bibs' => 0, 'ocr_indexed' => 0);

        foreach ($this->events() as $event) {
            $stats['events']++;
            $stats['photos'] += (int) $event['photo_count'];
            $stats['bibs'] += (int) $event['bib_count'];
            $stats['ocr_indexed'] += (int) $event['ocr_indexed'];
        }

        return $stats;
    }

    public function get_event_by_slug($slug, $bib = '')
    {
        if (!$this->has_tables()) {
            $event = $this->Photo_model->get_event_by_slug($slug);

            if (!$event) {
                return NULL;
            }

            $digits = preg_replace('/[^0-9]/', '', (string) $bib);

            if ($digits !== '') {
                $event['photos'] = $this->Photo_model->search_photos($event, $digits);
                $event['match_count'] = count($event['photos']);
            } else {
                $event['match_count'] = count($event['photos']);
            }

            return $event;
        }

        $row = $this->db->where('slug', $slug)->get('photo_events')->row_array();

        if (!$row) {
            return NULL;
        }

        $photos = $this->photos_for_event((int) $row['id'], $bib);
        $event = $this->normalize_event($row + $this->counts_for_event((int) $row['id']));
        $event['photos'] = $photos;
        $event['match_count'] = count($photos);

        return $event;
    }

    public function get_event($id)
    {
        if (!$this->has_tables()) {
            return NULL;
        }

        $row = $this->db->where('id', (int) $id)->get('photo_events')->row_array();

        if (!$row) {
            return NULL;
        }

        $event = $this->normalize_event($row + $this->counts_for_event((int) $row['id']));
        $event['photos'] = $this->photos_for_event((int) $row['id']);

        return $event;
    }

    public function photos_for_event($event_id, $bib = '')
    {
        $this->db->where('event_id', (int) $event_id);
        $digits = preg_replace('/[^0-9]/', '', (string) $bib);

        if ($digits !== '') {
            $this->db->group_start()
                ->like('bib', $digits)
                ->or_like('ocr_text', $digits)
                ->group_end();
        }

        $this->db->order_by('captured_at', 'ASC')->order_by('id', 'ASC');

        $rows = $this->db->get('photos')->result_array();

        return array_map(array($this, 'normalize_photo'), $rows);
    }

    public function find_photo($id)
    {
        if (!$this->has_tables()) {
            return NULL;
        }

        $row = $this->db->where('id', (int) $id)->get('photos')->row_array();

        return $row ? $this->normalize_photo($row) : NULL;
    }

    public function save_event($payload, $id = NULL)
    {
        if (!$this->has_tables()) {
            return array('ok' => FALSE, 'error' => 'Tabel photo_events belum tersedia. Jalankan migration terlebih dahulu.');
        }

        $name = trim((string) (isset($payload['name']) ? $payload['name'] : ''));

        if ($name === '') {
            return array('ok' => FALSE, 'error' => 'Nama event wajib diisi.');
        }

        $now = date('Y-m-d H:i:s');
        $slug_source = !empty($payload['slug']) ? $payload['slug'] : $name;

        $data = array(
            'name' => $name,
            'slug' => $this->unique_slug($slug_source, $id),
            'location' => trim((string) (isset($payload['location']) ? $payload['location'] : '')),
            'event_date' => !empty($payload['event_date']) ? $payload['event_date'] : NULL,
            'description' => isset($payload['description']) ? (string) $payload['description'] : '',
            'photographer' => isset($payload['photographer']) ? (string) $payload['photographer'] : '',
            'is_active' => isset($payload['is_active']) ? (int) (bool) $payload['is_active'] : 1,
            'updated_at' => $now
        );

        if (!empty($payload['cover'])) {
            $data['cover'] = (string) $payload['cover'];
        }

        if ($id === NULL) {
            $data['created_at'] = $now;

            if (empty($data['cover'])) {
                $data['cover'] = '';
            }

            $this->db->insert('photo_events', $data);

            return array('ok' => TRUE, 'id' => (int) $this->db->insert_id());
        }

        $this->db->where('id', (int) $id)->update('photo_events', $data);

        return array('ok' => TRUE, 'id' => (int) $id);
    }

    public function delete_event($id)
    {
        if (!$this->has_tables()) {
            return FALSE;
        }

        $this->db->where('id', (int) $id)->delete('photo_events');

        return $this->db->affected_rows() > 0;
    }

    public function add_photo($event_id, $data)
    {
        if (!$this->has_tables()) {
            return array('ok' => FALSE, 'error' => 'Tabel photos belum tersedia.');
        }

        $now = date('Y-m-d H:i:s');
        $bib = isset($data['bib']) ? trim((string) $data['bib']) : '';

        $row = array(
            'event_id' => (int) $event_id,
            'file' => (string) $data['file'],
            'bib' => $bib !== '' ? $bib : NULL,
            'ocr_text' => $bib !== '' ? $bib : NULL,
            'ocr_confidence' => isset($data['ocr_confidence']) ? (float) $data['ocr_confidence'] : 0,
            'ocr_source' => isset($data['ocr_source']) ? (string) $data['ocr_source'] : 'manual',
            'ocr_indexed_at' => $bib !== '' ? $now : NULL,
            'captured_at' => isset($data['captured_at']) ? (string) $data['captured_at'] : '',
            'category' => isset($data['category']) ? (string) $data['category'] : '',
            'original_name' => isset($data['original_name']) ? (string) $data['original_name'] : '',
            'mime' => isset($data['mime']) ? (string) $data['mime'] : '',
            'size_bytes' => isset($data['size_bytes']) ? (int) $data['size_bytes'] : 0,
            'width' => isset($data['width']) ? (int) $data['width'] : 0,
            'height' => isset($data['height']) ? (int) $data['height'] : 0,
            'created_at' => $now,
            'updated_at' => $now
        );

        $this->db->insert('photos', $row);

        return array('ok' => TRUE, 'id' => (int) $this->db->insert_id());
    }

    public function update_photo($id, $payload)
    {
        if (!$this->has_tables()) {
            return array('ok' => FALSE, 'error' => 'Tabel photos belum tersedia.');
        }

        $allowed = array('bib', 'ocr_text', 'ocr_confidence', 'ocr_source', 'captured_at', 'category');
        $data = array('updated_at' => date('Y-m-d H:i:s'));

        foreach ($allowed as $field) {
            if (array_key_exists($field, $payload)) {
                $data[$field] = $payload[$field];
            }
        }

        if (array_key_exists('bib', $payload) && !array_key_exists('ocr_text', $payload)) {
            $data['ocr_text'] = $payload['bib'];
        }

        if (array_key_exists('bib', $payload) || array_key_exists('ocr_text', $payload)) {
            $data['ocr_indexed_at'] = date('Y-m-d H:i:s');
        }

        $this->db->where('id', (int) $id)->update('photos', $data);

        return array('ok' => TRUE, 'id' => (int) $id);
    }

    public function delete_photo($id)
    {
        if (!$this->has_tables()) {
            return FALSE;
        }

        $this->db->where('id', (int) $id)->delete('photos');

        return $this->db->affected_rows() > 0;
    }

    public function save_ocr($photo_id, $bib, $text, $confidence, $source)
    {
        if (!$this->has_tables()) {
            return FALSE;
        }

        $this->db->where('id', (int) $photo_id)->update('photos', array(
            'bib' => $bib !== '' ? $bib : NULL,
            'ocr_text' => $text !== '' ? $text : NULL,
            'ocr_confidence' => (float) $confidence,
            'ocr_source' => (string) $source,
            'ocr_indexed_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ));

        return TRUE;
    }

    public function log_ocr($photo_id, $event_id, $source, $status, $bib, $confidence, $raw_text, $error)
    {
        if (!$this->has_tables() || !$this->db->table_exists('photo_ocr_logs')) {
            return FALSE;
        }

        $this->db->insert('photo_ocr_logs', array(
            'photo_id' => $photo_id !== NULL ? (int) $photo_id : NULL,
            'event_id' => $event_id !== NULL ? (int) $event_id : NULL,
            'source' => (string) $source,
            'status' => (string) $status,
            'bib' => $bib !== '' ? $bib : NULL,
            'confidence' => (float) $confidence,
            'raw_text' => $raw_text,
            'error' => $error,
            'created_at' => date('Y-m-d H:i:s')
        ));

        return TRUE;
    }

    private function counts_for_event($event_id)
    {
        $sql = "SELECT
                    (SELECT COUNT(*) FROM photos p WHERE p.event_id = ?) AS photo_count,
                    (SELECT COUNT(DISTINCT p.bib) FROM photos p WHERE p.event_id = ? AND p.bib IS NOT NULL AND p.bib <> '') AS bib_count,
                    (SELECT COUNT(*) FROM photos p WHERE p.event_id = ? AND ((p.bib IS NOT NULL AND p.bib <> '') OR (p.ocr_text IS NOT NULL AND p.ocr_text <> ''))) AS ocr_indexed";

        $row = $this->db->query($sql, array((int) $event_id, (int) $event_id, (int) $event_id))->row_array();

        return is_array($row) ? $row : array('photo_count' => 0, 'bib_count' => 0, 'ocr_indexed' => 0);
    }

    private function normalize_event($row)
    {
        return array(
            'id' => isset($row['id']) ? (int) $row['id'] : 0,
            'slug' => isset($row['slug']) ? (string) $row['slug'] : '',
            'name' => isset($row['name']) ? (string) $row['name'] : '',
            'location' => isset($row['location']) ? (string) $row['location'] : '',
            'event_date' => isset($row['event_date']) ? (string) $row['event_date'] : '',
            'cover' => isset($row['cover']) ? (string) $row['cover'] : '',
            'description' => isset($row['description']) ? (string) $row['description'] : '',
            'photographer' => isset($row['photographer']) ? (string) $row['photographer'] : '',
            'is_active' => isset($row['is_active']) ? (int) $row['is_active'] : 1,
            'photo_count' => isset($row['photo_count']) ? (int) $row['photo_count'] : 0,
            'bib_count' => isset($row['bib_count']) ? (int) $row['bib_count'] : 0,
            'ocr_indexed' => isset($row['ocr_indexed']) ? (int) $row['ocr_indexed'] : 0
        );
    }

    private function normalize_photo($row)
    {
        return array(
            'id' => isset($row['id']) ? (int) $row['id'] : 0,
            'file' => isset($row['file']) ? (string) $row['file'] : '',
            'bib' => isset($row['bib']) ? (string) $row['bib'] : '',
            'ocr_text' => isset($row['ocr_text']) ? (string) $row['ocr_text'] : '',
            'ocr_confidence' => isset($row['ocr_confidence']) ? (float) $row['ocr_confidence'] : 0,
            'ocr_source' => isset($row['ocr_source']) ? (string) $row['ocr_source'] : '',
            'captured_at' => isset($row['captured_at']) ? (string) $row['captured_at'] : '',
            'category' => isset($row['category']) ? (string) $row['category'] : ''
        );
    }

    private function unique_slug($value, $exclude_id = NULL)
    {
        $base = $this->slugify($value);
        $slug = $base;
        $suffix = 2;

        while (TRUE) {
            $this->db->where('slug', $slug);

            if ($exclude_id !== NULL) {
                $this->db->where('id !=', (int) $exclude_id);
            }

            if ($this->db->count_all_results('photo_events') === 0) {
                return $slug;
            }

            $slug = $base . '-' . $suffix;
            $suffix++;
        }
    }

    private function slugify($value)
    {
        $slug = strtolower(trim((string) $value));
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
        $slug = trim($slug, '-');

        return $slug === '' ? 'event' : substr($slug, 0, 180);
    }
}
