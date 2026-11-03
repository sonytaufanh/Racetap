<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Fallback for unknown /api/v1 paths.
 *
 * Without it, unmatched API URLs fall through to the SPA catch-all route and
 * answer 200 with an HTML shell, which breaks JSON clients. This controller
 * keeps the API surface honest: JSON + 404.
 */
class Api_not_found extends CI_Controller
{
    public function index()
    {
        $body = array(
            'data' => NULL,
            'error' => array('message' => 'Endpoint tidak ditemukan.')
        );

        $this->output
            ->set_status_header(404)
            ->set_content_type('application/json', 'utf-8')
            ->set_output(json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }
}
