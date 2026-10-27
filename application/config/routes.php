<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/*
| -------------------------------------------------------------------------
| URI ROUTING
| -------------------------------------------------------------------------
| This file lets you re-map URI requests to specific controller functions.
|
| Typically there is a one-to-one relationship between a URL string
| and its corresponding controller class/method. The segments in a
| URL normally follow this pattern:
|
|	example.com/class/method/id/
|
| In some instances, however, you may want to remap this relationship
| so that a different class/function is called than the one
| corresponding to the URL.
|
| Please see the user guide for complete details:
|
|	https://codeigniter.com/userguide3/general/routing.html
|
| -------------------------------------------------------------------------
| RESERVED ROUTES
| -------------------------------------------------------------------------
|
| There are three reserved routes:
|
|	$route['default_controller'] = 'welcome';
|
| This route indicates which controller class should be loaded if the
| URI contains no data. In the above example, the "welcome" class
| would be loaded.
|
|	$route['404_override'] = 'errors/page_missing';
|
| This route will tell the Router which controller/method to use if those
| provided in the URL cannot be matched to a valid route.
|
|	$route['translate_uri_dashes'] = FALSE;
|
| This is not exactly a route, but allows you to automatically route
| controller and method names that contain dashes. '-' isn't a valid
| class or method name character, so it requires translation.
| When you set this option to TRUE, it will replace ALL dashes in the
| controller and method URI segments.
|
| Examples:	my-controller/index	-> my_controller/index
|		my-controller/my-method	-> my_controller/my_method
*/
$route['default_controller'] = 'welcome';
$route['about'] = 'welcome/about';
$route['services'] = 'welcome/services';
$route['results'] = 'welcome/results';
$route['photos'] = 'photos/index';
$route['photos/(:any)'] = 'photos/event/$1';
$route['hasil'] = 'results';

// ---------------------------------------------------------------------------
// JSON API (v1)
// ---------------------------------------------------------------------------
$route['api/v1/photos/events'] = 'api/api_photos/events';
$route['api/v1/photos/events/(:any)'] = 'api/api_photos/event/$1';

$route['api/v1/races'] = 'api/api_races/index';
$route['api/v1/races/(:any)'] = 'api/api_races/show/$1';

$route['api/v1/live-results'] = 'api/api_live_results/index';

$route['api/v1/auth/session'] = 'api/api_auth/session';
$route['api/v1/auth/login'] = 'api/api_auth/login';
$route['api/v1/auth/logout'] = 'api/api_auth/logout';
$route['api/v1/auth/setup'] = 'api/api_auth/setup';

$route['api/v1/admin/photos/events'] = 'api/api_admin_photos/events';
$route['api/v1/admin/photos/events/(:num)/photos'] = 'api/api_admin_photos/upload/$1';
$route['api/v1/admin/photos/events/(:num)/cover'] = 'api/api_admin_photos/cover/$1';
$route['api/v1/admin/photos/events/(:num)/ocr'] = 'api/api_admin_photos/ocr_event/$1';
$route['api/v1/admin/photos/events/(:num)'] = 'api/api_admin_photos/event/$1';
$route['api/v1/admin/photos/photos/(:num)/ocr'] = 'api/api_admin_photos/ocr_photo/$1';
$route['api/v1/admin/photos/photos/(:num)'] = 'api/api_admin_photos/photo/$1';

$route['api/v1/admin/races/(:num)/sync'] = 'api/api_admin_races/sync/$1';
$route['api/v1/admin/races/(:num)/toggle'] = 'api/api_admin_races/toggle/$1';
$route['api/v1/admin/races/(:num)'] = 'api/api_admin_races/race/$1';
$route['api/v1/admin/races'] = 'api/api_admin_races/index';

// ---------------------------------------------------------------------------
// React SPA (preview at /v2, ready to take over the root routes after review)
// ---------------------------------------------------------------------------
$route['v2'] = 'spa/index';
$route['v2/(:any)'] = 'spa/index';
$route['v2/(:any)/(:any)'] = 'spa/index';
$route['v2/(:any)/(:any)/(:any)'] = 'spa/index';
$route['v2/(:any)/(:any)/(:any)/(:any)'] = 'spa/index';
$route['v2/(:any)/(:any)/(:any)/(:any)/(:any)'] = 'spa/index';

$route['404_override'] = '';
$route['translate_uri_dashes'] = FALSE;

$route['admin/races'] = 'admin_races/index';
$route['admin/races/create'] = 'admin_races/create';
$route['admin/races/edit/(:num)'] = 'admin_races/edit/$1';
$route['admin/races/sync/(:num)'] = 'admin_races/sync/$1';
$route['admin/races/toggle/(:num)'] = 'admin_races/toggle/$1';
$route['race/(:any)'] = 'race_results/index/$1';

$route['admin/login'] = 'admin_auth/login';
$route['admin/setup'] = 'admin_auth/setup';
$route['admin/logout'] = 'admin_auth/logout';
$route['admin'] = 'admin_auth/index';
