<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/Api_controller.php';

class Api_photos extends Api_controller
{
    public function __construct()
    {
        parent::__construct();
        $this->load->model('Photo_repository');
    }

    public function events()
    {
        if (!$this->only_methods(array('GET'))) {
            return;
        }

        $this->respond(array(
            'events' => $this->Photo_repository->events(),
            'stats' => $this->Photo_repository->stats()
        ));
    }

    public function event($slug = '')
    {
        if (!$this->only_methods(array('GET'))) {
            return;
        }

        $bib = preg_replace('/[^0-9]/', '', (string) $this->input->get('bib', TRUE));
        $bib = substr($bib, 0, 12);

        $event = $this->Photo_repository->get_event_by_slug($slug, $bib);

        if (!$event) {
            $this->fail('Event foto tidak ditemukan.', 404);
            return;
        }

        $this->respond(array(
            'event' => $event,
            'photos' => $event['photos'],
            'bib' => $bib,
            'match_count' => (int) $event['match_count']
        ));
    }
}
