<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Writes the static publishing artifacts for the CMS:
 *   - results/<slug>/index.html + summary.json (+ banner, data.json uploads)
 *   - kiosk <path>/index.html + setting-<file>.json
 *   - sitemap.xml updates
 *
 * Replaces the Node generators for admin-driven publishing on the shared host.
 */
class Cms_publisher
{
    private $CI;

    public function __construct()
    {
        $this->CI =& get_instance();
    }

    // ------------------------------------------------------------- results

    public function publish_event(array $event)
    {
        $slug = (string) $event['slug'];
        $dir = FCPATH . 'results/' . $slug;

        if (!is_dir($dir) && !@mkdir($dir, 0775, TRUE)) {
            return array('ok' => FALSE, 'error' => 'Folder results/' . $slug . ' tidak dapat dibuat.');
        }

        $config = is_array($event['config']) ? $event['config'] : array();
        $config = array_merge(array(
            'slug' => $slug,
            'metaTitle' => $event['name'] . ' | RaceTap',
            'description' => 'Hasil resmi event lari ' . $event['name'] . '.',
            'banner' => $event['banner'] !== '' ? $event['banner'] : NULL,
            'distanceOverride' => $event['distance'] !== '' ? $event['distance'] : NULL,
            'columns' => array('item', 'bib', 'name', 'cert', 'gender', 'ageGroup', 'gunTime', 'netTime', 'overallRank', 'genderRank', 'ageRank', 'status'),
            'filters' => array('item', 'gender', 'ageGroup')
        ), $config);

        $config['slug'] = $slug;

        $payload = array(
            'mode' => 'results',
            'slug' => $slug,
            'dataUrl' => 'data.json',
            'assetBase' => './',
            'config' => $config
        );

        $title = isset($config['metaTitle']) && $config['metaTitle'] !== '' ? $config['metaTitle'] : $event['name'];
        $description = isset($config['description']) && $config['description'] !== '' ? $config['description'] : 'Hasil resmi event lari Racetap.';

        $html = $this->results_shell($payload, $title, $description);

        if (@file_put_contents($dir . '/index.html', $html) === FALSE) {
            return array('ok' => FALSE, 'error' => 'index.html tidak dapat ditulis (periksa izin folder).');
        }

        $summary = $this->build_summary($event, $dir);

        if ($summary !== NULL) {
            @file_put_contents($dir . '/summary.json', json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n");
        }

        $this->add_sitemap_urls(array(
            rtrim(base_url(), '/') . '/events/' . rawurlencode($slug),
            rtrim(base_url(), '/') . '/results/' . rawurlencode($slug) . '/'
        ));

        return array('ok' => TRUE, 'summary' => $summary !== NULL);
    }

    public function store_event_data(array $event, $tmp_path, $original_name = 'data.json')
    {
        $slug = (string) $event['slug'];
        $dir = FCPATH . 'results/' . $slug;

        if (!is_dir($dir) && !@mkdir($dir, 0775, TRUE)) {
            return array('ok' => FALSE, 'error' => 'Folder hasil tidak dapat dibuat.');
        }

        $raw = @file_get_contents($tmp_path);

        if ($raw === FALSE || $raw === '') {
            return array('ok' => FALSE, 'error' => 'File data kosong.');
        }

        $decoded = json_decode($raw, TRUE);

        if (!is_array($decoded)) {
            return array('ok' => FALSE, 'error' => 'File harus JSON yang valid.');
        }

        if (@file_put_contents($dir . '/data.json', $raw) === FALSE) {
            return array('ok' => FALSE, 'error' => 'data.json tidak dapat ditulis.');
        }

        return array('ok' => TRUE, 'count' => isset($decoded['scores']) && is_array($decoded['scores']) ? count($decoded['scores']) : 0);
    }

    public function store_event_banner(array $event, $tmp_path, $extension)
    {
        $slug = (string) $event['slug'];
        $dir = FCPATH . 'results/' . $slug;

        if (!is_dir($dir) && !@mkdir($dir, 0775, TRUE)) {
            return array('ok' => FALSE, 'error' => 'Folder hasil tidak dapat dibuat.');
        }

        $extension = strtolower(preg_replace('/[^a-z0-9]/', '', (string) $extension));

        if (!in_array($extension, array('jpg', 'jpeg', 'png', 'webp'), TRUE)) {
            return array('ok' => FALSE, 'error' => 'Format banner harus JPG, PNG, atau WebP.');
        }

        $name = 'banner.' . ($extension === 'jpeg' ? 'jpg' : $extension);

        if (!@move_uploaded_file($tmp_path, $dir . '/' . $name)) {
            return array('ok' => FALSE, 'error' => 'Banner gagal disimpan.');
        }

        return array('ok' => TRUE, 'banner' => $name);
    }

    private function results_shell(array $payload, $title, $description)
    {
        $payload_json = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $payload_json = str_replace('<', '\\u003c', $payload_json);

        return '<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>' . $this->escape($title) . '</title>
<meta name="description" content="' . $this->escape($description) . '">
<link rel="icon" href="../../favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" sizes="32x32" href="../../favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="../../favicon-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<link rel="stylesheet" href="../../assets/app/results.css">
</head>
<body>
<div id="root">
  <div style="min-height:60vh;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;color:#636e72;">
    Memuat hasil lomba...
  </div>
</div>
<script id="racetap-payload" type="application/json">' . $payload_json . '</script>
<script type="module" src="../../assets/app/results.js"></script>
</body>
</html>
';
    }

    /** Same summary shape the Node generator produces (counts + per-distance podium). */
    private function build_summary(array $event, $dir)
    {
        $file = $dir . '/data.json';

        if (!is_file($file)) {
            return NULL;
        }

        $json = json_decode((string) @file_get_contents($file), TRUE);

        if (!is_array($json)) {
            return NULL;
        }

        $race = isset($json['race']) && is_array($json['race']) ? $json['race'] : array();
        $scores = isset($json['scores']) && is_array($json['scores']) ? $json['scores'] : array();
        $items = isset($race['items']) && is_array($race['items']) ? $race['items'] : array();

        $item_name = function ($score) use ($items) {
            $explicit = trim((string) (isset($score['item_name']) ? $score['item_name'] : ''));

            if ($explicit !== '') {
                return $explicit;
            }

            foreach ($items as $item) {
                if (isset($item['id']) && (string) $item['id'] === (string) (isset($score['item_id']) ? $score['item_id'] : '')) {
                    return trim((string) (isset($item['title']) ? $item['title'] : ''));
                }
            }

            return '';
        };

        $seconds = function ($value) {
            if (preg_match('/^(\d{1,2}):(\d{2}):(\d{2})$/', (string) $value, $m)) {
                return ((int) $m[1]) * 3600 + ((int) $m[2]) * 60 + (int) $m[3];
            }

            return PHP_INT_MAX;
        };

        $finishers = array();
        $categories = array();
        $by_category = array();

        foreach ($scores as $score) {
            if (!is_array($score)) {
                continue;
            }

            $item = $item_name($score);

            if ($item !== '') {
                $categories[$item] = $item;
            }

            $net = trim((string) (isset($score['net_score']) ? $score['net_score'] : ''));

            if ($net === '' || $net === '00:00:00') {
                continue;
            }

            $finishers[] = $score;
            $by_category[$item][] = $score;
        }

        usort($finishers, function ($a, $b) use ($seconds) {
            return $seconds(isset($a['net_score']) ? $a['net_score'] : '') <=> $seconds(isset($b['net_score']) ? $b['net_score'] : '');
        });

        $podiums = array();
        ksort($by_category);

        foreach ($by_category as $item => $list) {
            usort($list, function ($a, $b) use ($seconds) {
                return $seconds(isset($a['net_score']) ? $a['net_score'] : '') <=> $seconds(isset($b['net_score']) ? $b['net_score'] : '');
            });

            $athletes = array();

            foreach (array_slice($list, 0, 3) as $score) {
                $athletes[] = array(
                    'name' => trim((string) (isset($score['name']) ? $score['name'] : '')),
                    'bib' => trim((string) (isset($score['bib']) ? $score['bib'] : '')),
                    'netTime' => trim((string) (isset($score['net_score']) ? $score['net_score'] : '')),
                    'gunTime' => trim((string) (isset($score['total_score']) ? $score['total_score'] : ''))
                );
            }

            $podiums[] = array('item' => $item, 'athletes' => $athletes);
        }

        $date = NULL;

        if (!empty($race['date_time'])) {
            $date = gmdate('Y-m-d', (int) $race['date_time']);
        }

        $categories = array_values($categories);
        sort($categories);

        return array(
            'slug' => $event['slug'],
            'name' => $event['name'],
            'title' => trim((string) (isset($race['title']) ? $race['title'] : '')) ?: $event['name'],
            'date' => $date,
            'participants' => count($scores),
            'finishers' => count($finishers),
            'categories' => $categories,
            'distance' => $event['distance'] !== '' ? $event['distance'] : ($categories ? implode(' & ', $categories) : NULL),
            'podiums' => $podiums
        );
    }

    // --------------------------------------------------------------- kiosk

    public function publish_kiosk(array $kiosk, $config_file = 'setting-kiosk.json')
    {
        $path = (string) $kiosk['path'];
        $dir = FCPATH . rtrim($path, '/');

        if (!is_dir($dir)) {
            return array('ok' => FALSE, 'error' => 'Folder kiosk ' . $path . ' tidak ditemukan di server.');
        }

        $config = is_array($kiosk['config']) ? $kiosk['config'] : array();

        if ($config_file === '' || strpos($config_file, '/') !== FALSE || strpos($config_file, '\\') !== FALSE) {
            return array('ok' => FALSE, 'error' => 'Nama file setting tidak valid.');
        }

        $config_json = json_encode($config, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n";

        if (@file_put_contents($dir . '/' . $config_file, $config_json) === FALSE) {
            return array('ok' => FALSE, 'error' => 'Setting kiosk tidak dapat ditulis.');
        }

        $payload = array(
            'mode' => 'kiosk',
            'configUrl' => $config_file,
            'assetBase' => './'
        );

        $asset_base = rtrim(base_url(), '/') . '/assets/app/';
        $site_base = rtrim(base_url(), '/') . '/';
        $fonts = isset($config['fonts']) && is_array($config['fonts']) ? implode("\n", $config['fonts']) : '';

        $html = '<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>' . $this->escape($kiosk['title']) . '</title>
<link rel="icon" href="' . $this->escape($site_base) . 'favicon.ico" sizes="48x48">
<link rel="apple-touch-icon" sizes="180x180" href="' . $this->escape($site_base) . 'favicon-180.png">
<style>
' . $fonts . '

    html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
</style>
<link rel="stylesheet" href="' . $this->escape($asset_base) . 'kiosk.css">
</head>
<body>
<div id="root"></div>
<script id="racetap-payload" type="application/json">' . str_replace('<', '\\u003c', json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)) . '</script>
<script type="module" src="' . $this->escape($asset_base) . 'kiosk.js"></script>
</body>
</html>
';

        if (@file_put_contents($dir . '/index.html', $html) === FALSE) {
            return array('ok' => FALSE, 'error' => 'index.html kiosk tidak dapat ditulis.');
        }

        return array('ok' => TRUE);
    }

    // -------------------------------------------------------------- sitemap

    public function add_sitemap_urls(array $urls)
    {
        $file = FCPATH . 'sitemap.xml';
        $existing = array();

        if (is_file($file)) {
            $content = (string) @file_get_contents($file);

            if (preg_match_all('/<loc>(.*?)<\/loc>/', $content, $matches)) {
                $existing = array_map('html_entity_decode', $matches[1]);
            }
        }

        $merged = array_values(array_unique(array_merge($existing, $urls)));

        if (empty($merged)) {
            return;
        }

        $xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";
        $today = date('Y-m-d');

        foreach ($merged as $loc) {
            $xml .= "  <url>\n    <loc>" . htmlspecialchars($loc, ENT_QUOTES | ENT_XML1) . "</loc>\n    <lastmod>" . $today . "</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n";
        }

        $xml .= "</urlset>\n";
        @file_put_contents($file, $xml);
    }

    // --------------------------------------------------------------- helpers

    private function escape($value)
    {
        return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
    }
}
