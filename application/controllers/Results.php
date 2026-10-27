
<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Results extends CI_Controller
{
    private $api_url = 'https://time.feibot.com/api/runner-scores/uyQJeG7H9S';

    public function index()
    {
        $data['results'] = array();
        $data['columns'] = array();
        $data['error'] = '';
        $data['categories'] = array();
        $data['selected_category'] = '';
        $data['page'] = 1;
        $data['per_page'] = 25;
        $data['total_count'] = 0;
        $data['total_pages'] = 1;
        $data['start_number'] = 0;

        // Parameter pagination
        $page = max(1, (int) $this->input->get('page'));
        $per_page = (int) $this->input->get('per_page');

        if (!in_array($per_page, array(25, 50, 100), true)) {
            $per_page = 25;
        }

        $selected_category = trim(
            (string) $this->input->get('category', true)
        );

        $data['page'] = $page;
        $data['per_page'] = $per_page;
        $data['selected_category'] = $selected_category;

        // Mengambil data API
        $ch = curl_init();

        curl_setopt_array($ch, array(
            CURLOPT_URL            => $this->api_url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_HTTPHEADER     => array(
                'Accept: application/json'
            )
        ));

        $response = curl_exec($ch);
        $curl_error = curl_error($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        curl_close($ch);

        if ($response === false) {
            $data['error'] = 'Gagal mengambil data API: ' . $curl_error;
        } elseif ($http_code < 200 || $http_code >= 300) {
            $data['error'] = 'API mengembalikan HTTP status: ' . $http_code;
        } else {
            $payload = json_decode($response, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                $data['error'] = 'Respons API bukan JSON yang valid.';
            } else {
                $rows = $this->extract_rows($payload);
                $all_results = array();

                foreach ($rows as $row) {
                    if (!is_array($row)) {
                        continue;
                    }

                    $flat_row = $this->flatten_row($row);
                    $all_results[] = $flat_row;

                    foreach (array_keys($flat_row) as $column) {
                        if (!in_array($column, $data['columns'], true)) {
                            $data['columns'][] = $column;
                        }
                    }
                }

                if (empty($all_results)) {
                    $data['error'] =
                        'Data peserta tidak ditemukan. Periksa struktur respons API.';
                } else {
                    // Menentukan kolom kategori dan waktu
                    $category_column = $this->find_column(
                        $data['columns'],
                        array('category', 'race_category', 'racecategory')
                    );

                    $net_column = $this->find_column(
                        $data['columns'],
                        array('net_time', 'nettime', 'chip_time', 'chiptime')
                    );

                    $gun_column = $this->find_column(
                        $data['columns'],
                        array('gun_time', 'guntime')
                    );

                    // Jika net time tidak tersedia, gunakan gun time
                    $time_column = $net_column !== null
                        ? $net_column
                        : $gun_column;

                    // Kumpulkan pilihan kategori
                    if ($category_column !== null) {
                        $category_values = array();

                        foreach ($all_results as $runner) {
                            $category = isset($runner[$category_column])
                                ? trim((string) $runner[$category_column])
                                : '';

                            if ($category !== '' && $category !== '-') {
                                $category_values[$category] = $category;
                            }
                        }

                        natcasesort($category_values);
                        $data['categories'] = array_values($category_values);
                    }

                    // Filter kategori
                    $filtered_results = array();

                    foreach ($all_results as $runner) {
                        if ($selected_category !== '') {
                            if ($category_column === null) {
                                continue;
                            }

                            $runner_category = isset($runner[$category_column])
                                ? trim((string) $runner[$category_column])
                                : '';

                            if ($runner_category !== $selected_category) {
                                continue;
                            }
                        }

                        $filtered_results[] = $runner;
                    }

                    // Urutkan dari waktu tercepat
                    if ($time_column !== null) {
                        usort($filtered_results, function ($a, $b) use ($time_column) {
                            $time_a = isset($a[$time_column])
                                ? $this->time_to_seconds($a[$time_column])
                                : null;

                            $time_b = isset($b[$time_column])
                                ? $this->time_to_seconds($b[$time_column])
                                : null;

                            // Peserta tanpa waktu valid ditempatkan terakhir
                            if ($time_a === null && $time_b === null) {
                                return 0;
                            }

                            if ($time_a === null) {
                                return 1;
                            }

                            if ($time_b === null) {
                                return -1;
                            }

                            return $time_a <=> $time_b;
                        });
                    }

                    // Hitung pagination setelah filter dan sorting
                    $data['total_count'] = count($filtered_results);

                    $data['total_pages'] = max(
                        1,
                        (int) ceil($data['total_count'] / $per_page)
                    );

                    // Jika nomor halaman di luar jangkauan
                    $page = min($page, $data['total_pages']);
                    $data['page'] = $page;

                    $offset = ($page - 1) * $per_page;

                    $data['start_number'] = $data['total_count'] > 0
                        ? $offset + 1
                        : 0;

                    $data['results'] = array_slice(
                        $filtered_results,
                        $offset,
                        $per_page
                    );
                }
            }
        }

        $this->load->view('results', $data);
    }

    /**
     * Mencari kolom berdasarkan beberapa kemungkinan nama.
     */
    private function find_column($columns, $candidates)
    {
        foreach ($columns as $column) {
            $normalized = strtolower(
                preg_replace('/[^a-z0-9]/', '', $column)
            );

            foreach ($candidates as $candidate) {
                $candidate_normalized = strtolower(
                    preg_replace('/[^a-z0-9]/', '', $candidate)
                );

                if ($normalized === $candidate_normalized) {
                    return $column;
                }
            }
        }

        return null;
    }

    /**
     * Mengubah waktu menjadi detik agar dapat diurutkan dengan benar.
     * Mendukung HH:MM:SS, MM:SS, dan nilai detik numerik.
     */
    private function time_to_seconds($value)
    {
        if (!is_scalar($value)) {
            return null;
        }

        $value = trim((string) $value);

        if (
            $value === '' ||
            $value === '-' ||
            strtoupper($value) === 'DNF' ||
            strtoupper($value) === 'DNS' ||
            strtoupper($value) === 'DSQ'
        ) {
            return null;
        }

        if (is_numeric($value)) {
            return (float) $value;
        }

        // Format HH:MM:SS atau MM:SS
        if (!preg_match('/^\d+(?::\d{1,2}){1,2}$/', $value)) {
            return null;
        }

        $parts = array_map('intval', explode(':', $value));

        if (count($parts) === 3) {
            return ($parts[0] * 3600) +
                   ($parts[1] * 60) +
                   $parts[2];
        }

        if (count($parts) === 2) {
            return ($parts[0] * 60) + $parts[1];
        }

        return null;
    }

    /**
     * Mencari daftar data peserta dalam respons API.
     */
    private function extract_rows($payload)
    {
        if (!is_array($payload)) {
            return array();
        }

        if (
            empty($payload) ||
            array_keys($payload) === range(0, count($payload) - 1)
        ) {
            if (empty($payload)) {
                return array();
            }

            $first = reset($payload);

            if (is_array($first)) {
                return $payload;
            }

            return array();
        }

        $possible_keys = array(
            'data',
            'results',
            'scores',
            'runners',
            'runner_scores',
            'items'
        );

        foreach ($possible_keys as $key) {
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

    /**
     * Mengubah objek bersarang menjadi kolom tabel.
     */
    private function flatten_row($row, $prefix = '')
    {
        $result = array();

        foreach ($row as $key => $value) {
            $column = ($prefix === '')
                ? (string) $key
                : $prefix . '.' . $key;

            if (is_array($value) && !empty($value)) {
                $is_list = array_keys($value) ===
                    range(0, count($value) - 1);

                if ($is_list && !is_array(reset($value))) {
                    $result[$column] = implode(', ', $value);
                } else {
                    $result = array_merge(
                        $result,
                        $this->flatten_row($value, $column)
                    );
                }
            } elseif (is_array($value) && empty($value)) {
                $result[$column] = '-';
            } elseif (is_bool($value)) {
                $result[$column] = $value ? 'Ya' : 'Tidak';
            } elseif ($value === null || $value === '') {
                $result[$column] = '-';
            } else {
                $result[$column] = $value;
            }
        }

        return $result;
    }

    public function detail($index = null)
    {
        if ($index === null || !ctype_digit((string) $index)) {
            show_404();
            return;
        }

        $ch = curl_init();

        curl_setopt_array($ch, array(
            CURLOPT_URL            => $this->api_url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_HTTPHEADER     => array(
                'Accept: application/json'
            )
        ));

        $response = curl_exec($ch);
        $curl_error = curl_error($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        curl_close($ch);

        if ($response === false || $http_code < 200 || $http_code >= 300) {
            show_error('Data peserta gagal diambil dari API.', 502);
            return;
        }

        $payload = json_decode($response, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            show_error('Respons API tidak valid.', 502);
            return;
        }

        $rows = $this->extract_rows($payload);
        $index = (int) $index;

        if (!isset($rows[$index]) || !is_array($rows[$index])) {
            show_404();
            return;
        }

        $data['participant'] = $this->flatten_row($rows[$index]);

        $this->load->view('results/detail', $data);
    }
}
