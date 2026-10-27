<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/Api_controller.php';

class Api_admin_photos extends Api_controller
{
    private $max_upload_bytes = 12582912; // 12 MB

    public function __construct()
    {
        parent::__construct();
        $this->load->model('Photo_repository');
        $this->load->library('vision_ocr');
    }

    public function events()
    {
        if ($this->require_admin() === NULL) {
            return;
        }

        $method = $this->method();

        if ($method === 'GET') {
            $this->respond(array('events' => $this->Photo_repository->events(TRUE)));
            return;
        }

        if ($method === 'POST') {
            if (!$this->require_csrf()) {
                return;
            }

            $payload = $this->payload();
            $result = $this->Photo_repository->save_event($payload);

            if (empty($result['ok'])) {
                $this->fail($result['error'], 422);
                return;
            }

            $this->respond($this->Photo_repository->get_event((int) $result['id']), 201);
            return;
        }

        $this->fail('Method tidak diizinkan.', 405);
    }

    public function event($id = 0)
    {
        if ($this->require_admin() === NULL) {
            return;
        }

        $event = $this->Photo_repository->get_event((int) $id);

        if (!$event) {
            $this->fail('Event tidak ditemukan.', 404);
            return;
        }

        $method = $this->method();

        if ($method === 'GET') {
            $this->respond($event);
            return;
        }

        if ($method === 'PATCH' || $method === 'PUT' || $method === 'POST') {
            if (!$this->require_csrf()) {
                return;
            }

            $payload = $this->payload();
            $result = $this->Photo_repository->save_event($payload, (int) $id);

            if (empty($result['ok'])) {
                $this->fail($result['error'], 422);
                return;
            }

            $this->respond($this->Photo_repository->get_event((int) $id));
            return;
        }

        if ($method === 'DELETE') {
            if (!$this->require_csrf()) {
                return;
            }

            $this->remove_upload_dir(FCPATH . 'assets/uploads/photos/' . $event['slug']);

            if (!empty($event['cover'])) {
                $this->remove_upload_file($event['cover']);
            }

            $this->Photo_repository->delete_event((int) $id);
            $this->respond(array('deleted' => TRUE));
            return;
        }

        $this->fail('Method tidak diizinkan.', 405);
    }

    public function cover($id = 0)
    {
        if ($this->require_admin() === NULL) {
            return;
        }

        if (!$this->only_methods(array('POST'))) {
            return;
        }

        if (!$this->require_csrf()) {
            return;
        }

        $event = $this->Photo_repository->get_event((int) $id);

        if (!$event) {
            $this->fail('Event tidak ditemukan.', 404);
            return;
        }

        if (empty($_FILES['cover'])) {
            $this->fail('File cover wajib diunggah.', 422);
            return;
        }

        $stored = $this->store_upload($_FILES['cover'], FCPATH . 'assets/uploads/covers', $event['slug'], '');

        if (empty($stored['ok'])) {
            $this->fail($stored['error'], 422);
            return;
        }

        $this->Photo_repository->save_event(array(
            'name' => $event['name'],
            'slug' => $event['slug'],
            'location' => $event['location'],
            'event_date' => $event['event_date'],
            'description' => $event['description'],
            'photographer' => $event['photographer'],
            'is_active' => $event['is_active'],
            'cover' => $stored['file']
        ), (int) $id);

        $this->respond($this->Photo_repository->get_event((int) $id));
    }

    public function upload($id = 0)
    {
        if ($this->require_admin() === NULL) {
            return;
        }

        if (!$this->only_methods(array('POST'))) {
            return;
        }

        if (!$this->require_csrf()) {
            return;
        }

        $event = $this->Photo_repository->get_event((int) $id);

        if (!$event) {
            $this->fail('Event tidak ditemukan.', 404);
            return;
        }

        if (empty($_FILES['files'])) {
            $this->fail('Pilih minimal satu foto.', 422);
            return;
        }

        $bib = preg_replace('/[^0-9A-Za-z]/', '', (string) $this->input_value('bib', ''));
        $category = trim((string) $this->input_value('category', ''));
        $captured_at = trim((string) $this->input_value('captured_at', ''));

        $dir = FCPATH . 'assets/uploads/photos/' . $event['slug'];
        $files = $this->normalize_files($_FILES['files']);
        $created = array();
        $errors = array();

        foreach ($files as $file) {
            $stored = $this->store_upload($file, $dir, $event['slug'], $bib);

            if (empty($stored['ok'])) {
                $errors[] = $file['name'] . ': ' . $stored['error'];
                continue;
            }

            $result = $this->Photo_repository->add_photo((int) $id, array(
                'file' => $stored['file'],
                'bib' => $bib,
                'ocr_confidence' => 0,
                'ocr_source' => $bib !== '' ? 'manual' : 'manual',
                'captured_at' => $captured_at,
                'category' => $category,
                'original_name' => $file['name'],
                'mime' => $stored['mime'],
                'size_bytes' => $stored['size_bytes'],
                'width' => $stored['width'],
                'height' => $stored['height']
            ));

            if (!empty($result['ok'])) {
                $created[] = $this->Photo_repository->find_photo((int) $result['id']);
            }
        }

        $this->respond(array(
            'created' => count($created),
            'photos' => $created,
            'errors' => $errors
        ), empty($created) ? 422 : 201);
    }

