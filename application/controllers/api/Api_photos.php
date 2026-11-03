<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/Api_controller.php';

class Api_photos extends Api_controller
{
    public function __construct()
    {
        parent::__construct();
        $this->load->model('Photo_repository');
    }

    public function events()
    {
        if (!$this->only_methods(array('GET'))) {
            return;
        }

        $this->respond(array(
            'events' => $this->Photo_repository->events(FALSE, TRUE),
            'stats' => $this->Photo_repository->stats(TRUE)
        ));
    }

    public function event($slug = '')
    {
        if (!$this->only_methods(array('GET'))) {
            return;
        }

        $bib = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) $this->input->get('bib', TRUE)));
        $bib = substr($bib, 0, 12);

        $event = $this->Photo_repository->get_event_by_slug($slug, $bib);

        if (!$event) {
            $this->fail('Event foto tidak ditemukan.', 404);
            return;
        }

        $this->respond(array(
            'event' => $event,
            'photos' => $event['photos'],
            'bib' => $bib,
            'match_count' => (int) $event['match_count']
        ));
    }

    /**
     * Streams a ZIP with the selected OCR-processed photos of an event.
     * No artificial size/file limit is applied.
     */
    public function download($slug = '')
    {
        if (!$this->only_methods(array('GET'))) {
            return;
        }

        if (!$this->db->table_exists('photos')) {
            $this->fail('Data foto belum tersedia.', 404);
            return;
        }

        $event = $this->db->where(array('slug' => $slug, 'is_active' => 1))->get('photo_events')->row_array();

        if (!$event) {
            $this->fail('Event foto tidak ditemukan.', 404);
            return;
        }

        $raw = (string) $this->input->get('ids', TRUE);
        $ids = array_values(array_unique(array_filter(array_map('intval', explode(',', $raw)))));

        if (empty($ids)) {
            $this->fail('Pilih minimal satu foto.', 422);
            return;
        }

        $rows = $this->db
            ->where('event_id', (int) $event['id'])
            ->where('ocr_indexed_at IS NOT NULL', NULL, FALSE)
            ->where_in('id', $ids)
            ->order_by('id', 'ASC')
            ->get('photos')
            ->result_array();

        if (empty($rows)) {
            $this->fail('Foto tidak ditemukan atau belum diproses OCR.', 404);
            return;
        }

        if (!class_exists('ZipArchive')) {
            $this->fail('Ekstensi ZIP tidak tersedia di server.', 503);
            return;
        }

        $temp = tempnam(sys_get_temp_dir(), 'rtphotos');

        if ($temp === FALSE) {
            $this->fail('Gagal menyiapkan file ZIP.', 500);
            return;
        }

        @unlink($temp);
        $zip = new ZipArchive();

        if ($zip->open($temp, ZipArchive::CREATE) !== TRUE) {
            $this->fail('Gagal membuat file ZIP.', 500);
            return;
        }

        $used = array();

        foreach ($rows as $row) {
            $relative = ltrim((string) $row['file'], '/');
            $path = FCPATH . $relative;

            if (!is_file($path)) {
                continue;
            }

            $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
            $bib = preg_replace('/[^0-9A-Za-z]/', '', (string) $row['bib']);
            $name = $bib !== '' ? 'bib-' . $bib : 'photo-' . (int) $row['id'];
            $name .= $ext !== '' ? '.' . $ext : '';
            $candidate = $name;
            $suffix = 2;

            while (isset($used[$candidate])) {
                $candidate = preg_replace('/\.[^.]*$/', '', $name) . '-' . $suffix . ($ext !== '' ? '.' . $ext : '');
                $suffix++;
            }

            $used[$candidate] = TRUE;
            $zip->addFile($path, $candidate);
        }

        $zip->close();

        if (!is_file($temp) || filesize($temp) === 0) {
            @unlink($temp);
            $this->fail('Tidak ada file foto yang bisa dimasukkan ke ZIP.', 404);
            return;
        }

        $filename = $event['slug'] . '-photos.zip';

        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . filesize($temp));
        header('Cache-Control: no-store, max-age=0');
        header('X-Content-Type-Options: nosniff');

        readfile($temp);
        @unlink($temp);
        exit;
    }
}
