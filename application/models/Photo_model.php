<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Photo_model extends CI_Model
{
    private $seed_path;
    private $events = NULL;

    public function __construct()
    {
        parent::__construct();
        $this->seed_path = FCPATH . 'assets/data/photos.json';
    }

    /**
     * Membaca seed data foto dari JSON.
     */
    private function events()
    {
        if ($this->events !== NULL) {
            return $this->events;
        }

        $this->events = array();

        if (!is_file($this->seed_path)) {
            return $this->events;
        }

        $raw = @file_get_contents($this->seed_path);

        if ($raw === FALSE) {
            return $this->events;
        }

        $decoded = json_decode($raw, TRUE);

        if (!is_array($decoded) || empty($decoded['events']) || !is_array($decoded['events'])) {
            return $this->events;
        }

        foreach ($decoded['events'] as $event) {
            if (!is_array($event) || empty($event['slug'])) {
                continue;
            }

            $photos = array();

            if (isset($event['photos']) && is_array($event['photos'])) {
                foreach ($event['photos'] as $photo) {
                    if (!is_array($photo)) {
                        continue;
                    }

                    $photos[] = $this->normalize_photo($photo, $event);
                }
            }

            $event['photos'] = $photos;
            $this->events[] = $event;
        }

        return $this->events;
    }

    private function normalize_photo($photo, $event)
    {
        $file = isset($photo['file']) ? (string) $photo['file'] : '';
        $bib = isset($photo['bib']) ? trim((string) $photo['bib']) : '';

        return array(
            'id' => isset($photo['id']) ? (string) $photo['id'] : sha1($file . $bib),
            'file' => $file,
            'bib' => $bib,
            'ocr_text' => isset($photo['ocr_text']) ? (string) $photo['ocr_text'] : $bib,
            'ocr_confidence' => isset($photo['ocr_confidence']) ? (float) $photo['ocr_confidence'] : 0,
            'captured_at' => isset($photo['captured_at']) ? (string) $photo['captured_at'] : '',
            'category' => isset($photo['category']) ? (string) $photo['category'] : '',
            'event_name' => isset($event['name']) ? (string) $event['name'] : '',
            'event_slug' => isset($event['slug']) ? (string) $event['slug'] : '',
            'matches' => TRUE
        );
    }

    public function all_events()
    {
        $out = array();

        foreach ($this->events() as $event) {
            $event['photo_count'] = count($event['photos']);
            $event['bib_count'] = $this->unique_bib_count($event['photos']);
            $event['ocr_indexed'] = $this->indexed_count($event['photos']);
            unset($event['photos']);
            $out[] = $event;
        }

        return $out;
    }

    public function get_event_by_slug($slug)
    {
        foreach ($this->events() as $event) {
            if ($event['slug'] === $slug) {
                $event['photo_count'] = count($event['photos']);
                $event['bib_count'] = $this->unique_bib_count($event['photos']);
                $event['ocr_indexed'] = $this->indexed_count($event['photos']);
                return $event;
            }
        }

        return NULL;
    }

    /**
     * Filter foto berdasarkan nomor dada. Indeks berasal dari OCR.
     */
    public function search_photos($event, $query)
    {
        $photos = isset($event['photos']) ? $event['photos'] : array();
        $digits = preg_replace('/[^0-9]/', '', (string) $query);

        if ($digits === '') {
            return $photos;
        }

        $matches = array();

        foreach ($photos as $photo) {
            if ($this->photo_matches($photo, $digits)) {
                $matches[] = $photo;
            }
        }

        return $matches;
    }

    public function photo_matches($photo, $query)
    {
        $digits = preg_replace('/[^0-9]/', '', (string) $query);

        if ($digits === '') {
            return TRUE;
        }

        $bib = isset($photo['bib']) ? preg_replace('/[^0-9]/', '', (string) $photo['bib']) : '';
        $ocr = isset($photo['ocr_text']) ? preg_replace('/[^0-9]/', '', (string) $photo['ocr_text']) : '';

        return strpos($bib, $digits) !== FALSE || strpos($ocr, $digits) !== FALSE;
    }

    public function stats()
    {
        $stats = array(
            'events' => 0,
            'photos' => 0,
            'bibs' => 0,
            'ocr_indexed' => 0
        );

        foreach ($this->all_events() as $event) {
            $stats['events']++;
            $stats['photos'] += (int) $event['photo_count'];
            $stats['bibs'] += (int) $event['bib_count'];
            $stats['ocr_indexed'] += (int) $event['ocr_indexed'];
        }

        return $stats;
    }

    private function unique_bib_count($photos)
    {
        $bibs = array();

        foreach ($photos as $photo) {
            if (!empty($photo['bib'])) {
                $bibs[(string) $photo['bib']] = TRUE;
            }
        }

        return count($bibs);
    }

    private function indexed_count($photos)
    {
        $count = 0;

        foreach ($photos as $photo) {
            if (!empty($photo['bib']) || !empty($photo['ocr_text'])) {
                $count++;
            }
        }

        return $count;
    }
}