    public function photo($id = 0)
    {
        if ($this->require_admin() === NULL) {
            return;
        }

        $photo = $this->Photo_repository->find_photo((int) $id);

        if (!$photo) {
            $this->fail('Foto tidak ditemukan.', 404);
            return;
        }

        $method = $this->method();

        if ($method === 'PATCH' || $method === 'PUT') {
            if (!$this->require_csrf()) {
                return;
            }

            $payload = $this->payload();

            if (array_key_exists('bib', $payload)) {
                $payload['bib'] = preg_replace('/[^0-9A-Za-z]/', '', (string) $payload['bib']);
                $payload['ocr_text'] = $payload['bib'];
                $payload['ocr_source'] = 'manual';
            }

            $this->Photo_repository->update_photo((int) $id, $payload);
            $this->respond($this->Photo_repository->find_photo((int) $id));
            return;
        }

        if ($method === 'DELETE') {
            if (!$this->require_csrf()) {
                return;
            }

            $this->remove_upload_file($photo['file']);
            $this->Photo_repository->delete_photo((int) $id);
            $this->respond(array('deleted' => TRUE));
            return;
        }

        $this->fail('Method tidak diizinkan.', 405);
    }

    public function ocr_event($id = 0)
    {
        if ($this->require_admin() === NULL) {
            return;
        }

        if (!$this->only_methods(array('POST'))) {
            return;
        }

        if (!$this->require_csrf()) {
            return;
        }

        if (!$this->vision_ocr->enabled()) {
            $this->fail('Google Vision belum dikonfigurasi. Isi GOOGLE_VISION_API_KEY di environment server.', 503);
            return;
        }

        $event = $this->Photo_repository->get_event((int) $id);

        if (!$event) {
            $this->fail('Event tidak ditemukan.', 404);
            return;
        }

        $force = (bool) $this->input_value('force', FALSE);
        $queue = array();

        foreach ($event['photos'] as $photo) {
            if (!$force && $photo['ocr_source'] === 'google_vision' && $photo['ocr_text'] !== '') {
                continue;
            }

            $queue[] = $photo;
        }

        $batch = array_splice($queue, 0, 16);
        $indexed = 0;
        $errors = array();

        foreach ($batch as $photo) {
            $result = $this->vision_ocr->scan_file($this->absolute_path($photo['file']));

            $this->Photo_repository->log_ocr(
                (int) $photo['id'],
                (int) $event['id'],
                'google_vision',
                $result['ok'] ? 'success' : 'error',
                $result['bib'],
                $result['confidence'],
                $result['text'] !== '' ? $result['text'] : $this->vision_ocr->last_raw(),
                $result['error']
            );

            if (!$result['ok']) {
                $errors[] = array('id' => $photo['id'], 'file' => $photo['file'], 'error' => $result['error']);
                continue;
            }

            if ($result['bib'] !== '') {
                $this->Photo_repository->save_ocr(
                    (int) $photo['id'],
                    $result['bib'],
                    $result['text'],
                    $result['confidence'],
                    'google_vision'
                );
                $indexed++;
            }
        }

        $this->respond(array(
            'processed' => count($batch),
            'indexed' => $indexed,
            'remaining' => count($queue),
            'errors' => $errors
        ));
    }

    public function ocr_photo($id = 0)
    {
        if ($this->require_admin() === NULL) {
            return;
        }

        if (!$this->only_methods(array('POST'))) {
            return;
        }

        if (!$this->require_csrf()) {
            return;
        }

        if (!$this->vision_ocr->enabled()) {
            $this->fail('Google Vision belum dikonfigurasi. Isi GOOGLE_VISION_API_KEY di environment server.', 503);
            return;
        }

        $photo = $this->Photo_repository->find_photo((int) $id);

        if (!$photo) {
            $this->fail('Foto tidak ditemukan.', 404);
            return;
        }

        $result = $this->vision_ocr->scan_file($this->absolute_path($photo['file']));

        $this->Photo_repository->log_ocr(
            (int) $photo['id'],
            NULL,
            'google_vision',
            $result['ok'] ? 'success' : 'error',
            $result['bib'],
            $result['confidence'],
            $result['text'] !== '' ? $result['text'] : $this->vision_ocr->last_raw(),
            $result['error']
        );

        if (!$result['ok']) {
            $this->fail($result['error'], 502);
            return;
        }

        if ($result['bib'] !== '') {
            $this->Photo_repository->save_ocr(
                (int) $photo['id'],
                $result['bib'],
                $result['text'],
                $result['confidence'],
                'google_vision'
            );
        }

        $this->respond(array(
            'photo' => $this->Photo_repository->find_photo((int) $photo['id']),
            'result' => $result
        ));
    }

