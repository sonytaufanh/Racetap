<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/*
 * Minimal .env loader for the Racetap app.
 *
 * File lookup order:
 *   1. application/config/.env  (blocked from the web by application/.htaccess)
 *   2. application/.env
 *   3. <project>/.env
 *
 * Precedence: real environment variables > .env file > fallback value.
 */

if (!function_exists('racetap_env_values')) {
    function racetap_env_values()
    {
        static $values = NULL;

        if ($values !== NULL) {
            return $values;
        }

        $values = array();

        $candidates = array(
            APPPATH . 'config/.env',
            APPPATH . '.env',
            FCPATH . '.env'
        );

        foreach ($candidates as $path) {
            if (!is_file($path)) {
                continue;
            }

            $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

            if ($lines === FALSE) {
                continue;
            }

            foreach ($lines as $line) {
                $line = trim($line);

                if ($line === '' || $line[0] === '#' || strpos($line, '=') === FALSE) {
                    continue;
                }

                list($key, $value) = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);

                if ($value !== '' && ($value[0] === '"' || $value[0] === "'")) {
                    $value = substr($value, 1, -1);
                }

                if ($key !== '') {
                    $values[$key] = $value;
                }
            }

            break;
        }

        return $values;
    }
}

if (!function_exists('racetap_env')) {
    function racetap_env($key, $default = NULL)
    {
        $value = getenv($key);

        if ($value !== FALSE && $value !== '') {
            return $value;
        }

        $values = racetap_env_values();

        if (array_key_exists($key, $values)) {
            return $values[$key];
        }

        return $default;
    }
}
