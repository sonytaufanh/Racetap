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
    /**
     * Default OCR rule: digits only (letters are still mapped to their digit
     * look-alikes by the resolver) and the legacy 3-6 digit range. Set
     * `digits` to an exact count to pin the bib length of an event.
     */
    const DEFAULT_OCR_RULE = array('digitsOnly' => TRUE, 'digits' => 0);
    const MAX_OCR_DIGITS = 12;

    private $tables_ready = NULL;
    private $photo_bibs_ready = NULL;
    private $ocr_rule_ready = NULL;
    private $known_bibs_cache = array();

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

    public function has_photo_bibs()
    {
        if ($this->photo_bibs_ready === NULL) {
            $this->photo_bibs_ready = $this->has_tables() && $this->db->table_exists('photo_bibs');
        }

        return $this->photo_bibs_ready;
    }

    /** True once `php index.php tools migrate` added photo_events.ocr_rule. */
    public function has_ocr_rule()
    {
        if ($this->ocr_rule_ready === NULL) {
            $this->ocr_rule_ready = $this->has_tables() && $this->db->field_exists('ocr_rule', 'photo_events');
        }

        return $this->ocr_rule_ready;
    }

    /**
     * Whitelist + clamp an OCR rule payload. `digits` = 0 means "any length in
     * the legacy 3-6 range"; 1-12 pins the exact number of digits a bib has.
     */
    public function normalize_ocr_rule($raw)
    {
        if (is_string($raw) && $raw !== '') {
            $decoded = json_decode($raw, TRUE);
            $raw = is_array($decoded) ? $decoded : array();
        }

        if (!is_array($raw)) {
            $raw = array();
        }

        $digits = isset($raw['digits']) ? (int) $raw['digits'] : 0;

        if ($digits < 0) {
            $digits = 0;
        }

        if ($digits > self::MAX_OCR_DIGITS) {
            $digits = self::MAX_OCR_DIGITS;
        }

        return array(
            'digitsOnly' => array_key_exists('digitsOnly', $raw) ? (bool) $raw['digitsOnly'] : self::DEFAULT_OCR_RULE['digitsOnly'],
            'digits' => $digits
        );
    }

    /** Effective OCR rule for an event (defaults when unset or not migrated). */
    public function ocr_rule($event_id)
    {
        $event_id = (int) $event_id;

        if ($event_id < 1 || !$this->has_ocr_rule()) {
            return self::DEFAULT_OCR_RULE;
        }

        $row = $this->db->select('ocr_rule')->where('id', $event_id)->get('photo_events')->row_array();

        if (!$row || empty($row['ocr_rule'])) {
            return self::DEFAULT_OCR_RULE;
        }

        return $this->normalize_ocr_rule($row['ocr_rule']);
    }

    public function events($include_inactive = FALSE, $indexed_only = FALSE)
    {
        if (!$this->has_tables()) {
            return $this->Photo_model->all_events();
        }

        $where = $include_inactive ? '1 = 1' : 'e.is_active = 1';
        $indexed = $indexed_only ? ' AND p.ocr_indexed_at IS NOT NULL' : '';
        $indexed_join = $indexed_only ? ' AND pi.ocr_indexed_at IS NOT NULL' : '';

        $bib_count_sql = $this->has_photo_bibs()
            ? "(SELECT COUNT(DISTINCT pb.bib) FROM photo_bibs pb JOIN photos pi ON pi.id = pb.photo_id WHERE pi.event_id = e.id{$indexed_join})"
            : "(SELECT COUNT(DISTINCT p.bib) FROM photos p WHERE p.event_id = e.id AND p.bib IS NOT NULL AND p.bib <> ''{$indexed})";

        $sql = "SELECT e.*,
                    (SELECT COUNT(*) FROM photos p WHERE p.event_id = e.id{$indexed}) AS photo_count,
                    {$bib_count_sql} AS bib_count,
                    (SELECT COUNT(*) FROM photos p WHERE p.event_id = e.id AND p.ocr_indexed_at IS NOT NULL) AS ocr_indexed
                FROM photo_events e
                WHERE $where
                ORDER BY e.event_date DESC, e.id DESC";

        $rows = $this->db->query($sql)->result_array();

        return array_map(array($this, 'normalize_event'), $rows);
    }

    public function stats($indexed_only = FALSE)
    {
        $stats = array('events' => 0, 'photos' => 0, 'bibs' => 0, 'ocr_indexed' => 0);

        foreach ($this->events(FALSE, $indexed_only) as $event) {
            $stats['events']++;
            $stats['photos'] += (int) $event['photo_count'];
            $stats['bibs'] += (int) $event['bib_count'];
            $stats['ocr_indexed'] += (int) $event['ocr_indexed'];
        }

        return $stats;
    }

    /**
     * Public event lookup. Only photos that have gone through OCR are returned
     * (ocr_indexed_at set), even when the bib itself was not detected.
     */
    public function get_event_by_slug($slug, $bib = '', $indexed_only = TRUE)
    {
        if (!$this->has_tables()) {
            $event = $this->Photo_model->get_event_by_slug($slug);

            if (!$event) {
                return NULL;
            }

            $photos = isset($event['photos']) ? $event['photos'] : array();

            if ($indexed_only) {
                $photos = array_values(array_filter($photos, function ($photo) {
                    return (isset($photo['bib']) && $photo['bib'] !== '')
                        || (isset($photo['ocr_text']) && $photo['ocr_text'] !== '')
                        || (isset($photo['ocr_source']) && $photo['ocr_source'] !== '');
                }));
            }

            $digits = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) $bib));

            if ($digits !== '') {
                $photos = $this->Photo_model->search_photos(array('photos' => $photos), $digits);
            }

            $event['photos'] = $photos;
            $event['match_count'] = count($photos);

            return $event;
        }

        $row = $this->db->where('slug', $slug)->get('photo_events')->row_array();

        if (!$row) {
            return NULL;
        }

        $photos = $this->photos_for_event((int) $row['id'], $bib, $indexed_only);
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

    public function photos_for_event($event_id, $bib = '', $indexed_only = FALSE)
    {
        $this->db->where('event_id', (int) $event_id);

        if ($indexed_only) {
            $this->db->where('ocr_indexed_at IS NOT NULL', NULL, FALSE);
        }

        $digits = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) $bib));

        if ($digits !== '') {
            if ($this->has_photo_bibs()) {
                $like = $this->db->escape_like_str($digits);

                $this->db->group_start()
                    ->where(
                        "EXISTS (SELECT 1 FROM photo_bibs pb WHERE pb.photo_id = photos.id AND pb.bib LIKE '%{$like}%' ESCAPE '!')",
                        NULL,
                        FALSE
                    )
                    ->or_like('bib', $digits)
                    ->group_end();
            } else {
                $this->db->group_start()
                    ->like('bib', $digits)
                    ->or_like('ocr_text', $digits)
                    ->group_end();
            }
        }

        $this->db->order_by('captured_at', 'ASC')->order_by('id', 'ASC');

        $rows = $this->db->get('photos')->result_array();
        $photos = array_map(array($this, 'normalize_photo'), $rows);

        return $this->attach_bibs($photos);
    }

    public function find_photo($id)
    {
        if (!$this->has_tables()) {
            return NULL;
        }

        $row = $this->db->where('id', (int) $id)->get('photos')->row_array();

        if (!$row) {
            return NULL;
        }

        $photos = $this->attach_bibs(array($this->normalize_photo($row)));

        return $photos[0];
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

        if ($this->has_ocr_rule() && array_key_exists('ocr_rule', $payload)) {
            $data['ocr_rule'] = json_encode(
                $this->normalize_ocr_rule($payload['ocr_rule']),
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            );
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

        if (array_key_exists('bibs', $payload)) {
            $bibs = $this->sanitize_bibs($payload['bibs']);

            $data['bib'] = !empty($bibs) ? $bibs[0] : NULL;
            $data['ocr_text'] = !empty($bibs) ? implode(' ', $bibs) : ($payload['ocr_text'] ?? NULL);

            if (!array_key_exists('ocr_source', $data)) {
                $data['ocr_source'] = 'manual';
            }

            $data['ocr_indexed_at'] = date('Y-m-d H:i:s');
        } else {
            if (array_key_exists('bib', $payload) && !array_key_exists('ocr_text', $payload)) {
                $data['ocr_text'] = $payload['bib'];
            }

            if (array_key_exists('bib', $payload) || array_key_exists('ocr_text', $payload) || array_key_exists('ocr_source', $payload)) {
                $data['ocr_indexed_at'] = date('Y-m-d H:i:s');
            }
        }

        $this->db->where('id', (int) $id)->update('photos', $data);

        if (array_key_exists('bibs', $payload)) {
            $this->replace_photo_bibs((int) $id, $this->sanitize_bibs($payload['bibs']), 'manual', 0);
        }

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

    public function save_ocr($photo_id, $bib, $text, $confidence, $source, $bibs = NULL)
    {
        if (!$this->has_tables()) {
            return FALSE;
        }

        $primary = $bib !== '' ? $bib : (is_array($bibs) && !empty($bibs) ? $bibs[0] : '');

        $this->db->where('id', (int) $photo_id)->update('photos', array(
            'bib' => $primary !== '' ? $primary : NULL,
            'ocr_text' => $text !== '' ? $text : ($primary !== '' ? $primary : NULL),
            'ocr_confidence' => (float) $confidence,
            'ocr_source' => (string) $source,
            'ocr_indexed_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ));

        if ($bibs !== NULL) {
            $this->replace_photo_bibs((int) $photo_id, $this->sanitize_bibs($bibs), $source, (float) $confidence);
        }

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

    /**
     * Known bib numbers for a photo event, taken from the race results that
     * share the same slug. Used to validate OCR candidates (multi-bib).
     */
    public function known_bibs($event_id)
    {
        $event_id = (int) $event_id;

        if (array_key_exists($event_id, $this->known_bibs_cache)) {
            return $this->known_bibs_cache[$event_id];
        }

        $this->known_bibs_cache[$event_id] = array();

        if (!$this->has_tables() || !$this->db->table_exists('race_results') || !$this->db->table_exists('race_events')) {
            return array();
        }

        $event = $this->db->select('slug')->where('id', $event_id)->get('photo_events')->row_array();

        if (!$event || empty($event['slug'])) {
            return array();
        }

        $rows = $this->db
            ->select('r.bib')
            ->from('race_results r')
            ->join('race_events e', 'e.id = r.race_id', 'inner')
            ->where('e.slug', $event['slug'])
            ->where('r.bib IS NOT NULL', NULL, FALSE)
            ->where('r.bib <>', '')
            ->group_by('r.bib')
            ->get()
            ->result_array();

        $bibs = array();

        foreach ($rows as $row) {
            $bib = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) $row['bib']));

            if ($bib !== '') {
                $bibs[$bib] = $bib;
            }
        }

        $this->known_bibs_cache[$event_id] = array_values($bibs);

        return $this->known_bibs_cache[$event_id];
    }

    public function sanitize_bibs($value)
    {
        if (is_string($value)) {
            $value = preg_split('/[\s,;]+/', $value);
        }

        if (!is_array($value)) {
            return array();
        }

        $bibs = array();

        foreach ($value as $item) {
            $bib = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) $item));

            if ($bib !== '' && strlen($bib) <= 32) {
                $bibs[$bib] = $bib;
            }
        }

        return array_slice(array_values($bibs), 0, 12);
    }

    public function replace_photo_bibs($photo_id, $bibs, $source = 'ocr', $confidence = 0)
    {
        if (!$this->has_photo_bibs()) {
            return FALSE;
        }

        $photo_id = (int) $photo_id;
        $bibs = $this->sanitize_bibs($bibs);

        $this->db->where('photo_id', $photo_id)->delete('photo_bibs');

        if (empty($bibs)) {
            return TRUE;
        }

        $now = date('Y-m-d H:i:s');
        $rows = array();

        foreach ($bibs as $bib) {
            $rows[] = array(
                'photo_id' => $photo_id,
                'bib' => $bib,
                'confidence' => (float) $confidence,
                'source' => (string) $source,
                'created_at' => $now
            );
        }

        $this->db->insert_batch('photo_bibs', $rows);

        return TRUE;
    }

    private function attach_bibs(array $photos)
    {
        if (!$this->has_photo_bibs() || empty($photos)) {
            return $photos;
        }

        $ids = array();

        foreach ($photos as $photo) {
            $ids[] = (int) $photo['id'];
        }

        $rows = $this->db
            ->select('photo_id, bib')
            ->where_in('photo_id', $ids)
            ->order_by('confidence', 'DESC')
            ->order_by('id', 'ASC')
            ->get('photo_bibs')
            ->result_array();

        $map = array();

        foreach ($rows as $row) {
            $map[(int) $row['photo_id']][] = (string) $row['bib'];
        }

        foreach ($photos as &$photo) {
            $photo['bibs'] = isset($map[(int) $photo['id']]) ? $map[(int) $photo['id']] : array();
        }

        return $photos;
    }

    private function counts_for_event($event_id)
    {
        $bib_sql = $this->has_photo_bibs()
            ? "(SELECT COUNT(DISTINCT pb.bib) FROM photo_bibs pb JOIN photos pi ON pi.id = pb.photo_id WHERE pi.event_id = ?) AS bib_count"
            : "(SELECT COUNT(DISTINCT p.bib) FROM photos p WHERE p.event_id = ? AND p.bib IS NOT NULL AND p.bib <> '') AS bib_count";

        $sql = "SELECT
                    (SELECT COUNT(*) FROM photos p WHERE p.event_id = ?) AS photo_count,
                    {$bib_sql},
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
            'ocr_rule' => $this->normalize_ocr_rule(isset($row['ocr_rule']) ? $row['ocr_rule'] : NULL),
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
            'ocr_indexed_at' => isset($row['ocr_indexed_at']) ? (string) $row['ocr_indexed_at'] : '',
            'captured_at' => isset($row['captured_at']) ? (string) $row['captured_at'] : '',
            'category' => isset($row['category']) ? (string) $row['category'] : '',
            'bibs' => array()
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