    private function store_upload($file, $dir, $slug, $bib)
    {
        if (!isset($file['error']) || $file['error'] !== UPLOAD_ERR_OK) {
            return array('ok' => FALSE, 'error' => 'Upload gagal (kode ' . (isset($file['error']) ? $file['error'] : '?') . ').');
        }

        if ((int) $file['size'] > $this->max_upload_bytes) {
            return array('ok' => FALSE, 'error' => 'Ukuran file melebihi 12 MB.');
        }

        $info = @getimagesize($file['tmp_name']);

        if ($info === FALSE) {
            return array('ok' => FALSE, 'error' => 'File bukan gambar yang valid.');
        }

        $mime = isset($info['mime']) ? $info['mime'] : '';
        $allowed = array('image/jpeg' => 'jpg', 'image/png' => 'jpg', 'image/webp' => 'webp');

        if (!isset($allowed[$mime])) {
            return array('ok' => FALSE, 'error' => 'Format harus JPG, PNG, atau WebP.');
        }

        if (!is_dir($dir) && !@mkdir($dir, 0775, TRUE) && !is_dir($dir)) {
            return array('ok' => FALSE, 'error' => 'Folder upload tidak dapat dibuat.');
        }

        $prefix = $bib !== '' ? 'bib-' . $bib : 'photo';
        $filename = $prefix . '-' . bin2hex(random_bytes(5)) . '.' . $allowed[$mime];
        $target = rtrim($dir, '/\\') . DIRECTORY_SEPARATOR . $filename;

        $saved = $this->write_image($file['tmp_name'], $target, $allowed[$mime]);

        if (!$saved) {
            return array('ok' => FALSE, 'error' => 'Gagal menyimpan file gambar.');
        }

        $final = @getimagesize($target);

        return array(
            'ok' => TRUE,
            'file' => $this->public_path($target),
            'mime' => $mime,
            'size_bytes' => is_file($target) ? (int) filesize($target) : 0,
            'width' => $final !== FALSE ? (int) $final[0] : 0,
            'height' => $final !== FALSE ? (int) $final[1] : 0
        );
    }

    private function write_image($source, $target, $format)
    {
        if (!function_exists('imagecreatefromstring')) {
            return @move_uploaded_file($source, $target);
        }

        $image = @imagecreatefromstring((string) file_get_contents($source));

        if ($image === FALSE) {
            return @move_uploaded_file($source, $target);
        }

        $ok = FALSE;
        $max_width = 1600;
        $width = imagesx($image);
        $height = imagesy($image);

        if ($width > $max_width) {
            $new_width = $max_width;
            $new_height = (int) round($height * ($max_width / $width));
            $resized = imagecreatetruecolor($new_width, $new_height);

            if ($format === 'webp' && function_exists('imagewebp')) {
                imagealphablending($resized, FALSE);
                imagesavealpha($resized, TRUE);
            }

            imagecopyresampled($resized, $image, 0, 0, 0, 0, $new_width, $new_height, $width, $height);
            imagedestroy($image);
            $image = $resized;
        }

        if ($format === 'webp') {
            $ok = function_exists('imagewebp') ? imagewebp($image, $target, 82) : FALSE;
        } else {
            $ok = imagejpeg($image, $target, 82);
        }

        imagedestroy($image);

        if (!$ok) {
            return @move_uploaded_file($source, $target);
        }

        return TRUE;
    }

    private function normalize_files($files)
    {
        $out = array();

        if (!is_array($files['name'])) {
            return array($files);
        }

        foreach ($files['name'] as $index => $name) {
            $out[] = array(
                'name' => $name,
                'type' => $files['type'][$index],
                'tmp_name' => $files['tmp_name'][$index],
                'error' => $files['error'][$index],
                'size' => $files['size'][$index]
            );
        }

        return $out;
    }

    private function public_path($absolute)
    {
        $normalized = str_replace('\\', '/', $absolute);
        $base = str_replace('\\', '/', FCPATH);

        if (strpos($normalized, $base) === 0) {
            return substr($normalized, strlen($base));
        }

        return basename($normalized);
    }

    private function absolute_path($relative)
    {
        $normalized = str_replace('\\', '/', (string) $relative);

        if (strpos($normalized, 'http://') === 0 || strpos($normalized, 'https://') === 0) {
            return '';
        }

        return FCPATH . ltrim($normalized, '/');
    }

    private function remove_upload_file($relative)
    {
        $path = $this->absolute_path($relative);

        if ($path === '' || strpos(str_replace('\\', '/', $path), str_replace('\\', '/', FCPATH) . 'assets/uploads/') !== 0) {
            return;
        }

        if (is_file($path)) {
            @unlink($path);
        }
    }

    private function remove_upload_dir($absolute)
    {
        if (!is_dir($absolute)) {
            return;
        }

        $items = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($absolute, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );

        foreach ($items as $item) {
            if ($item->isDir()) {
                @rmdir($item->getPathname());
            } else {
                @unlink($item->getPathname());
            }
        }

        @rmdir($absolute);
    }
}
