<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/Api_controller.php';

/** Media library for site imagery used by the CMS content editor. */
class Api_admin_media extends Api_controller
{
    public function __construct()
    {
        parent::__construct();
        $this->load->model('Cms_model');
    }

    public function index()
    {
        if ($this->require_admin() === NULL) {
            return;
        }

        $method = $this->method();

        if ($method === 'GET') {
            $this->respond(array('media' => $this->Cms_model->media()));
            return;
        }

        if ($method === 'POST') {
            if (!$this->require_csrf()) {
                return;
            }

            if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                $this->fail('Pilih satu file gambar.', 422);
                return;
            }

            $file = $_FILES['file'];

            if ((int) $file['size'] > 10485760) {
                $this->fail('Ukuran file melebihi 10 MB.', 422);
                return;
            }

            $info = @getimagesize($file['tmp_name']);
            $allowed = array('image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp');
            $mime = $info ? $info['mime'] : '';

            if (!isset($allowed[$mime])) {
                $this->fail('Format harus JPG, PNG, atau WebP.', 422);
                return;
            }

            $dir = FCPATH . 'assets/uploads/media/' . date('Y') . '/';

            if (!is_dir($dir) && !@mkdir($dir, 0775, TRUE)) {
                $this->fail('Folder media tidak dapat dibuat.', 500);
                return;
            }

            $name = 'media-' . bin2hex(random_bytes(6)) . '.' . $allowed[$mime];

            if (!@move_uploaded_file($file['tmp_name'], $dir . $name)) {
                $this->fail('Gagal menyimpan file.', 500);
                return;
            }

            $path = 'assets/uploads/media/' . date('Y') . '/' . $name;
            $admin = $this->require_admin();
            $result = $this->Cms_model->add_media(array(
                'path' => $path,
                'mime' => $mime,
                'size_bytes' => (int) $file['size'],
                'width' => $info[0],
                'height' => $info[1],
                'alt' => '',
                'folder' => 'site',
                'created_by' => $admin['id']
            ));

            $this->audit('media.upload', 'media', $result['id'], $path);

            $this->respond(array('path' => $path, 'mime' => $mime, 'width' => $info[0], 'height' => $info[1]), 201);
            return;
        }

        $this->fail('Method tidak diizinkan.', 405);
    }

    public function item($id = 0)
    {
        if ($this->require_admin() === NULL) {
            return;
        }

        if (!$this->only_methods(array('DELETE'))) {
            return;
        }

        if (!$this->require_csrf()) {
            return;
        }

        $path = $this->Cms_model->delete_media((int) $id);

        if ($path === FALSE) {
            $this->fail('Media tidak ditemukan.', 404);
            return;
        }

        if (strpos((string) $path, 'assets/uploads/media/') === 0) {
            @unlink(FCPATH . $path);
        }

        $this->audit('media.delete', 'media', (int) $id, $path);
        $this->respond(array('deleted' => TRUE));
    }
}
