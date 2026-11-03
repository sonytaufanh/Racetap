<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Serves the React single-page application shells.
 *
 * The public site is mounted at the root, the per-event race results viewer is
 * served from static directories under /results/<slug>/, and the kiosk displays
 * live in their own subdomain document roots. This controller only renders the
 * HTML shell + payload; every page is drawn by the TypeScript bundles in
 * assets/app.
 */
class Spa extends CI_Controller
{
    /** Paths that were served by the retired /v2 preview prefix. */
    const LEGACY_PREFIX = 'v2';

    public function index()
    {
        $path = '/' . trim((string) $this->uri->uri_string(), '/');
        $path = $path === '/' ? '/' : rtrim($path, '/');

        $data['page'] = $this->apply_cms_meta($path, $this->page_meta($path));

        if (!empty($data['page']['not_found'])) {
            $this->output->set_status_header(404);
        }

        $data['path'] = $path;
        $data['assets'] = $this->assets('site');
        $data['payload'] = json_encode(array(
            'baseUrl' => rtrim(base_url(), '/') . '/',
            'apiUrl' => rtrim(site_url('api/v1'), '/'),
            'basename' => '',
            'initialPath' => $path,
            'csrfToken' => NULL,
            'appName' => 'Racetap'
        ), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        $this->load->view('spa/index', $data);
    }

    /**
     * Permanent redirects for URL shapes that no longer exist.
     *
     * /v2/...            -> /...
     * /welcome/about     -> /about
     * /welcome/services  -> /services
     * /welcome/results   -> /results
     * /welcome           -> /
     */
    public function legacy($path = '')
    {
        $path = trim((string) $path, '/');

        if ($path === 'welcome') {
            $this->output->set_status_header(301)->set_header('Location: ' . base_url());
            return;
        }

        $this->output
            ->set_status_header(301)
            ->set_header('Location: ' . rtrim(base_url(), '/') . '/' . $path);
    }

    private function assets($entry)
    {
        $js_path = FCPATH . 'assets/app/' . $entry . '.js';
        $css_path = FCPATH . 'assets/app/' . $entry . '.css';

        return array(
            'css' => base_url('assets/app/' . $entry . '.css') . '?v=' . (is_file($css_path) ? filemtime($css_path) : 1),
            'js' => base_url('assets/app/' . $entry . '.js') . '?v=' . (is_file($js_path) ? filemtime($js_path) : 1)
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
            ),
            '/contact' => array(
                'title' => 'Hubungi Racetap | Konsultasi Timing Event',
                'description' => 'Konsultasikan kebutuhan timing event Anda: format lomba, jumlah peserta, dan jadwal.'
            ),
            '/faq' => array(
                'title' => 'FAQ Hasil, Sertifikat, dan Foto | Racetap',
                'description' => 'Pertanyaan umum tentang hasil lomba, sertifikat digital, dan pencarian foto BIB.'
            ),
            '/clients' => array(
                'title' => 'Klien & Testimoni | Racetap',
                'description' => 'Event dan penyelenggara yang telah bekerja sama dengan Racetap.'
            ),
            '/privacy' => array(
                'title' => 'Kebijakan Privasi | Racetap',
                'description' => 'Kebijakan privasi penggunaan situs dan layanan Racetap.'
            ),
            '/terms' => array(
                'title' => 'Syarat & Ketentuan | Racetap',
                'description' => 'Syarat dan ketentuan layanan race timing dan publikasi hasil Racetap.'
            )
        );

        if (strpos($path, '/events/') === 0) {
            return $this->event_meta(trim(substr($path, strlen('/events/')), '/'));
        }

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

    /**
     * Event detail meta + SportsEvent structured data from the results manifest
     * (web/src/results/events.json) so link previews and crawlers see real data.
     */
    /** Overlays editable SEO fields for a route when the CMS table is present. */
    private function apply_cms_meta($path, array $page)
    {
        if (empty($this->db)) {
            $this->load->database();
        }

        if (!$this->db->table_exists('seo_pages')) {
            return $page;
        }

        $row = $this->db->get_where('seo_pages', array('route' => $path, 'locale' => 'id'))->row_array();

        if (!$row) {
            return $page;
        }

        if (!empty($row['title'])) {
            $page['title'] = $row['title'];
        }

        if (!empty($row['description'])) {
            $page['description'] = $row['description'];
        }

        if (!empty($row['og_image'])) {
            $page['og_image'] = $row['og_image'];
        }

        if (!empty($row['noindex'])) {
            $page['noindex'] = TRUE;
        }

        return $page;
    }

    /** Published CMS event (site_events) for /events/<slug>. */
    private function cms_event($slug)
    {
        if (empty($this->db)) {
            $this->load->database();
        }

        if (!$this->db->table_exists('site_events')) {
            return NULL;
        }

        return $this->db
            ->where(array('slug' => $slug, 'is_published' => 1))
            ->get('site_events')
            ->row_array();
    }

    private function event_meta($slug)
    {
        $cms = $slug !== '' ? $this->cms_event($slug) : NULL;

        if ($cms) {
            $name = $cms['name'];
            $description = 'Hasil resmi, sertifikat, dan foto event ' . $name . '.';
            $image = $cms['cover'] !== '' ? rtrim(base_url(), '/') . '/' . ltrim($cms['cover'], '/') : NULL;
            $jsonld = array(
                '@context' => 'https://schema.org',
                '@type' => 'SportsEvent',
                'name' => $name,
                'description' => $description,
                'url' => rtrim(base_url(), '/') . '/events/' . rawurlencode($slug),
                'eventStatus' => 'https://schema.org/EventScheduled',
                'organizer' => array('@type' => 'Organization', 'name' => 'Racetap', 'url' => rtrim(base_url(), '/') . '/')
            );

            if (!empty($cms['location'])) {
                $jsonld['location'] = array(
                    '@type' => 'Place',
                    'name' => $cms['location'],
                    'address' => array('@type' => 'PostalAddress', 'addressLocality' => $cms['location'], 'addressCountry' => 'ID')
                );
            }

            if ($image !== NULL) {
                $jsonld['image'] = $image;
            }

            if (!empty($cms['event_date'])) {
                $jsonld['startDate'] = $cms['event_date'];
            }

            return array(
                'title' => $name . ' — Hasil & Foto | Racetap',
                'description' => $description,
                'og_title' => $name . ' | Racetap',
                'og_image' => $image,
                'og_type' => 'article',
                'canonical' => rtrim(base_url(), '/') . '/events/' . rawurlencode($slug),
                'jsonld' => $jsonld
            );
        }

        $fallback = array(
            'title' => 'Event tidak ditemukan | Racetap',
            'description' => 'Event yang Anda cari belum tersedia. Lihat daftar hasil event Racetap.',
            'not_found' => TRUE
        );

        $manifest_path = FCPATH . 'web/src/results/events.json';

        if ($slug === '' || !is_file($manifest_path)) {
            return $fallback;
        }

        $decoded = json_decode((string) file_get_contents($manifest_path), TRUE);

        if (!is_array($decoded) || empty($decoded['events'])) {
            return $fallback;
        }

        foreach ($decoded['events'] as $event) {
            if (!isset($event['slug']) || $event['slug'] !== $slug) {
                continue;
            }

            $name = isset($event['name']) ? $event['name'] : $slug;
            $location = isset($event['location']) ? $event['location'] : '';
            $description = isset($event['description'])
                ? $event['description']
                : 'Hasil resmi, sertifikat, dan foto event ' . $name . '.';
            $image = isset($event['cover']) ? rtrim(base_url(), '/') . '/' . ltrim($event['cover'], '/') : NULL;

            $jsonld = array(
                '@context' => 'https://schema.org',
                '@type' => 'SportsEvent',
                'name' => $name,
                'description' => $description,
                'url' => rtrim(base_url(), '/') . '/events/' . rawurlencode($slug),
                'eventStatus' => 'https://schema.org/EventScheduled',
                'organizer' => array(
                    '@type' => 'Organization',
                    'name' => 'Racetap',
                    'url' => rtrim(base_url(), '/') . '/'
                )
            );

            if ($location !== '') {
                $jsonld['location'] = array(
                    '@type' => 'Place',
                    'name' => $location,
                    'address' => array('@type' => 'PostalAddress', 'addressLocality' => $location, 'addressCountry' => 'ID')
                );
            }

            if ($image !== NULL) {
                $jsonld['image'] = $image;
            }

            return array(
                'title' => $name . ' — Hasil & Foto | Racetap',
                'description' => $description,
                'og_title' => $name . ' | Racetap',
                'og_image' => $image,
                'og_type' => 'article',
                'canonical' => rtrim(base_url(), '/') . '/events/' . rawurlencode($slug),
                'jsonld' => $jsonld
            );
        }

        return $fallback;
    }
}
