<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Race_api_model extends CI_Model
{
    private $api_config;

    public function __construct()
    {
        parent::__construct();
        $this->load->database();
        $this->load->config('race_api_importer', TRUE);
        $this->api_config = $this->config->item('race_api_importer');
        $this->load->helper('text');
    }

    public function all_events()
    {
        return $this->db->order_by('created_at', 'DESC')->get('race_events')->result();
    }

    public function get_event($id)
    {
        return $this->db->get_where('race_events', array('id' => (int) $id))->row();
    }

    public function save_event($payload, $id = NULL)
    {
        $now = date('Y-m-d H:i:s');
        $data = array(
            'name' => $payload['name'],
            'api_url' => $payload['api_url'],
            'updated_at' => $now
        );

        if ($id) {
            // Never regenerate the slug: it is the public results URL
            // (/results/<slug>/) and the key used by the results manifest.
            $existing = $this->get_event($id);

            if ($existing) {
                $data['slug'] = $existing->slug;
            }

            return $this->db->where('id', (int) $id)->update('race_events', $data);
        }

        $data['slug'] = $this->unique_slug($payload['name']);
        $data['is_active'] = 1;
        $data['created_at'] = $now;

        return $this->db->insert('race_events', $data);
    }

    private function unique_slug($name, $exclude_id = NULL)
    {
        $base = url_title(convert_accented_characters($name), 'dash', TRUE);
        if ($base === '') $base = 'race';
        $slug = $base;
        $n = 2;
        while (TRUE) {
            $this->db->from('race_events')->where('slug', $slug);
            if ($exclude_id) $this->db->where('id !=', (int) $exclude_id);
            if ($this->db->count_all_results() === 0) return $slug;
            $slug = $base . '-' . $n;
            $n++;
        }
    }

    public function toggle_event($id)
    {
        $race = $this->get_event($id);
        if (!$race) return FALSE;
        return $this->db->where('id', (int) $id)->update('race_events', array(
            'is_active' => $race->is_active ? 0 : 1,
            'updated_at' => date('Y-m-d H:i:s')
        ));
    }

    public function validate_api_url($url)
    {
        if (!filter_var($url, FILTER_VALIDATE_URL)) return 'URL API tidak valid.';
        $parts = parse_url($url);
        if (!$parts || empty($parts['scheme']) || strtolower($parts['scheme']) !== 'https') {
            return 'URL API wajib menggunakan HTTPS.';
        }
        if (empty($parts['host'])) return 'Host URL API tidak ditemukan.';
        $host = strtolower(rtrim($parts['host'], '.'));
        $allowed = isset($this->api_config['race_api_allowed_hosts']) ? $this->api_config['race_api_allowed_hosts'] : array();
        if (!in_array($host, $allowed, TRUE)) return 'Host API tidak diizinkan. Tambahkan host tersebut pada konfigurasi allowlist.';
        if (isset($parts['user']) || isset($parts['pass'])) return 'URL API tidak boleh berisi username/password.';
        return TRUE;
    }

    public function sync_event($id)
    {
        $race = $this->get_event($id);
        if (!$race) return array('ok' => FALSE, 'message' => 'Race tidak ditemukan.');

        if (trim((string) $race->api_url) === '') {
            return array('ok' => FALSE, 'message' => 'Race ini belum punya URL API. Hasilnya dikelola dari results/<slug>/data.json.');
        }

        $validation = $this->validate_api_url($race->api_url);
        if ($validation !== TRUE) return $this->record_sync_failure($race->id, $validation);

        $ch = curl_init($race->api_url);
        curl_setopt_array($ch, array(
            CURLOPT_RETURNTRANSFER => TRUE,
            CURLOPT_FOLLOWLOCATION => FALSE,
            CURLOPT_CONNECTTIMEOUT => (int) $this->api_config['race_api_connect_timeout'],
            CURLOPT_TIMEOUT => (int) $this->api_config['race_api_timeout'],
            CURLOPT_SSL_VERIFYPEER => TRUE,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_HTTPHEADER => array('Accept: application/json', 'User-Agent: CI3-Race-Importer/1.0')
        ));
        $body = curl_exec($ch);
        $curl_error = curl_error($ch);
        $http_code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $content_type = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        curl_close($ch);

        if ($body === FALSE) return $this->record_sync_failure($race->id, 'Gagal mengakses API: ' . $curl_error);
        if (strlen($body) > (int) $this->api_config['race_api_max_response_bytes']) {
            return $this->record_sync_failure($race->id, 'Respons API melebihi batas ukuran yang diizinkan.');
        }
        if ($http_code < 200 || $http_code >= 300) {
            return $this->record_sync_failure($race->id, 'API mengembalikan HTTP status ' . $http_code . '.');
        }
        $decoded = json_decode($body, TRUE);
        if (!is_array($decoded) || json_last_error() !== JSON_ERROR_NONE) {
            return $this->record_sync_failure($race->id, 'Respons API bukan JSON yang valid.');
        }
        $rows = $this->extract_rows($decoded);
        if (empty($rows)) {
            return $this->record_sync_failure($race->id, 'Respons API tidak berisi data peserta. Data lama dipertahankan.');
        }

        $now = date('Y-m-d H:i:s');
        $this->db->trans_begin();
        $saved = 0;
        foreach ($rows as $row) {
            if (!is_array($row)) continue;
            $mapped = $this->map_participant($row, $race->id, $now);
            if (!$mapped) continue;
            $this->db->replace('race_results', $mapped);
            $saved++;
        }
        if ($saved < 1 || $this->db->trans_status() === FALSE) {
            $this->db->trans_rollback();
            return $this->record_sync_failure($race->id, 'Tidak ada baris peserta yang dapat disimpan atau transaksi database gagal.');
        }
        $this->db->trans_commit();
        $this->db->where('id', $race->id)->update('race_events', array(
            'last_sync_at' => $now,
            'last_sync_status' => 'success',
            'last_sync_message' => 'Sinkronisasi berhasil.',
            'last_sync_count' => $saved,
            'updated_at' => $now
        ));
        return array('ok' => TRUE, 'message' => 'Sinkronisasi berhasil: ' . $saved . ' data peserta diproses.');
    }

    private function record_sync_failure($id, $message)
    {
        $now = date('Y-m-d H:i:s');
        $this->db->where('id', (int) $id)->update('race_events', array(
            'last_sync_at' => $now,
            'last_sync_status' => 'failed',
            'last_sync_message' => $message,
            'updated_at' => $now
        ));
        return array('ok' => FALSE, 'message' => $message);
    }

    private function extract_rows($decoded)
    {
        if (isset($decoded[0]) && is_array($decoded[0])) return $decoded;
        foreach (array('data', 'results', 'runners', 'participants', 'items', 'records') as $key) {
            if (isset($decoded[$key]) && is_array($decoded[$key])) {
                if (isset($decoded[$key][0]) && is_array($decoded[$key][0])) return $decoded[$key];
                foreach (array('data', 'results', 'runners', 'participants', 'items', 'records') as $nested) {
                    if (isset($decoded[$key][$nested]) && is_array($decoded[$key][$nested])) return $decoded[$key][$nested];
                }
            }
        }
        return array();
    }

    private function map_participant($row, $race_id, $now)
{
    $external_id = $this->first_value($row, array(
        'id', 'runner_id', 'participant_id', 'user_id'
    ));

    $bib = $this->first_value($row, array(
        'bib', 'bib_number', 'bib_no', 'race_number', 'number'
    ));

    $name = $this->first_value($row, array(
        'name', 'runner_name', 'participant_name', 'full_name'
    ));

    $key = $external_id !== NULL
        ? 'id:' . $external_id
        : ($bib !== NULL
            ? 'bib:' . $bib
            : 'hash:' . sha1(json_encode($row)));

    return array(
        'race_id' => (int) $race_id,
        'participant_key' => substr($key, 0, 190),
        'external_id' => $external_id,
        'bib' => $bib,
        'name' => $name,

        // Kategori dan identitas peserta
        'category' => $this->first_value($row, array(
            'item_name', 'category', 'race_category',
            'distance', 'event_category'
        )),

        'gender' => $this->first_value($row, array(
            'sex', 'gender'
        )),

        'age_group' => $this->first_value($row, array(
            'age_group', 'age_category', 'group'
        )),

        // Waktu
        'gun_time' => $this->first_value($row, array(
            'total_score', 'gun_time', 'gunTime', 'finish_time'
        )),

        'net_time' => $this->first_value($row, array(
            'net_score', 'net_time', 'netTime', 'chip_time'
        )),

        // Peringkat keseluruhan: prioritaskan net ranking
        'overall_rank' => $this->numeric_value(
            $this->first_value($row, array(
                'net_ranking', 'overall_rank', 'overallRank',
                'total_ranking', 'rank', 'position'
            ))
        ),

        // Diisi jika API menyediakan peringkat gender
        'gender_rank' => $this->numeric_value(
            $this->first_value($row, array(
                'gender_net_ranking', 'gender_total_ranking',
                'gender_rank', 'genderRank'
            ))
        ),

        // Peringkat kelompok umur: prioritaskan net ranking
        'age_rank' => $this->numeric_value(
            $this->first_value($row, array(
                'age_net_ranking', 'age_rank', 'ageRank',
                'age_total_ranking', 'category_rank'
            ))
        ),

        'status' => $this->first_value($row, array(
            'finisher', 'status', 'result_status'
        )),

        'raw_json' => json_encode($row, JSON_UNESCAPED_UNICODE),
        'synced_at' => $now,
        'created_at' => $now,
        'updated_at' => $now
    );
}

    private function first_value($row, $keys)
    {
        foreach ($keys as $key) {
            if (isset($row[$key]) && $row[$key] !== '') return is_scalar($row[$key]) ? (string) $row[$key] : NULL;
        }
        return NULL;
    }

    private function numeric_value($value)
    {
        return ($value !== NULL && is_numeric($value)) ? (int) $value : NULL;
    }

    public function sync_due_events()
    {
        $interval = max(1, (int) $this->api_config['race_api_sync_interval_minutes']);
        $cutoff = date('Y-m-d H:i:s', time() - ($interval * 60));
        $this->db->group_start()
            ->where('last_sync_at IS NULL', NULL, FALSE)
            ->or_where('last_sync_at <=', $cutoff)
            ->group_end();
        $events = $this->db->where('is_active', 1)->get('race_events')->result();
        $out = array();
        foreach ($events as $event) {
            $result = $this->sync_event($event->id);
            $out[] = array('id' => $event->id, 'message' => $result['message']);
        }
        return $out;
    }
}
