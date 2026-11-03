<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/*
| -------------------------------------------------------------------------
| URI ROUTING
| -------------------------------------------------------------------------
| The public site is a React SPA served by Spa::index for every non-API path.
| The JSON API keeps its explicit routes and must stay above the catch-alls.
| Legacy prefixes get permanent redirects so old links keep working.
| -------------------------------------------------------------------------
*/

$route['default_controller'] = 'spa';

// ---------------------------------------------------------------------------
// JSON API (v1)
// ---------------------------------------------------------------------------
$route['api/v1/photos/events'] = 'api/api_photos/events';
$route['api/v1/photos/events/(:any)/download'] = 'api/api_photos/download/$1';
$route['api/v1/photos/events/(:any)'] = 'api/api_photos/event/$1';

$route['api/v1/health'] = 'api/api_health/index';
$route['api/v1/content'] = 'api/api_content/index';

$route['api/v1/admin/content'] = 'api/api_admin_content/index';
$route['api/v1/admin/content/(:any)'] = 'api/api_admin_content/reset/$1';

$route['api/v1/admin/events'] = 'api/api_admin_events/index';
$route['api/v1/admin/events/(:num)/data'] = 'api/api_admin_events/data/$1';
$route['api/v1/admin/events/(:num)/banner'] = 'api/api_admin_events/banner/$1';
$route['api/v1/admin/events/(:num)/publish'] = 'api/api_admin_events/publish/$1';
$route['api/v1/admin/events/(:num)'] = 'api/api_admin_events/event/$1';

$route['api/v1/admin/certificates'] = 'api/api_admin_certificates/index';
$route['api/v1/admin/certificates/(:any)/template'] = 'api/api_admin_certificates/template/$1';
$route['api/v1/admin/certificates/(:any)/sample'] = 'api/api_admin_certificates/sample/$1';
$route['api/v1/admin/certificates/(:any)'] = 'api/api_admin_certificates/event/$1';

$route['api/v1/admin/media'] = 'api/api_admin_media/index';
$route['api/v1/admin/media/(:num)'] = 'api/api_admin_media/item/$1';

$route['api/v1/admin/kiosk'] = 'api/api_admin_kiosk/index';
$route['api/v1/admin/seo'] = 'api/api_admin_seo/index';

$route['api/v1/settings'] = 'api/api_settings/index';
$route['api/v1/search'] = 'api/api_search/index';
$route['api/v1/leads'] = 'api/api_leads/index';

$route['api/v1/admin/stats'] = 'api/api_admin_stats/index';
$route['api/v1/admin/media/check'] = 'api/api_admin_media/check';
$route['api/v1/admin/settings'] = 'api/api_admin_settings/index';
$route['api/v1/admin/audit'] = 'api/api_admin_audit/index';
$route['api/v1/admin/users'] = 'api/api_admin_users/index';
$route['api/v1/admin/users/create'] = 'api/api_admin_users/store';
$route['api/v1/admin/users/(:num)'] = 'api/api_admin_users/user/$1';
$route['api/v1/admin/leads'] = 'api/api_admin_leads/index';
$route['api/v1/admin/leads/(:num)'] = 'api/api_admin_leads/lead/$1';

$route['api/v1/auth/session'] = 'api/api_auth/session';
$route['api/v1/auth/login'] = 'api/api_auth/login';
$route['api/v1/auth/logout'] = 'api/api_auth/logout';
$route['api/v1/auth/setup'] = 'api/api_auth/setup';

$route['api/v1/admin/photos/events'] = 'api/api_admin_photos/events';
$route['api/v1/admin/photos/events/(:num)/photos'] = 'api/api_admin_photos/upload/$1';
$route['api/v1/admin/photos/events/(:num)/cover'] = 'api/api_admin_photos/cover/$1';
$route['api/v1/admin/photos/events/(:num)/ocr'] = 'api/api_admin_photos/ocr_event/$1';
$route['api/v1/admin/photos/events/(:num)'] = 'api/api_admin_photos/event/$1';
$route['api/v1/admin/photos/photos/(:num)/ocr-result'] = 'api/api_admin_photos/ocr_result/$1';
$route['api/v1/admin/photos/photos/(:num)/ocr'] = 'api/api_admin_photos/ocr_photo/$1';
$route['api/v1/admin/photos/photos/(:num)'] = 'api/api_admin_photos/photo/$1';

$route['api/v1/admin/races/(:num)/results'] = 'api/api_admin_races/results/$1';
$route['api/v1/admin/races/(:num)/sync'] = 'api/api_admin_races/sync/$1';
$route['api/v1/admin/races/(:num)/toggle'] = 'api/api_admin_races/toggle/$1';
$route['api/v1/admin/races/(:num)'] = 'api/api_admin_races/race/$1';
$route['api/v1/admin/races'] = 'api/api_admin_races/index';

// CLI utilities (they are guarded by is_cli() in the controllers).
$route['tools/(:any)/(:any)'] = 'tools/$1/$2';
$route['tools/(:any)'] = 'tools/$1';
$route['cron_race_sync/(:any)'] = 'cron_race_sync/$1';

// Unknown API paths must answer JSON 404, never the HTML SPA shell.
$route['api/v1/(:any)'] = 'api/api_not_found/index';
$route['api/v1/(:any)/(:any)'] = 'api/api_not_found/index';
$route['api/v1/(:any)/(:any)/(:any)'] = 'api/api_not_found/index';
$route['api/v1/(:any)/(:any)/(:any)/(:any)'] = 'api/api_not_found/index';

// ---------------------------------------------------------------------------
// Legacy redirects (301)
// ---------------------------------------------------------------------------
$route['v2'] = 'spa/legacy';
$route['v2/(:any)'] = 'spa/legacy/$1';
$route['v2/(:any)/(:any)'] = 'spa/legacy/$1/$2';
$route['v2/(:any)/(:any)/(:any)'] = 'spa/legacy/$1/$2/$3';

$route['welcome'] = 'spa/legacy/welcome';
$route['welcome/(:any)'] = 'spa/legacy/$1';

// ---------------------------------------------------------------------------
// React SPA (public site + admin)
// ---------------------------------------------------------------------------
$route['admin'] = 'spa/index';
$route['admin/(:any)'] = 'spa/index';
$route['admin/(:any)/(:any)'] = 'spa/index';
$route['admin/(:any)/(:any)/(:any)'] = 'spa/index';
$route['admin/(:any)/(:any)/(:any)/(:any)'] = 'spa/index';

$route['(:any)'] = 'spa/index';
$route['(:any)/(:any)'] = 'spa/index';
$route['(:any)/(:any)/(:any)'] = 'spa/index';
$route['(:any)/(:any)/(:any)/(:any)'] = 'spa/index';

$route['404_override'] = '';
$route['translate_uri_dashes'] = FALSE;
