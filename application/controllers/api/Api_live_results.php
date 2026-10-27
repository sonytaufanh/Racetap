<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/Api_controller.php';

/**
 * Live Feibot scores proxy (replaces the old server-rendered /hasil page).
 * The upstream response is cached for 60 seconds to protect the third party.
 */
class Api_live_results extends Api_controller
{
    private $api_url = 'https://time.feibot.com/api/runner-scores/uyQJeG7H9S';
    private $cache_ttl = 60;

    public function index()
    {
        if (!$this->only_methods(array('GET'))) {
            return;
        }

        $page = max(1, (int) $this->input->get('page'));
        $per_page = (int) $this->input->get('per_page');
        $per_page = in_array($per_page, array(25, 50, 100), TRUE) ? $per_page : 25;
        $selected_category = trim((string) $this->input->get('category', TRUE));
        $query = trim((string) $this->input->get('q', TRUE));

        $payload = $this->fetch_payload();

        if (isset($payload['error'])) {
            $this->fail($payload['error'], 502);
            return;
        }

        $rows = $this->extract_rows($payload);
        $all_results = array();
        $columns = array();

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $flat = $this->flatten_row($row);
            $all_results[] = $flat;

            foreach (array_keys($flat) as $column) {
                if (!in_array($column, $columns, TRUE)) {
                    $columns[] = $column;
                }
            }
        }

        if (empty($all_results)) {
            $this->fail('Data peserta tidak ditemukan pada respons API.', 502);
            return;
        }

        $category_column = $this->find_column($columns, array('category', 'race_category', 'racecategory'));
        $net_column = $this->find_column($columns, array('net_time', 'nettime', 'chip_time', 'chiptime'));
        $gun_column = $this->find_column($columns, array('gun_time', 'guntime'));
        $time_column = $net_column !== NULL ? $net_column : $gun_column;

        $name_column = $this->find_column($columns, array('name', 'runner_name', 'participant_name', 'full_name'));
        $bib_column = $this->find_column($columns, array('bib', 'bib_number', 'bib_no', 'race_number'));

        $categories = array();

        if ($category_column !== NULL) {
            foreach ($all_results as $runner) {
                $value = isset($runner[$category_column]) ? trim((string) $runner[$category_column]) : '';

                if ($value !== '' && $value !== '-') {
                    $categories[$value] = $value;
                }
            }

            natcasesort($categories);
            $categories = array_values($categories);
        }

        $filtered = array();

        foreach ($all_results as $runner) {
            if ($selected_category !== '') {
                if ($category_column === NULL) {
                    continue;
                }

                $value = isset($runner[$category_column]) ? trim((string) $runner[$category_column]) : '';

                if ($value !== $selected_category) {
                    continue;
                }
            }

            if ($query !== '') {
                $haystack = '';

                if ($name_column !== NULL && isset($runner[$name_column])) {
                    $haystack .= ' ' . $runner[$name_column];
                }

                if ($bib_column !== NULL && isset($runner[$bib_column])) {
                    $haystack .= ' ' . $runner[$bib_column];
                }

                if (stripos($haystack, $query) === FALSE) {
                    continue;
                }
            }

            $filtered[] = $runner;
        }

        if ($time_column !== NULL) {
            usort($filtered, function ($a, $b) use ($time_column) {
                $time_a = isset($a[$time_column]) ? $this->time_to_seconds($a[$time_column]) : NULL;
                $time_b = isset($b[$time_column]) ? $this->time_to_seconds($b[$time_column]) : NULL;

                if ($time_a === NULL && $time_b === NULL) {
                    return 0;
                }

                if ($time_a === NULL) {
                    return 1;
                }

                if ($time_b === NULL) {
                    return -1;
                }

                return $time_a <=> $time_b;
            });
        }

        $total = count($filtered);
        $total_pages = max(1, (int) ceil($total / $per_page));
        $page = min($page, $total_pages);
        $offset = ($page - 1) * $per_page;

