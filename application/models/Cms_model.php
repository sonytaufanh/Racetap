<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * CMS data access: editable site content, events, media, kiosks and SEO meta.
 *
 * Content payloads are stored as JSON per section + locale, so the public site
 * keeps working with its bundled defaults and only overrides what an admin
 * actually edited.
 */
class Cms_model extends CI_Model
{
    public function has_content_table()
    {
        return $this->db->table_exists('content_sections');
    }

    public function sections($locale = 'id', $published_only = TRUE)
    {
        if (!$this->has_content_table()) {
            return array();
        }

        $this->db->where('locale', $locale);

        if ($published_only) {
            $this->db->where('is_published', 1);
        }

        $rows = $this->db->get('content_sections')->result();
        $sections = array();

        foreach ($rows as $row) {
            $decoded = json_decode((string) $row->payload, TRUE);
            $sections[$row->section_key] = $decoded === NULL ? NULL : $decoded;
        }

        return $sections;
    }

    public function save_section($key, $locale, $payload, $published = TRUE, $admin_id = NULL)
    {
        if (!$this->has_content_table()) {
            return array('ok' => FALSE, 'error' => 'Tabel content_sections belum ada. Jalankan: php index.php tools migrate');
        }

        $this->db->replace('content_sections', array(
            'section_key' => (string) $key,
            'locale' => (string) $locale,
            'payload' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'is_published' => $published ? 1 : 0,
            'updated_by' => $admin_id === NULL ? NULL : (int) $admin_id,
            'updated_at' => date('Y-m-d H:i:s')
        ));

        return array('ok' => TRUE);
    }

    public function delete_section($key, $locale)
    {
        if (!$this->has_content_table()) {
            return FALSE;
        }

        return $this->db->delete('content_sections', array('section_key' => $key, 'locale' => $locale));
    }

    // ----------------------------------------------------------------- events

    public function events($published_only = TRUE)
    {
        if (!$this->db->table_exists('site_events')) {
            return array();
        }

        if ($published_only) {
            $this->db->where('is_published', 1);
        }

        $rows = $this->db
            ->order_by('sort_order', 'ASC')
            ->order_by('event_date', 'DESC')
            ->order_by('id', 'DESC')
            ->get('site_events')
            ->result_array();

        return array_map(array($this, 'normalize_event'), $rows);
    }

    public function find_event($slug)
    {
        if (!$this->db->table_exists('site_events')) {
            return NULL;
        }

        $row = $this->db->get_where('site_events', array('slug' => $slug))->row_array();

        return $row ? $this->normalize_event($row) : NULL;
    }

