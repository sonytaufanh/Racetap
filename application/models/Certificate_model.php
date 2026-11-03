<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Per-event e-certificate templates.
 *
 * Artifacts live next to the published results so the static viewer can read
 * them without an API round-trip and without a database migration:
 *
 *   results/<slug>/certificate.json   field positions + styling (authored in the admin)
 *   results/<slug>/certificate.png    uploaded template image (jpg/png/webp)
 *
 * The public viewer fetches certificate.json, draws the template + participant
 * values on a canvas (so the admin preview and the downloaded file are always
 * identical) and exports PNG or PDF in the browser. Nothing is rendered here.
 */
class Certificate_model extends CI_Model
{
    const CONFIG_FILE = 'certificate.json';
    const TEMPLATE_BASE = 'certificate';
    const MAX_TEMPLATE_BYTES = 8388608; // 8 MB
    const MAX_FIELDS = 80;
    const MAX_SAMPLE = 500;

    /** Dynamic values the renderer understands. Keep in sync with web/src/certificate/tokens.ts. */
    private $tokens = array(
        'name',
        'bib',
        'gender',
        'genderShort',
        'distance',
        'ageGroup',
        'ageGroup2',
        'netTime',
        'gunTime',
        'finishTime',
        'startTime',
        'pace',
        'overallRank',
        'genderRank',
        'ageRank',
        'age2Rank',
        'status',
        'city',
        'team',
        'eventName',
        'eventDate',
        'eventTitle'
    );

    /** Font ids bundled in web/src/certificate/fonts.ts. */
    private $fonts = array(
        'playfair-display',
        'cormorant-garamond',
        'cinzel',
        'bodoni-moda',
        'great-vibes',
        'dancing-script',
        'montserrat',
        'inter',
        'oswald',
        'bebas-neue',
        'roboto-slab',
        'courier-prime',
        'georgia',
        'times-new-roman',
        'arial',
        'verdana',
        'trebuchet-ms',
        'impact',
        'courier-new'
    );

    private $mime_extensions = array(
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp'
    );

    // ----------------------------------------------------------------- listing

    /** Every published event that owns a results/<slug>/ directory. */
    public function events()
    {
        $root = $this->results_root();

        if ($root === NULL) {
            return array();
        }

        $names = $this->known_names();
        $rows = array();
        $handle = @opendir($root);

        if ($handle === FALSE) {
            return array();
        }

        while (($entry = readdir($handle)) !== FALSE) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }

            $dir = $root . DIRECTORY_SEPARATOR . $entry;

            if (!is_dir($dir) || !$this->valid_slug($entry)) {
                continue;
            }

            $config = $this->find($entry);
            $template = $config === NULL ? NULL : $this->template_file($entry, $config['template']);

