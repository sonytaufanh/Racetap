<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/Api_controller.php';

/**
 * Public CMS payload: editable content sections, published events and SEO.
 * The SPA merges these over its bundled defaults, so an empty database simply
 * means "use the defaults".
 */
class Api_content extends Api_controller
{
    public function index()
    {
        if (!$this->only_methods(array('GET'))) {
            return;
        }

        $locale = (string) $this->input->get('locale', TRUE);
        $locale = $locale === 'en' ? 'en' : 'id';

        $this->load->model('Cms_model');

        $seo = array();
        foreach ($this->Cms_model->seo($locale) as $key => $row) {
            $seo[$row['route']] = $row;
        }

        $this->respond(array(
            'locale' => $locale,
            'sections' => $this->Cms_model->sections($locale, TRUE),
            'events' => $this->Cms_model->events(TRUE),
            'seo' => $seo
        ));
    }
}
