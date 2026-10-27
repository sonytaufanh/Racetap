<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Photos extends CI_Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->load->model('Photo_model');
        $this->load->helper('url');
    }

    public function index()
    {
        $data['events'] = $this->Photo_model->all_events();
        $data['stats'] = $this->Photo_model->stats();

        $this->load->view('public/partials/header');
        $this->load->view('public/partials/navbar');
        $this->load->view('public/partials/photos/index', $data);
        $this->load->view('public/partials/beranda/cta');
        $this->load->view('public/partials/footer');
    }

    public function event($slug = '')
    {
        $event = $this->Photo_model->get_event_by_slug($slug);

        if (!$event) {
            show_404();
            return;
        }

        $query = (string) $this->input->get('bib', TRUE);
        $bib = substr(preg_replace('/[^0-9]/', '', $query), 0, 12);

        $photos = $event['photos'];

        foreach ($photos as $index => $photo) {
            $photos[$index]['matches'] = $this->Photo_model->photo_matches($photo, $bib);
        }

        $data['event'] = $event;
        $data['bib'] = $bib;
        $data['photos'] = $photos;
        $data['match_count'] = $bib === '' ? count($photos) : count($this->Photo_model->search_photos($event, $bib));

        $this->load->view('public/partials/header');
        $this->load->view('public/partials/navbar');
        $this->load->view('public/partials/photos/event', $data);
        $this->load->view('public/partials/footer');
    }
}