            $rows[] = array(
                'slug' => $entry,
                'name' => isset($names[$entry]) ? $names[$entry] : $entry,
                'has_data' => is_file($dir . DIRECTORY_SEPARATOR . 'data.json'),
                'has_template' => $template !== NULL,
                'template' => $template,
                'template_url' => $template === NULL ? NULL : $this->template_url($entry, $template),
                'enabled' => $config === NULL ? FALSE : (bool) $config['enabled'],
                'only_finishers' => $config === NULL ? TRUE : (bool) $config['onlyFinishers'],
                'field_count' => $config === NULL ? 0 : count($config['fields']),
                'width' => $config === NULL ? NULL : (int) $config['width'],
                'height' => $config === NULL ? NULL : (int) $config['height'],
                'updated_at' => $config === NULL ? NULL : $this->file_time($dir . DIRECTORY_SEPARATOR . self::CONFIG_FILE)
            );
        }

        closedir($handle);

        usort($rows, function ($a, $b) {
            $by_name = strcasecmp($a['name'], $b['name']);

            return $by_name === 0 ? strcasecmp($a['slug'], $b['slug']) : $by_name;
        });

        return $rows;
    }

    // ------------------------------------------------------------------ config

    /** Stored config for an event, or NULL when it has no certificate yet. */
    public function find($slug)
    {
        $dir = $this->event_dir($slug);

        if ($dir === NULL) {
            return NULL;
        }

        $file = $dir . DIRECTORY_SEPARATOR . self::CONFIG_FILE;

        if (!is_file($file)) {
            return NULL;
        }

        $decoded = json_decode((string) @file_get_contents($file), TRUE);

        if (!is_array($decoded)) {
            return NULL;
        }

        return $this->normalize_config($decoded, $slug, $dir);
    }

    public function save_config($slug, $payload)
    {
        $dir = $this->event_dir($slug);

        if ($dir === NULL) {
            return array('ok' => FALSE, 'error' => 'Event tidak ditemukan pada folder results/.');
        }

        $existing = $this->find($slug);
        $payload = is_array($payload) ? $payload : array();

        // The artwork owns the canvas size: field coordinates only mean anything
        // relative to the real image, so the client never gets to declare it.
        $template = isset($payload['template'])
            ? (string) $payload['template']
            : ($existing === NULL ? '' : (string) $existing['template']);
        $size = $this->template_size($dir, $template);

        if ($size !== NULL) {
            $payload['width'] = $size['width'];
            $payload['height'] = $size['height'];
        }

        $config = $this->normalize_config($payload, $slug, $dir);

        if ($existing === NULL && $config['template'] === NULL) {
            return array('ok' => FALSE, 'error' => 'Unggah template sertifikat terlebih dahulu.');
        }

        if ($config['template'] === NULL) {
            $config['template'] = $existing['template'];
        }

        if ($existing !== NULL && $existing['template'] !== $config['template']) {
            $this->delete_template_files($dir);
        }

        $config['updatedAt'] = date('Y-m-d H:i:s');

        $written = @file_put_contents(
            $dir . DIRECTORY_SEPARATOR . self::CONFIG_FILE,
            json_encode($config, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n"
        );

        if ($written === FALSE) {
            return array('ok' => FALSE, 'error' => 'certificate.json tidak dapat ditulis (periksa izin folder).');
        }

        return array('ok' => TRUE, 'config' => $config);
    }

    // ---------------------------------------------------------------- template

    public function store_template($slug, $file)
    {
        $dir = $this->event_dir($slug);

        if ($dir === NULL) {
            return array('ok' => FALSE, 'error' => 'Event tidak ditemukan pada folder results/.');
        }

        if (!is_array($file) || !isset($file['error']) || $file['error'] !== UPLOAD_ERR_OK) {
            return array('ok' => FALSE, 'error' => 'Upload template gagal.');
        }

        if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            return array('ok' => FALSE, 'error' => 'File template tidak valid.');
        }

        if ((int) (isset($file['size']) ? $file['size'] : 0) > self::MAX_TEMPLATE_BYTES) {
            return array('ok' => FALSE, 'error' => 'Ukuran template melebihi 8 MB.');
        }

        // getimagesize() reads the real bytes, so a renamed script never passes.
        $info = @getimagesize($file['tmp_name']);

        if ($info === FALSE || empty($info['mime'])) {
            return array('ok' => FALSE, 'error' => 'File bukan gambar yang valid.');
        }

        $mime = (string) $info['mime'];

        if (!isset($this->mime_extensions[$mime])) {
            return array('ok' => FALSE, 'error' => 'Format template harus JPG, PNG, atau WebP.');
        }

        if ((int) $info[0] < 400 || (int) $info[1] < 400) {
            return array('ok' => FALSE, 'error' => 'Resolusi template minimal 400x400 piksel.');
        }

        if ((int) $info[0] > 12000 || (int) $info[1] > 12000) {
            return array('ok' => FALSE, 'error' => 'Resolusi template maksimal 12000x12000 piksel.');
        }

        $extension = $this->mime_extensions[$mime];
        $name = self::TEMPLATE_BASE . '.' . $extension;
        $target = $dir . DIRECTORY_SEPARATOR . $name;

        $this->delete_template_files($dir);

        if (!@move_uploaded_file($file['tmp_name'], $target)) {
            return array('ok' => FALSE, 'error' => 'Template gagal disimpan (periksa izin folder).');
        }

        @chmod($target, 0644);

        $config = $this->find($slug);
        $payload = $config === NULL ? array() : $config;
        $payload['template'] = $name;
        $payload['width'] = (int) $info[0];
        $payload['height'] = (int) $info[1];
        $payload['fields'] = isset($payload['fields']) ? $payload['fields'] : array();

        $saved = $this->save_config($slug, $payload);

        if (empty($saved['ok'])) {
            return $saved;
        }

        return array(
            'ok' => TRUE,
            'template' => $name,
            'template_url' => $this->template_url($slug, $name),
            'width' => (int) $info[0],
            'height' => (int) $info[1],
            'config' => $saved['config']
        );
    }

    /** Remove every certificate artifact for an event. */
    public function delete($slug)
    {
        $dir = $this->event_dir($slug);

        if ($dir === NULL) {
            return array('ok' => FALSE, 'error' => 'Event tidak ditemukan pada folder results/.');
        }

        $removed = array();
        $files = array_merge(array(self::CONFIG_FILE), $this->template_names());

        foreach ($files as $name) {
            $path = $dir . DIRECTORY_SEPARATOR . $name;

            if (is_file($path)) {
                @unlink($path);
                $removed[] = $name;
            }
        }

        return array('ok' => TRUE, 'removed' => $removed);
    }

    public function template_url($slug, $template)
    {
        return rtrim(base_url(), '/') . '/results/' . rawurlencode((string) $slug) . '/' . rawurlencode((string) $template);
    }

    // ------------------------------------------------------------------ sample

    /**
     * A slice of results/<slug>/data.json shaped exactly like the file the
     * public viewer reads, so the editor can reuse the viewer's own mapping
     * (parseScoresData) instead of duplicating it.
     */
    public function sample($slug, $query = '', $limit = 50)
    {
        $dir = $this->event_dir($slug);

        if ($dir === NULL) {
            return array('ok' => FALSE, 'error' => 'Event tidak ditemukan pada folder results/.');
        }

        $file = $dir . DIRECTORY_SEPARATOR . 'data.json';

        if (!is_file($file)) {
            return array('ok' => FALSE, 'error' => 'File data.json belum ada untuk event ini.');
        }

        $decoded = json_decode((string) @file_get_contents($file), TRUE);

        if (!is_array($decoded)) {
            return array('ok' => FALSE, 'error' => 'data.json tidak dapat dibaca.');
        }

        $race = isset($decoded['race']) && is_array($decoded['race']) ? $decoded['race'] : array();
        $scores = isset($decoded['scores']) && is_array($decoded['scores']) ? $decoded['scores'] : array();

        $total = count($scores);
        $term = mb_strtolower(trim((string) $query));

        if ($term !== '') {
            $scores = array_values(array_filter($scores, function ($score) use ($term) {
                if (!is_array($score)) {
                    return FALSE;
                }

                $name = mb_strtolower((string) (isset($score['name']) ? $score['name'] : ''));
                $bib = mb_strtolower((string) (isset($score['bib']) ? $score['bib'] : ''));

                return strpos($name, $term) !== FALSE || strpos($bib, $term) !== FALSE;
            }));
        }

        $limit = (int) $limit;
        $limit = $limit < 1 ? 50 : min($limit, self::MAX_SAMPLE);

        $items = isset($race['items']) && is_array($race['items']) ? $race['items'] : array();

        return array(
            'ok' => TRUE,
            'total' => $total,
            'matched' => count($scores),
            'race' => array(
                'title' => isset($race['title']) ? (string) $race['title'] : '',
                'date_time' => isset($race['date_time']) ? $race['date_time'] : NULL,
                'items' => $items
            ),
            'scores' => array_slice($scores, 0, $limit)
        );
    }

    // ----------------------------------------------------------------- helpers

    public function valid_slug($slug)
    {
        return (bool) preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]{0,189}$/', (string) $slug);
    }

    private function results_root()
    {
        $root = FCPATH . 'results';
        $real = realpath($root);

        return $real === FALSE ? NULL : $real;
    }

    /** Resolved directory for a slug, guaranteed to sit inside results/. */
    private function event_dir($slug)
    {
        if (!$this->valid_slug($slug) || strpos((string) $slug, '..') !== FALSE) {
            return NULL;
        }

        $root = $this->results_root();

        if ($root === NULL) {
            return NULL;
        }

        $dir = $root . DIRECTORY_SEPARATOR . $slug;
        $real = realpath($dir);

        if ($real === FALSE || !is_dir($real)) {
            return NULL;
        }

        if (strpos($real, $root . DIRECTORY_SEPARATOR) !== 0) {
            return NULL;
        }

        return $real;
    }

    private function template_names()
    {
        $names = array();

        foreach (array_unique(array_values($this->mime_extensions)) as $extension) {
            $names[] = self::TEMPLATE_BASE . '.' . $extension;
        }

        // Legacy/alias extension that some uploads use.
        $names[] = self::TEMPLATE_BASE . '.jpeg';

        return $names;
    }

    private function delete_template_files($dir)
    {
        foreach ($this->template_names() as $name) {
            $path = $dir . DIRECTORY_SEPARATOR . $name;

            if (is_file($path)) {
                @unlink($path);
            }
        }
    }

    private function template_file($slug, $template)
    {
        if (!is_string($template) || $template === '') {
            return NULL;
        }

        $dir = $this->event_dir($slug);

        if ($dir === NULL) {
            return NULL;
        }

        // Only the flat certificate.<ext> names are ever served.
        if (!in_array($template, $this->template_names(), TRUE)) {
            return NULL;
        }

        $path = $dir . DIRECTORY_SEPARATOR . $template;

        return is_file($path) ? $template : NULL;
    }

    /** Real pixel size of the stored template, or NULL when there is none. */
    private function template_size($dir, $template)
    {
        $name = in_array((string) $template, $this->template_names(), TRUE) ? (string) $template : '';
        $path = $name === '' ? '' : $dir . DIRECTORY_SEPARATOR . $name;

        if ($path === '' || !is_file($path)) {
            return NULL;
        }

        $info = @getimagesize($path);

        if ($info === FALSE || (int) $info[0] < 1 || (int) $info[1] < 1) {
            return NULL;
        }

        return array('width' => (int) $info[0], 'height' => (int) $info[1]);
    }

    private function file_time($path)    {
        $time = @filemtime($path);

        return $time === FALSE ? NULL : date('Y-m-d H:i:s', (int) $time);
    }

    /** Friendly event names from the CMS tables and the bundled manifest. */
    private function known_names()
    {
        $names = array();

        foreach (array('race_events', 'site_events') as $table) {
            if (!$this->db->table_exists($table)) {
                continue;
            }

            foreach ($this->db->select('slug, name')->get($table)->result() as $row) {
                if (!isset($names[$row->slug])) {
                    $names[$row->slug] = (string) $row->name;
                }
            }
        }

        $manifest = FCPATH . 'web/src/results/events.json';

        if (is_file($manifest)) {
            $decoded = json_decode((string) @file_get_contents($manifest), TRUE);

            if (is_array($decoded) && isset($decoded['events']) && is_array($decoded['events'])) {
                foreach ($decoded['events'] as $event) {
                    if (!isset($event['slug'])) {
                        continue;
                    }

                    if (!isset($names[$event['slug']]) && !empty($event['name'])) {
                        $names[$event['slug']] = (string) $event['name'];
                    }
                }
            }
        }

        return $names;
    }

    // ------------------------------------------------------- config normalizer

    /**
     * Whitelist + clamp the client payload. A malformed config can never break
     * the renderer or point at arbitrary files.
     */
    private function normalize_config($payload, $slug, $dir)
    {
        $width = $this->clamp_int(isset($payload['width']) ? $payload['width'] : 2480, 100, 20000);
        $height = $this->clamp_int(isset($payload['height']) ? $payload['height'] : 1754, 100, 20000);

        $template = isset($payload['template']) ? (string) $payload['template'] : '';
        $template = in_array($template, $this->template_names(), TRUE) ? $template : NULL;

        $config = array(
            'version' => 1,
            'slug' => (string) $slug,
            'enabled' => !empty($payload['enabled']),
            'onlyFinishers' => isset($payload['onlyFinishers']) ? (bool) $payload['onlyFinishers'] : TRUE,
            'template' => $template,
            'width' => $width,
            'height' => $height,
            'background' => $this->hex_color(isset($payload['background']) ? $payload['background'] : NULL),
            'eventName' => $this->short_text(isset($payload['eventName']) ? $payload['eventName'] : '', 190),
            'eventDate' => $this->short_text(isset($payload['eventDate']) ? $payload['eventDate'] : '', 40),
            'pdf' => array(
                // Only the page size is configurable; the orientation always
                // follows the artwork, so "template" can never clash with it.
                'size' => in_array($this->raw(isset($payload['pdf']['size']) ? $payload['pdf']['size'] : ''), array('a4', 'a3', 'letter', 'template'), TRUE)
                    ? (string) $payload['pdf']['size']
                    : 'template'
            ),
            'fields' => array()
        );

        $fields = isset($payload['fields']) && is_array($payload['fields']) ? $payload['fields'] : array();
        $fields = array_slice($fields, 0, self::MAX_FIELDS);
        $seen_ids = array();

        foreach ($fields as $index => $field) {
            if (!is_array($field)) {
                continue;
            }

            $normalized = $this->normalize_field($field, $index, $width, $height);

            // An unknown token is dropped rather than guessed: a certificate must
            // never print a different value than the one the admin picked.
            if ($normalized['type'] === 'token' && $normalized['token'] === NULL) {
                continue;
            }

            $id = $normalized['id'];

            if (isset($seen_ids[$id])) {
                $seen_ids[$id]++;
                $normalized['id'] = $id . '-' . $seen_ids[$id];
            } else {
                $seen_ids[$id] = 1;
            }

            $config['fields'][] = $normalized;
        }

        return $config;
    }

    private function normalize_field($field, $index, $width, $height)
    {
        $type = $this->raw(isset($field['type']) ? $field['type'] : 'token');
        $type = $type === 'text' ? 'text' : 'token';

        $token = NULL;

        if ($type === 'token') {
            $candidate = $this->raw(isset($field['token']) ? $field['token'] : '');
            $token = in_array($candidate, $this->tokens, TRUE) ? $candidate : NULL;
        }

        $style = isset($field['style']) && is_array($field['style']) ? $field['style'] : array();
        $font = $this->raw(isset($style['font']) ? $style['font'] : '');
        $weight = $this->clamp_int(isset($style['weight']) ? $style['weight'] : 400, 300, 900);

        // Snap weights to the hundreds the bundled fonts actually ship.
        $weight = (int) (round($weight / 100) * 100);

        $align = $this->raw(isset($field['align']) ? $field['align'] : 'center');

        return array(
            'id' => $this->field_id(isset($field['id']) ? $field['id'] : '', $index),
            'type' => $type,
            'token' => $token,
            'text' => $type === 'text' ? $this->short_text(isset($field['text']) ? $field['text'] : '', 300) : NULL,
            'prefix' => $this->short_text(isset($field['prefix']) ? $field['prefix'] : '', 60),
            'suffix' => $this->short_text(isset($field['suffix']) ? $field['suffix'] : '', 60),
            'x' => $this->clamp_int(isset($field['x']) ? $field['x'] : 0, 0, $width),
            'y' => $this->clamp_int(isset($field['y']) ? $field['y'] : 0, 0, $height),
            'align' => in_array($align, array('left', 'center', 'right'), TRUE) ? $align : 'center',
            'style' => array(
                'font' => in_array($font, $this->fonts, TRUE) ? $font : 'inter',
                'size' => $this->clamp_int(isset($style['size']) ? $style['size'] : 48, 6, 600),
                'weight' => $weight,
                'italic' => !empty($style['italic']),
                'color' => $this->hex_color(isset($style['color']) ? $style['color'] : NULL) ?: '#111827',
                'letterSpacing' => $this->clamp_int(isset($style['letterSpacing']) ? $style['letterSpacing'] : 0, -40, 120),
                'lineHeight' => $this->clamp_float(isset($style['lineHeight']) ? $style['lineHeight'] : 1.2, 0.6, 3),
                'uppercase' => !empty($style['uppercase']),
                'rotation' => $this->clamp_int(isset($style['rotation']) ? $style['rotation'] : 0, -180, 180),
                'maxWidth' => $this->clamp_int(isset($style['maxWidth']) ? $style['maxWidth'] : 0, 0, $width),
                'autoShrink' => !empty($style['autoShrink'])
            )
        );
    }

    private function field_id($value, $index)
    {
        $id = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $value);

        if ($id === '' || $id === NULL) {
            $id = 'f' . ((int) $index + 1);
        }

        return substr($id, 0, 40);
    }

    private function raw($value)
    {
        return is_string($value) ? trim($value) : '';
    }

    private function short_text($value, $max)
    {
        $text = trim((string) $value);

        if (function_exists('mb_substr')) {
            return mb_substr($text, 0, $max);
        }

        return substr($text, 0, $max);
    }

    private function clamp_int($value, $min, $max)
    {
        $number = (int) round((float) $value);

        if ($number < $min) {
            return (int) $min;
        }

        if ($number > $max) {
            return (int) $max;
        }

        return $number;
    }

    private function clamp_float($value, $min, $max)
    {
        $number = (float) $value;

        if ($number < $min) {
            return (float) $min;
        }

        if ($number > $max) {
            return (float) $max;
        }

        return $number;
    }

    private function hex_color($value)
    {
        $color = $this->raw($value);

        if ($color === '') {
            return NULL;
        }

        if (!preg_match('/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?([0-9a-fA-F]{2})?$/', $color)) {
            return NULL;
        }

        return strtolower($color);
    }
}