    public function save_event($payload, $id = NULL)
    {
        if (!$this->db->table_exists('site_events')) {
            return array('ok' => FALSE, 'error' => 'Tabel site_events belum ada. Jalankan: php index.php tools migrate');
        }

        $slug = strtolower(trim((string) (isset($payload['slug']) ? $payload['slug'] : '')));
        $slug = preg_replace('/[^a-z0-9.-]+/', '-', $slug);
        $slug = trim($slug, '-');

        if ($slug === '') {
            return array('ok' => FALSE, 'error' => 'Slug event wajib diisi.');
        }

        $name = trim((string) (isset($payload['name']) ? $payload['name'] : ''));

        if ($name === '') {
            return array('ok' => FALSE, 'error' => 'Nama event wajib diisi.');
        }

        $now = date('Y-m-d H:i:s');
        $data = array(
            'slug' => $slug,
            'name' => $name,
            'location' => trim((string) (isset($payload['location']) ? $payload['location'] : '')),
            'event_date' => !empty($payload['event_date']) ? $payload['event_date'] : NULL,
            'cover' => trim((string) (isset($payload['cover']) ? $payload['cover'] : '')),
            'banner' => !empty($payload['banner']) ? trim((string) $payload['banner']) : NULL,
            'registration_url' => !empty($payload['registration_url']) ? trim((string) $payload['registration_url']) : NULL,
            'distance' => !empty($payload['distance']) ? trim((string) $payload['distance']) : NULL,
            'config' => isset($payload['config']) ? json_encode($payload['config'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : NULL,
            'is_published' => !empty($payload['is_published']) ? 1 : 0,
            'is_latest' => !empty($payload['is_latest']) ? 1 : 0,
            'sort_order' => isset($payload['sort_order']) ? (int) $payload['sort_order'] : 0,
            'updated_at' => $now
        );

        if ($id) {
            $this->db->where('id', (int) $id)->update('site_events', $data);
            $event_id = (int) $id;
        } else {
            $existing = $this->find_event($slug);

            if ($existing) {
                $this->db->where('id', (int) $existing['id'])->update('site_events', $data);
                $event_id = (int) $existing['id'];
            } else {
                $data['created_at'] = $now;
                $this->db->insert('site_events', $data);
                $event_id = (int) $this->db->insert_id();
            }
        }

        return array('ok' => TRUE, 'id' => $event_id, 'event' => $this->find_event($slug));
    }

    public function delete_event($id)
    {
        if (!$this->db->table_exists('site_events')) {
            return FALSE;
        }

        return $this->db->delete('site_events', array('id' => (int) $id));
    }

    private function normalize_event($row)
    {
        $config = NULL;

        if (!empty($row['config'])) {
            $decoded = json_decode((string) $row['config'], TRUE);
            $config = is_array($decoded) ? $decoded : NULL;
        }

        return array(
            'id' => (int) $row['id'],
            'slug' => (string) $row['slug'],
            'name' => (string) $row['name'],
            'location' => (string) $row['location'],
            'event_date' => $row['event_date'] !== NULL ? (string) $row['event_date'] : '',
            'cover' => (string) $row['cover'],
            'banner' => $row['banner'] !== NULL ? (string) $row['banner'] : '',
            'registration_url' => $row['registration_url'] !== NULL ? (string) $row['registration_url'] : '',
            'distance' => $row['distance'] !== NULL ? (string) $row['distance'] : '',
            'config' => $config,
            'is_published' => (int) $row['is_published'],
            'is_latest' => (int) $row['is_latest'],
            'sort_order' => (int) $row['sort_order'],
            'updated_at' => (string) $row['updated_at']
        );
    }

    // ------------------------------------------------------------------ media

    public function media()
    {
        if (!$this->db->table_exists('media')) {
            return array();
        }

        return $this->db->order_by('id', 'DESC')->get('media')->result_array();
    }

    public function add_media($data)
    {
        if (!$this->db->table_exists('media')) {
            return array('ok' => FALSE, 'error' => 'Tabel media belum ada. Jalankan: php index.php tools migrate');
        }

        $this->db->replace('media', array(
            'path' => (string) $data['path'],
            'mime' => (string) $data['mime'],
            'size_bytes' => (int) $data['size_bytes'],
            'width' => isset($data['width']) ? (int) $data['width'] : NULL,
            'height' => isset($data['height']) ? (int) $data['height'] : NULL,
            'alt' => isset($data['alt']) ? (string) $data['alt'] : '',
            'folder' => isset($data['folder']) ? (string) $data['folder'] : 'site',
            'created_by' => isset($data['created_by']) ? (int) $data['created_by'] : NULL,
            'created_at' => date('Y-m-d H:i:s')
        ));

        return array('ok' => TRUE, 'id' => (int) $this->db->insert_id());
    }

    public function delete_media($id)
    {
        if (!$this->db->table_exists('media')) {
            return FALSE;
        }

        $row = $this->db->get_where('media', array('id' => (int) $id))->row_array();

        if (!$row) {
            return FALSE;
        }

        $this->db->delete('media', array('id' => (int) $id));

        return $row['path'];
    }

    // ------------------------------------------------------------------ kiosk

    public function kiosks()
    {
        if (!$this->db->table_exists('kiosk_instances')) {
            return array();
        }

        $rows = $this->db->order_by('sort_order', 'ASC')->order_by('path', 'ASC')->get('kiosk_instances')->result_array();
        $out = array();

        foreach ($rows as $row) {
            $config = json_decode((string) $row['config'], TRUE);

            $out[] = array(
                'id' => (int) $row['id'],
                'path' => (string) $row['path'],
                'title' => (string) $row['title'],
                'config_file' => (string) $row['config_file'],
                'config' => is_array($config) ? $config : NULL,
                'data_source' => (string) $row['data_source'],
                'is_active' => (int) $row['is_active'],
                'sort_order' => (int) $row['sort_order'],
                'updated_at' => (string) $row['updated_at']
            );
        }

        return $out;
    }

    public function save_kiosk($payload, $id = NULL)
    {
        if (!$this->db->table_exists('kiosk_instances')) {
            return array('ok' => FALSE, 'error' => 'Tabel kiosk_instances belum ada. Jalankan: php index.php tools migrate');
        }

        $path = trim((string) (isset($payload['path']) ? $payload['path'] : ''));

        if (!preg_match('/^[a-z0-9][a-z0-9.-]{1,180}$/i', $path)) {
            return array('ok' => FALSE, 'error' => 'Path kiosk tidak valid (huruf, angka, titik, strip).');
        }

        $data = array(
            'path' => $path,
            'title' => trim((string) (isset($payload['title']) ? $payload['title'] : 'RACETAP.ID')),
            'config_file' => !empty($payload['config_file']) ? preg_replace('/[^A-Za-z0-9._-]/', '', (string) $payload['config_file']) : 'setting-kiosk.json',
            'config' => isset($payload['config']) ? json_encode($payload['config'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : NULL,
            'data_source' => isset($payload['data_source']) && $payload['data_source'] === 'local' ? 'local' : 'api',
            'is_active' => !empty($payload['is_active']) ? 1 : 0,
            'sort_order' => isset($payload['sort_order']) ? (int) $payload['sort_order'] : 0,
            'updated_at' => date('Y-m-d H:i:s')
        );

        if ($id) {
            $this->db->where('id', (int) $id)->update('kiosk_instances', $data);
            $kiosk_id = (int) $id;
        } else {
            $existing = $this->db->get_where('kiosk_instances', array('path' => $path))->row_array();

            if ($existing) {
                $this->db->where('id', (int) $existing['id'])->update('kiosk_instances', $data);
                $kiosk_id = (int) $existing['id'];
            } else {
                $this->db->insert('kiosk_instances', $data);
                $kiosk_id = (int) $this->db->insert_id();
            }
        }

        return array('ok' => TRUE, 'id' => $kiosk_id);
    }

    // -------------------------------------------------------------------- seo

    public function seo($locale = NULL)
    {
        if (!$this->db->table_exists('seo_pages')) {
            return array();
        }

        if ($locale !== NULL) {
            $this->db->where('locale', $locale);
        }

        $rows = $this->db->get('seo_pages')->result_array();
        $out = array();

        foreach ($rows as $row) {
            $out[$row['route'] . '|' . $row['locale']] = array(
                'route' => (string) $row['route'],
                'locale' => (string) $row['locale'],
                'title' => (string) $row['title'],
                'description' => (string) $row['description'],
                'og_image' => (string) $row['og_image'],
                'noindex' => (int) $row['noindex']
            );
        }

        return $out;
    }

    public function seo_for($route, $locale = 'id')
    {
        if (!$this->db->table_exists('seo_pages')) {
            return NULL;
        }

        $row = $this->db->get_where('seo_pages', array('route' => $route, 'locale' => $locale))->row_array();

        return $row ? $row : NULL;
    }

    public function save_seo($payload)
    {
        if (!$this->db->table_exists('seo_pages')) {
            return array('ok' => FALSE, 'error' => 'Tabel seo_pages belum ada. Jalankan: php index.php tools migrate');
        }

        $route = trim((string) (isset($payload['route']) ? $payload['route'] : ''));
        $locale = (isset($payload['locale']) && $payload['locale'] === 'en') ? 'en' : 'id';

        if ($route === '' || $route[0] !== '/') {
            return array('ok' => FALSE, 'error' => 'Route harus dimulai dengan "/".');
        }

        $this->db->replace('seo_pages', array(
            'route' => $route,
            'locale' => $locale,
            'title' => trim((string) (isset($payload['title']) ? $payload['title'] : '')),
            'description' => trim((string) (isset($payload['description']) ? $payload['description'] : '')),
            'og_image' => trim((string) (isset($payload['og_image']) ? $payload['og_image'] : '')),
            'noindex' => !empty($payload['noindex']) ? 1 : 0,
            'updated_at' => date('Y-m-d H:i:s')
        ));

        return array('ok' => TRUE);
    }
}