        $this->respond(array(
            'columns' => $columns,
            'category_column' => $category_column,
            'time_column' => $time_column,
            'name_column' => $name_column,
            'bib_column' => $bib_column,
            'results' => array_slice($filtered, $offset, $per_page),
            'categories' => $categories,
            'filters' => array('q' => $query, 'category' => $selected_category, 'per_page' => $per_page),
            'pagination' => array(
                'page' => $page,
                'per_page' => $per_page,
                'total' => $total,
                'total_pages' => $total_pages
            )
        ));
    }

    private function fetch_payload()
    {
        $cache_file = APPPATH . 'cache/feibot_scores.json';

        if (is_file($cache_file) && (time() - filemtime($cache_file)) < $this->cache_ttl) {
            $cached = json_decode((string) file_get_contents($cache_file), TRUE);

            if (is_array($cached)) {
                return $cached;
            }
        }

        if (!function_exists('curl_init')) {
            return array('error' => 'Ekstensi cURL tidak tersedia di server.');
        }

        $ch = curl_init();

        curl_setopt_array($ch, array(
            CURLOPT_URL => $this->api_url,
            CURLOPT_RETURNTRANSFER => TRUE,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_FOLLOWLOCATION => TRUE,
            CURLOPT_SSL_VERIFYPEER => TRUE,
            CURLOPT_HTTPHEADER => array('Accept: application/json')
        ));

        $response = curl_exec($ch);
        $error = curl_error($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);

        curl_close($ch);

        if ($response === FALSE) {
            return array('error' => 'Gagal mengambil data API: ' . $error);
        }

        if ($status < 200 || $status >= 300) {
            return array('error' => 'API mengembalikan HTTP status: ' . $status);
        }

        $decoded = json_decode($response, TRUE);

        if (!is_array($decoded)) {
            return array('error' => 'Respons API bukan JSON yang valid.');
        }

        @file_put_contents($cache_file, json_encode($decoded));

        return $decoded;
    }

    private function find_column($columns, $candidates)
    {
        foreach ($columns as $column) {
            $normalized = strtolower(preg_replace('/[^a-z0-9]/', '', $column));

            foreach ($candidates as $candidate) {
                $candidate_normalized = strtolower(preg_replace('/[^a-z0-9]/', '', $candidate));

                if ($normalized === $candidate_normalized) {
                    return $column;
                }
            }
        }

        return NULL;
    }

    private function time_to_seconds($value)
    {
        if (!is_scalar($value)) {
            return NULL;
        }

        $value = trim((string) $value);

        if ($value === '' || $value === '-' || in_array(strtoupper($value), array('DNF', 'DNS', 'DSQ'), TRUE)) {
            return NULL;
        }

        if (is_numeric($value)) {
            return (float) $value;
        }

        if (!preg_match('/^\d+(?::\d{1,2}){1,2}$/', $value)) {
            return NULL;
        }

        $parts = array_map('intval', explode(':', $value));

        if (count($parts) === 3) {
            return ($parts[0] * 3600) + ($parts[1] * 60) + $parts[2];
        }

        if (count($parts) === 2) {
            return ($parts[0] * 60) + $parts[1];
        }

        return NULL;
    }

    private function extract_rows($payload)
    {
        if (!is_array($payload)) {
            return array();
        }

        if (empty($payload) || array_keys($payload) === range(0, count($payload) - 1)) {
            if (empty($payload)) {
                return array();
            }

            $first = reset($payload);

            return is_array($first) ? $payload : array();
        }

        foreach (array('data', 'results', 'scores', 'runners', 'runner_scores', 'items') as $key) {
            if (isset($payload[$key]) && is_array($payload[$key])) {
                $rows = $this->extract_rows($payload[$key]);

                if (!empty($rows)) {
                    return $rows;
                }
            }
        }

        foreach ($payload as $value) {
            if (is_array($value)) {
                $rows = $this->extract_rows($value);

                if (!empty($rows)) {
                    return $rows;
                }
            }
        }

        return array($payload);
    }

    private function flatten_row($row, $prefix = '')
    {
        $result = array();

        foreach ($row as $key => $value) {
            $column = $prefix === '' ? (string) $key : $prefix . '.' . $key;

            if (is_array($value) && !empty($value)) {
                $is_list = array_keys($value) === range(0, count($value) - 1);

                if ($is_list && !is_array(reset($value))) {
                    $result[$column] = implode(', ', $value);
                } else {
                    $result = array_merge($result, $this->flatten_row($value, $column));
                }
            } elseif (is_array($value) && empty($value)) {
                $result[$column] = '-';
            } elseif (is_bool($value)) {
                $result[$column] = $value ? 'Ya' : 'Tidak';
            } elseif ($value === NULL || $value === '') {
                $result[$column] = '-';
            } else {
                $result[$column] = $value;
            }
        }

        return $result;
    }
}
