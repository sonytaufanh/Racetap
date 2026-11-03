<?php
/**
 * Router for PHP's built-in server, emulating the production .htaccess:
 * real files are served as-is, everything else goes through CodeIgniter.
 *
 *   php -S 127.0.0.1:8080 -t . router.php
 */
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = rawurldecode((string) $path);
$path = '/' . ltrim($path, '/');

if (strpos($path, '..') !== false || strpos($path, "\0") !== false) {
    http_response_code(400);
    exit('Bad request');
}

$file = __DIR__ . $path;

// Real files are streamed by the built-in server unchanged.
if ($path !== '/' && is_file($file)) {
    return false;
}

// Directories with an index.html (results/<slug>/, <kiosk>.racetap.id/) are
// served explicitly: the built-in server refuses dotted directory names.
if (is_dir($file)) {
    $index = rtrim($file, '/') . '/index.html';

    if (is_file($index)) {
        header('Content-Type: text/html; charset=UTF-8');
        readfile($index);
        return true;
    }
}

$_SERVER['SCRIPT_NAME'] = '/index.php';
require __DIR__ . '/index.php';
