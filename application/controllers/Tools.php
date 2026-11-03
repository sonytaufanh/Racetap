<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Development utilities. CLI only.
 *
 * Usage:
 *   php index.php tools migrate
 *   php index.php tools index_results
 *   php index.php tools seed_photos
 *   php index.php tools certificates [slug]
 */
class Tools extends CI_Controller
{
    public function __construct()
    {
        parent::__construct();

        if (!is_cli()) {
            show_error('This controller is CLI only.', 403);
        }

        $this->load->database();
        $this->load->model('Photo_repository');
    }

    /**
     * Idempotent schema upgrade for shared hosts without a migration runner.
     */
    public function migrate()
    {
        $tables = array(
            'app_settings' => "CREATE TABLE IF NOT EXISTS app_settings (
                setting_key VARCHAR(120) NOT NULL,
                setting_value TEXT NULL,
                updated_at DATETIME NOT NULL,
                PRIMARY KEY (setting_key)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8",
            'leads' => "CREATE TABLE IF NOT EXISTS leads (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                name VARCHAR(160) NOT NULL,
                email VARCHAR(190) NOT NULL,
                phone VARCHAR(40) NULL,
                event_name VARCHAR(190) NULL,
                message TEXT NULL,
                source VARCHAR(40) NOT NULL DEFAULT 'contact',
                ip VARCHAR(64) NULL,
                user_agent VARCHAR(255) NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'new',
                created_at DATETIME NOT NULL,
                PRIMARY KEY (id),
                KEY leads_created (created_at),
                KEY leads_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8",
            'content_sections' => "CREATE TABLE IF NOT EXISTS content_sections (
                section_key VARCHAR(120) NOT NULL,
                locale VARCHAR(5) NOT NULL DEFAULT 'id',
                payload LONGTEXT NULL,
                is_published TINYINT(1) NOT NULL DEFAULT 1,
                updated_by INT UNSIGNED NULL,
                updated_at DATETIME NOT NULL,
                PRIMARY KEY (section_key, locale)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            'site_events' => "CREATE TABLE IF NOT EXISTS site_events (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                slug VARCHAR(190) NOT NULL,
                name VARCHAR(190) NOT NULL,
                location VARCHAR(190) NOT NULL DEFAULT '',
                event_date DATE NULL,
                cover VARCHAR(255) NOT NULL DEFAULT '',
                banner VARCHAR(255) NULL,
                registration_url VARCHAR(500) NULL,
                distance VARCHAR(120) NULL,
                config LONGTEXT NULL,
                is_published TINYINT(1) NOT NULL DEFAULT 1,
                is_latest TINYINT(1) NOT NULL DEFAULT 0,
                sort_order INT NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                PRIMARY KEY (id),
                UNIQUE KEY site_events_slug (slug)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            'media' => "CREATE TABLE IF NOT EXISTS media (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                path VARCHAR(255) NOT NULL,
                mime VARCHAR(64) NOT NULL DEFAULT '',
                size_bytes INT UNSIGNED NOT NULL DEFAULT 0,
                width INT UNSIGNED NULL,
                height INT UNSIGNED NULL,
                alt VARCHAR(190) NOT NULL DEFAULT '',
                folder VARCHAR(64) NOT NULL DEFAULT 'site',
                created_by INT UNSIGNED NULL,
                created_at DATETIME NOT NULL,
                PRIMARY KEY (id),
                UNIQUE KEY media_path (path)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            'kiosk_instances' => "CREATE TABLE IF NOT EXISTS kiosk_instances (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                path VARCHAR(190) NOT NULL,
                title VARCHAR(190) NOT NULL,
                config_file VARCHAR(120) NOT NULL DEFAULT 'setting-kiosk.json',
                config LONGTEXT NULL,
                data_source VARCHAR(20) NOT NULL DEFAULT 'api',
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                sort_order INT NOT NULL DEFAULT 0,
                updated_at DATETIME NOT NULL,
                PRIMARY KEY (id),
                UNIQUE KEY kiosk_instances_path (path)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            'seo_pages' => "CREATE TABLE IF NOT EXISTS seo_pages (
                route VARCHAR(190) NOT NULL,
                locale VARCHAR(5) NOT NULL DEFAULT 'id',
                title VARCHAR(190) NOT NULL DEFAULT '',
                description VARCHAR(500) NOT NULL DEFAULT '',
                og_image VARCHAR(255) NOT NULL DEFAULT '',
                noindex TINYINT(1) NOT NULL DEFAULT 0,
                updated_at DATETIME NOT NULL,
                PRIMARY KEY (route, locale)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            'audit_log' => "CREATE TABLE IF NOT EXISTS audit_log (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                admin_id INT UNSIGNED NULL,
                admin_username VARCHAR(80) NULL,
                action VARCHAR(60) NOT NULL,
                entity VARCHAR(40) NOT NULL,
                entity_id VARCHAR(64) NULL,
                detail TEXT NULL,
                ip VARCHAR(64) NULL,
                created_at DATETIME NOT NULL,
                PRIMARY KEY (id),
                KEY audit_created (created_at),
                KEY audit_entity (entity, entity_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8"
        );

        foreach ($tables as $name => $ddl) {
            $this->db->query($ddl);
            echo "table $name ok\n";
        }

        if (!$this->db->field_exists('role', 'admin_users')) {
            $this->db->query("ALTER TABLE admin_users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'admin' AFTER display_name");
            echo "column admin_users.role added\n";
        }

        // Per-event OCR rules (digits only + exact digit count for bib reads).
        if ($this->db->table_exists('photo_events') && !$this->db->field_exists('ocr_rule', 'photo_events')) {
            $this->db->query("ALTER TABLE photo_events ADD COLUMN ocr_rule LONGTEXT NULL AFTER photographer");
            echo "column photo_events.ocr_rule added\n";
        }


        $first = $this->db->order_by('id', 'ASC')->limit(1)->get('admin_users')->row();

        if ($first && (!isset($first->role) || $first->role !== 'superadmin')) {
            $this->db->where('id', (int) $first->id)->update('admin_users', array('role' => 'superadmin'));
            echo "admin #{$first->id} promoted to superadmin\n";
        }

        if ($this->db->table_exists('photos')) {
            $this->db->query("CREATE TABLE IF NOT EXISTS photo_bibs (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                photo_id INT UNSIGNED NOT NULL,
                bib VARCHAR(32) NOT NULL,
                confidence DECIMAL(5,2) NOT NULL DEFAULT 0,
                source VARCHAR(20) NOT NULL DEFAULT 'ocr',
                created_at DATETIME NOT NULL,
                PRIMARY KEY (id),
                UNIQUE KEY photo_bibs_unique (photo_id, bib),
                KEY photo_bibs_bib (bib),
                CONSTRAINT photo_bibs_photo_fk FOREIGN KEY (photo_id) REFERENCES photos (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
            echo "table photo_bibs ok\n";
        }

        $this->backfill_ocr_index();
        $this->backfill_photo_bibs();
        $this->normalize_media_paths();

        echo "migrate done\n";
    }

    /**
     * Media filenames with spaces break on some servers/proxies. Rename them to
     * dash-separated names and keep the database in sync (idempotent).
     */
    private function normalize_media_paths()
    {
        if (!$this->db->table_exists('photo_events')) {
            return;
        }

        $rows = $this->db->like('cover', ' ', 'both')->get('photo_events')->result();

        foreach ($rows as $row) {
            $old = (string) $row->cover;

            if ($old === '' || strpos($old, ' ') === FALSE) {
                continue;
            }

            $new = str_replace(' ', '-', $old);

            if (is_file(FCPATH . $old) && !is_file(FCPATH . $new)) {
                @rename(FCPATH . $old, FCPATH . $new);
            }

            if (is_file(FCPATH . $new) || !is_file(FCPATH . $old)) {
                $this->db->where('id', (int) $row->id)->update('photo_events', array('cover' => $new));
                echo "media path normalized: {$old} -> {$new}\n";
            }
        }
    }

    /**
     * Creates an admin account or resets its password (CLI).
     *
     *   php index.php tools create_admin admin admin123 "Admin Racetap"
     */
    public function create_admin($username = '', $password = '', $display_name = '')
    {
        $username = trim((string) $username);
        $password = (string) $password;
        $display_name = trim((string) $display_name);

        if (!preg_match('/^[A-Za-z0-9_-]{4,80}$/', $username)) {
            echo "Username tidak valid (4-80 karakter: huruf, angka, _ atau -).\n";
            return;
        }

        if (strlen($password) < 8) {
            echo "Password minimal 8 karakter.\n";
            return;
        }

        if ($display_name === '') {
            $display_name = $username;
        }

        $now = date('Y-m-d H:i:s');
        $existing = $this->db->get_where('admin_users', array('username' => $username))->row();
        $data = array(
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'display_name' => $display_name,
            'is_active' => 1,
            'updated_at' => $now
        );

        if ($this->db->field_exists('role', 'admin_users')) {
            $data['role'] = 'superadmin';
        }

        if ($existing) {
            $this->db->where('id', (int) $existing->id)->update('admin_users', $data);
            echo "Admin diperbarui: {$username} (password direset).\n";
            return;
        }

        $data['username'] = $username;
        $data['created_at'] = $now;
        $this->db->insert('admin_users', $data);
        echo "Admin dibuat: {$username} (role superadmin).\n";
    }

    /** Photos with a stored bib/text were already processed; mark them indexed. */
    private function backfill_ocr_index()
    {
        if (!$this->db->table_exists('photos')) {
            return;
        }

        $this->db
            ->where('ocr_indexed_at IS NULL', NULL, FALSE)
            ->group_start()
            ->where('bib IS NOT NULL', NULL, FALSE)
            ->or_where('ocr_text IS NOT NULL', NULL, FALSE)
            ->group_end()
            ->update('photos', array('ocr_indexed_at' => date('Y-m-d H:i:s')));

        echo 'ocr index backfill: ' . $this->db->affected_rows() . " row(s)\n";
    }

    /** Seeds photo_bibs from the legacy single-bib column (idempotent). */
    private function backfill_photo_bibs()
    {
        if (!$this->db->table_exists('photos') || !$this->db->table_exists('photo_bibs')) {
            return;
        }

        $this->db->query("INSERT IGNORE INTO photo_bibs (photo_id, bib, confidence, source, created_at)
            SELECT id, bib, ocr_confidence, COALESCE(NULLIF(ocr_source, ''), 'legacy'), NOW()
            FROM photos
            WHERE bib IS NOT NULL AND bib <> ''");

        echo 'photo bibs backfill: ' . $this->db->affected_rows() . " row(s)\n";
    }

    /**
     * Reports the per-event e-certificate state: template file, field count and
     * whether the config would render for a real participant.
     *
     *   php index.php tools certificates
     *   php index.php tools certificates jember-10k
     */
    public function certificates($slug = NULL)
    {
        $this->load->model('Certificate_model');

        if ($slug !== NULL && $slug !== '') {
            $config = $this->Certificate_model->find($slug);

            if ($config === NULL) {
                echo "no certificate config for results/$slug\n";

                $sample = $this->Certificate_model->sample($slug, '', 3);

                if (empty($sample['ok'])) {
                    echo 'sample error: ' . $sample['error'] . "\n";
                } else {
                    echo "data.json: {$sample['total']} participants, {$sample['matched']} matched\n";
                }

                return;
            }

            echo "results/$slug/certificate.json\n";
            echo '  enabled: ' . ($config['enabled'] ? 'yes' : 'no') . "\n";
            echo '  only finishers: ' . ($config['onlyFinishers'] ? 'yes' : 'no') . "\n";
            echo '  template: ' . ($config['template'] === NULL ? '(none)' : $config['template']) . "\n";
            echo '  canvas: ' . $config['width'] . 'x' . $config['height'] . "\n";
            echo '  pdf: ' . json_encode($config['pdf']) . "\n";
            echo '  fields: ' . count($config['fields']) . "\n";

            foreach ($config['fields'] as $field) {
                $label = $field['type'] === 'text' ? 'text:' . $field['text'] : $field['token'];
                echo '    - ' . $label . ' @ ' . $field['x'] . ',' . $field['y'] . ' (' . $field['style']['font'] . ' '
                    . $field['style']['size'] . "px)\n";
            }

            return;
        }

        $events = $this->Certificate_model->events();
        $with_template = 0;
        $enabled = 0;

        foreach ($events as $event) {
            if ($event['has_template']) {
                $with_template++;
            }

            if ($event['enabled']) {
                $enabled++;
            }

            printf(
                "%-38s %-46s %-14s %2d field  %s\n",
                $event['slug'],
                $event['name'],
                $event['has_template'] ? 'template' : 'no template',
                $event['field_count'],
                $event['enabled'] ? 'AKTIF' : '-'
            );
        }

        echo sprintf(
            "total %d event(s), %d with template, %d enabled\n",
            count($events),
            $with_template,
            $enabled
        );
    }

    /** Reports photo rows and covers whose files are missing on disk. */
    public function check_media()
    {
        $missing = 0;

        foreach ($this->db->select('id, file')->get('photos')->result() as $photo) {
            $path = FCPATH . ltrim((string) $photo->file, '/');

            if (!is_file($path)) {
                $missing++;
                echo "missing photo #{$photo->id}: {$photo->file}\n";
            }
        }

        foreach ($this->db->select('id, cover')->get('photo_events')->result() as $event) {
            $cover = ltrim((string) $event->cover, '/');

            if ($cover !== '' && !is_file(FCPATH . $cover)) {
                $missing++;
                echo "missing cover #{$event->id}: {$event->cover}\n";
            }
        }

        echo "media check done. missing files: $missing\n";
    }

    /**
     * Imports the published results/<slug>/data.json files into race_results so
     * the public search endpoint can query athletes across events.
     */
    public function index_results()
    {
        $dirs = glob(FCPATH . 'results/*', GLOB_ONLYDIR);
        $events = 0;
        $rows = 0;
        $now = date('Y-m-d H:i:s');

        foreach ($dirs as $dir) {
            $file = $dir . '/data.json';

            if (!is_file($file)) {
                continue;
            }

            $slug = basename($dir);
            $decoded = json_decode((string) file_get_contents($file), TRUE);

            if (!is_array($decoded)) {
                echo "skip (invalid json): $slug\n";
                continue;
            }

            $title = isset($decoded['race']['title']) ? trim((string) $decoded['race']['title']) : $slug;
            $race = $this->db->get_where('race_events', array('slug' => $slug))->row();

            if ($race) {
                $race_id = (int) $race->id;
            } else {
                $this->db->insert('race_events', array(
                    'name' => $title !== '' ? $title : $slug,
                    'slug' => $slug,
                    'api_url' => '',
                    'is_active' => 1,
                    'created_at' => $now,
                    'updated_at' => $now
                ));
                $race_id = (int) $this->db->insert_id();
                $events++;
            }

            $scores = isset($decoded['scores']) && is_array($decoded['scores']) ? $decoded['scores'] : array();
            $batch = array();

            $this->db->where('race_id', $race_id)->delete('race_results');

            foreach ($scores as $score) {
                if (!is_array($score)) {
                    continue;
                }

                $bib = isset($score['bib']) ? trim((string) $score['bib']) : '';
                $name = isset($score['name']) ? trim((string) $score['name']) : '';
                $key = isset($score['id']) ? (string) $score['id'] : ($bib !== '' ? 'bib:' . $bib : md5($name));

                $batch[] = array(
                    'race_id' => $race_id,
                    'participant_key' => $key,
                    'external_id' => isset($score['id']) ? (string) $score['id'] : NULL,
                    'bib' => $bib !== '' ? $bib : NULL,
                    'name' => $name !== '' ? $name : NULL,
                    'category' => isset($score['item_name']) ? (string) $score['item_name'] : NULL,
                    'gender' => isset($score['sex']) ? (string) $score['sex'] : NULL,
                    'age_group' => isset($score['age_group']) ? (string) $score['age_group'] : NULL,
                    'gun_time' => isset($score['total_score']) ? (string) $score['total_score'] : NULL,
                    'net_time' => isset($score['net_score']) ? (string) $score['net_score'] : NULL,
                    'overall_rank' => isset($score['item_net_ranking']) && $score['item_net_ranking'] !== '' ? (int) $score['item_net_ranking'] : NULL,
                    'gender_rank' => isset($score['net_ranking']) && $score['net_ranking'] !== '' ? (int) $score['net_ranking'] : NULL,
                    'age_rank' => isset($score['age_net_ranking']) && $score['age_net_ranking'] !== '' ? (int) $score['age_net_ranking'] : NULL,
                    'status' => isset($score['finisher']) && (int) $score['finisher'] === 1 ? 'Finisher' : NULL,
                    'synced_at' => $now,
                    'created_at' => $now,
                    'updated_at' => $now
                );

                if (count($batch) >= 400) {
                    $this->db->insert_batch('race_results', $batch);
                    $rows += count($batch);
                    $batch = array();
                }
            }

            if (!empty($batch)) {
                $this->db->insert_batch('race_results', $batch);
                $rows += count($batch);
            }

            echo "indexed $slug: " . count($scores) . " rows\n";
        }

        echo "done. new events: $events, rows written: $rows\n";
    }

    public function seed_photos()
    {
        if (ENVIRONMENT === 'production') {
            echo "Refusing to seed in production.\n";
            return;
        }

        $path = FCPATH . 'assets/data/photos.json';

        if (!is_file($path)) {
            echo "Seed file not found: $path\n";
            return;
        }

        $decoded = json_decode(file_get_contents($path), TRUE);

        if (!is_array($decoded) || empty($decoded['events'])) {
            echo "Seed file is not valid JSON.\n";
            return;
        }

        $event_count = 0;
        $photo_count = 0;
        $now = date('Y-m-d H:i:s');

        foreach ($decoded['events'] as $event) {
            if (empty($event['slug']) || empty($event['name'])) {
                continue;
            }

            $existing = $this->db->where('slug', $event['slug'])->get('photo_events')->row_array();

            if ($existing) {
                $event_id = (int) $existing['id'];
            } else {
                $this->db->insert('photo_events', array(
                    'slug' => $event['slug'],
                    'name' => $event['name'],
                    'location' => isset($event['location']) ? $event['location'] : '',
                    'event_date' => !empty($event['event_date']) ? $event['event_date'] : NULL,
                    'cover' => isset($event['cover']) ? $event['cover'] : '',
                    'description' => isset($event['description']) ? $event['description'] : '',
                    'photographer' => isset($event['photographer']) ? $event['photographer'] : '',
                    'is_active' => 1,
                    'created_at' => $now,
                    'updated_at' => $now
                ));

                $event_id = (int) $this->db->insert_id();
                $event_count++;
            }

            foreach ((array) (isset($event['photos']) ? $event['photos'] : array()) as $photo) {
                if (empty($photo['file'])) {
                    continue;
                }

                $exists = $this->db->where(array('event_id' => $event_id, 'file' => $photo['file']))->count_all_results('photos');

                if ($exists > 0) {
                    continue;
                }

                $bib = isset($photo['bib']) ? trim((string) $photo['bib']) : '';

                $this->db->insert('photos', array(
                    'event_id' => $event_id,
                    'file' => $photo['file'],
                    'bib' => $bib !== '' ? $bib : NULL,
                    'ocr_text' => isset($photo['ocr_text']) ? $photo['ocr_text'] : $bib,
                    'ocr_confidence' => isset($photo['ocr_confidence']) ? (float) $photo['ocr_confidence'] : 0,
                    'ocr_source' => 'tesseract',
                    'ocr_indexed_at' => $bib !== '' ? $now : NULL,
                    'captured_at' => isset($photo['captured_at']) ? $photo['captured_at'] : '',
                    'category' => isset($photo['category']) ? $photo['category'] : '',
                    'original_name' => basename($photo['file']),
                    'created_at' => $now,
                    'updated_at' => $now
                ));

                $photo_count++;
            }
        }

        echo "Seed complete. New events: $event_count, new photos: $photo_count.\n";
    }

    public function stats()
    {
        $this->load->model('Photo_repository');
        echo json_encode($this->Photo_repository->stats(), JSON_PRETTY_PRINT) . "\n";
    }
}



