<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Serves the React single-page application shell.
 *
 * Mounted at /v2 during the preview phase. After approval the same controller
 * can serve the root routes.
 */
class Spa extends CI_Controller
{
    public function index()
    {
        $uri = trim((string) $this->uri->uri_string(), '/');

        $basename = '';
        if ($uri === 'v2' || strpos($uri, 'v2/') === 0) {
            $basename = '/v2';
            $uri = trim(substr($uri, 2), '/');
        }

        $path = '/' . $uri;

        $data['page'] = $this->page_meta($path);
        $data['basename'] = $basename;
        $data['path'] = $path;
        $data['assets'] = $this->assets();
        $data['payload'] = json_encode(array(
            'baseUrl' => rtrim(base_url(), '/') . '/',
            'apiUrl' => rtrim(site_url('api/v1'), '/'),
            'basename' => $basename,
            'initialPath' => $path,
            'csrfToken' => NULL,
            'appName' => 'Racetap'
        ), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        $this->load->view('spa/index', $data);
    }

    private function assets()
    {
        $js_path = FCPATH . 'assets/app/app.js';
        $css_path = FCPATH . 'assets/app/app.css';

        return array(
            'css' => base_url('assets/app/app.css') . '?v=' . (is_file($css_path) ? filemtime($css_path) : 1),
            'js' => base_url('assets/app/app.js') . '?v=' . (is_file($js_path) ? filemtime($js_path) : 1)
        );
    }

    private function page_meta($path)
    {
        $pages = array(
            '/' => array(
                'title' => 'Racetap | Timing System and Event Technology',
                'description' => 'Solusi race timing dan event technology untuk event lari, dari fun run hingga race profesional.'
            ),
            '/about' => array(
                'title' => 'Tentang Racetap | Race Timing Profesional',
                'description' => 'Racetap membantu penyelenggara event mengelola pencatatan waktu, hasil lomba, dan publikasi race result.'
            ),
            '/services' => array(
                'title' => 'Layanan Timing System | Racetap',
                'description' => 'RFID timing system, race result management, event timing support, dan custom timing solutions.'
            ),
            '/results' => array(
                'title' => 'Hasil Event | Racetap',
                'description' => 'Kumpulan hasil resmi event lari yang ditangani Racetap.'
            ),
            '/photos' => array(
                'title' => 'Race Photos | Racetap',
                'description' => 'Temukan foto Anda dari event lari Racetap menggunakan nomor dada (BIB).'
            ),
            '/hasil' => array(
                'title' => 'Race Results | Racetap',
                'description' => 'Hasil lomba terbaru dengan pencarian nama dan nomor BIB.'
            )
        );

        if (strpos($path, '/photos/') === 0) {
            $slug = trim(substr($path, strlen('/photos/')), '/');

            return array(
                'title' => 'Race Photos | Racetap',
                'description' => 'Cari foto nomor dada Anda pada event ' . $slug . '.',
                'photo_slug' => $slug
            );
        }

        if (strpos($path, '/race/') === 0) {
            $slug = trim(substr($path, strlen('/race/')), '/');

            return array(
                'title' => 'Hasil Race | Racetap',
                'description' => 'Hasil resmi race ' . $slug . '.',
                'race_slug' => $slug
            );
        }

        if (strpos($path, '/admin') === 0) {
            return array(
                'title' => 'Admin | Racetap',
                'description' => 'Panel admin Racetap.',
                'noindex' => TRUE
            );
        }

        return isset($pages[$path])
            ? $pages[$path]
            : array('title' => 'Racetap', 'description' => 'Timing System and Event Technology');
    }
}
