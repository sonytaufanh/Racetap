<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Development utilities. CLI only.
 *
 * Usage:
 *   php index.php tools seed_photos
 */
class Tools extends CI_Controller
{
    public function __construct()
    {
        parent::__construct();

        if (!is_cli()) {
            show_error('This controller is CLI only.', 403);
        }

        $this->load->database();
        $this->load->model('Photo_repository');
    }

    public function seed_photos()
    {
        if (ENVIRONMENT === 'production') {
            echo "Refusing to seed in production.\n";
            return;
        }

        $path = FCPATH . 'assets/data/photos.json';

        if (!is_file($path)) {
            echo "Seed file not found: $path\n";
            return;
        }

        $decoded = json_decode(file_get_contents($path), TRUE);

        if (!is_array($decoded) || empty($decoded['events'])) {
            echo "Seed file is not valid JSON.\n";
            return;
        }

        $event_count = 0;
        $photo_count = 0;
        $now = date('Y-m-d H:i:s');

        foreach ($decoded['events'] as $event) {
            if (empty($event['slug']) || empty($event['name'])) {
                continue;
            }

            $existing = $this->db->where('slug', $event['slug'])->get('photo_events')->row_array();

            if ($existing) {
                $event_id = (int) $existing['id'];
            } else {
                $this->db->insert('photo_events', array(
                    'slug' => $event['slug'],
                    'name' => $event['name'],
                    'location' => isset($event['location']) ? $event['location'] : '',
                    'event_date' => !empty($event['event_date']) ? $event['event_date'] : NULL,
                    'cover' => isset($event['cover']) ? $event['cover'] : '',
                    'description' => isset($event['description']) ? $event['description'] : '',
                    'photographer' => isset($event['photographer']) ? $event['photographer'] : '',
                    'is_active' => 1,
                    'created_at' => $now,
                    'updated_at' => $now
                ));

                $event_id = (int) $this->db->insert_id();
                $event_count++;
            }

            foreach ((array) (isset($event['photos']) ? $event['photos'] : array()) as $photo) {
                if (empty($photo['file'])) {
                    continue;
                }

                $exists = $this->db->where(array('event_id' => $event_id, 'file' => $photo['file']))->count_all_results('photos');

                if ($exists > 0) {
                    continue;
                }

                $bib = isset($photo['bib']) ? trim((string) $photo['bib']) : '';

                $this->db->insert('photos', array(
                    'event_id' => $event_id,
                    'file' => $photo['file'],
                    'bib' => $bib !== '' ? $bib : NULL,
                    'ocr_text' => isset($photo['ocr_text']) ? $photo['ocr_text'] : $bib,
                    'ocr_confidence' => isset($photo['ocr_confidence']) ? (float) $photo['ocr_confidence'] : 0,
                    'ocr_source' => 'tesseract',
                    'ocr_indexed_at' => $bib !== '' ? $now : NULL,
                    'captured_at' => isset($photo['captured_at']) ? $photo['captured_at'] : '',
                    'category' => isset($photo['category']) ? $photo['category'] : '',
                    'original_name' => basename($photo['file']),
                    'created_at' => $now,
                    'updated_at' => $now
                ));

                $photo_count++;
            }
        }

        echo "Seed complete. New events: $event_count, new photos: $photo_count.\n";
    }

    public function stats()
    {
        $this->load->model('Photo_repository');
        echo json_encode($this->Photo_repository->stats(), JSON_PRETTY_PRINT) . "\n";
    }
}
