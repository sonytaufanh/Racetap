<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Welcome extends CI_Controller {

	/**
	 * Index Page for this controller.
	 *
	 * Maps to the following URL
	 * 		http://example.com/index.php/welcome
	 *	- or -
	 * 		http://example.com/index.php/welcome/index
	 *	- or -
	 * Since this controller is set as the default controller in
	 * config/routes.php, it's displayed at http://example.com/
	 *
	 * So any other public methods not prefixed with an underscore will
	 * map to /index.php/welcome/<method_name>
	 * @see https://codeigniter.com/userguide3/general/urls.html
	 */
	public function index()
	{
		
        // Data yang ingin dikirimkan ke view (opsional)
        //$data['title'] = 'Halaman Beranda';

        // Memanggil komponen view secara berurutan
        $this->load->view('public/partials/header');
        $this->load->view('public/partials/navbar');
        $this->load->view('public/partials/hero');
        
        // Memanggil file yang ada di dalam folder beranda
        $this->load->view('public/partials/beranda/stats');
        $this->load->view('public/partials/beranda/portofolio');
        //$this->load->view('public/partials/beranda/about');
        $this->load->view('public/partials/beranda/service');
        //$this->load->view('public/partials/beranda/client');
        $this->load->view('public/partials/beranda/proses');
        $this->load->view('public/partials/beranda/cta');
        
        $this->load->view('public/partials/footer');
    
	}

	public function services()
	{
		// Data yang ingin dikirimkan ke view (opsional)
        //$data['title'] = 'Halaman Beranda';

        // Memanggil komponen view secara berurutan
        $this->load->view('public/partials/header');
        $this->load->view('public/partials/navbar');
        $this->load->view('public/partials/beranda/breadcrumb');
        $this->load->view('public/partials/service/service-detail');
        $this->load->view('public/partials/beranda/cta');
        $this->load->view('public/partials/footer');
	}

	public function about()
	{
		// Data yang ingin dikirimkan ke view (opsional)
        //$data['title'] = 'Halaman Beranda';

        // Memanggil komponen view secara berurutan
        $this->load->view('public/partials/header');
        $this->load->view('public/partials/navbar');
        $this->load->view('public/partials/about/about-detail');
        $this->load->view('public/partials/beranda/cta');
        $this->load->view('public/partials/footer');
	}

	public function results()
	{
		// Data yang ingin dikirimkan ke view (opsional)
        //$data['title'] = 'Halaman Beranda';

        // Memanggil komponen view secara berurutan
        $this->load->view('public/partials/header');
        $this->load->view('public/partials/navbar');
        $this->load->view('public/partials/portfolio/portfolio');
        $this->load->view('public/partials/beranda/cta');
        $this->load->view('public/partials/footer');
	}
}
