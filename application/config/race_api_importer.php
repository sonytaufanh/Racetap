<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/*
 * Interval sinkronisasi otomatis global untuk semua race aktif.
 * Misalnya 60 berarti cron akan mencoba sinkronisasi jika sinkronisasi
 * terakhir sudah berumur minimal 60 menit.
 */
$config['race_api_sync_interval_minutes'] = 60;
$config['race_api_connect_timeout'] = 10;
$config['race_api_timeout'] = 45;
$config['race_api_max_response_bytes'] = 10485760; // 10 MB
$config['race_api_allowed_hosts'] = array(
    'time.feibot.com'
);
