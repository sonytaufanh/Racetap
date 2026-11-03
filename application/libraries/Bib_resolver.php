<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Validates and ranks OCR candidates against the event's known bib whitelist.
 *
 * Input words come from any OCR engine (Vision, RapidOCR, Azure, OCR.space or
 * Tesseract) in a unified shape: array of arrays with `text`, `confidence`
 * (0-100) and an optional `box` array [x0, y0, x1, y1].
 *
 * A per-event rule narrows what counts as a bib:
 *   array('digitsOnly' => TRUE, 'digits' => 4)
 * `digitsOnly` drops alphanumeric candidates, `digits` (1-12) pins the exact
 * number of digits, and 0 keeps the legacy 3-6 digit range. Letters that look
 * like digits (O, I, S, B, Z, G, ...) are always mapped first, so "O123" is
 * still read as "0123".
 */
class Bib_resolver
{
    const MIN_LEN = 3;
    const MAX_LEN = 6;
    const MAX_ALPHA_LEN = 12;
    const MAX_DIGITS = 12;
    const MAX_BIBS = 8;

    public function resolve($words, $text, $known = array(), $limit = self::MAX_BIBS, $rule = array())
    {
        $range = $this->rule_range($rule);
        $known_set = array();
        $known_trim = array();
        $known_confused = array();

        foreach ((array) $known as $bib) {
            $clean = $this->normalize($bib);

            if ($clean !== '') {
                $known_set[$clean] = $clean;
                $known_trim[ltrim($clean, '0')] = $clean;

                $confused = $this->confuse($clean);

                if (!isset($known_confused[$confused])) {
                    $known_confused[$confused] = $clean;
                }
            }
        }

        $has_whitelist = !empty($known_set);
        $candidates = array();

        foreach ((array) $words as $word) {
            $raw = isset($word['text']) ? (string) $word['text'] : '';

            if ($raw === '' || $this->is_time_like($raw)) {
                continue;
            }

            $raw_has_letters = (bool) preg_match('/[A-Za-z]/', $raw);

            $matches = array();

            if (preg_match_all($range['digit_pattern'], $raw, $tokens)) {
                $matches = $tokens[1];
            }

            if ($range['alpha_pattern'] !== NULL && preg_match_all($range['alpha_pattern'], strtoupper($raw), $tokens)) {
                foreach ($tokens[1] as $token) {
                    if (!in_array($token, $matches, TRUE)) {
                        $matches[] = $token;
                    }
                }
            }

            // When the rule demands digits, retry tokens that mix digits with
            // look-alike letters ("3O21" -> "3021"). Only tokens that are fully
            // accounted for by digits + confusables qualify, so "SUBANG" and
            // "MH2001" are never turned into fake bibs.
            if ($range['digits_only']) {
                foreach ($this->confusable_digits($raw, $range) as $token) {
                    if (!in_array($token, $matches, TRUE)) {
                        $matches[] = $token;
                    }
                }
            }

            // A whitelist can still rescue a token the rule rejected, e.g. the
            // OCR reading "14127" for bib 1412. Without a whitelist there is no
            // evidence the shorter reading is right, so the rule stays strict.
            if ($has_whitelist) {
                foreach ($this->whitelist_digits($raw, $known_set, $range) as $token) {
                    if (!in_array($token, $matches, TRUE)) {
                        $matches[] = $token;
                    }
                }
            }

            if (empty($matches)) {
                continue;
            }

            $confidence = isset($word['confidence']) ? max(0.0, min(100.0, (float) $word['confidence'])) : 50.0;
            $area = $this->area(isset($word['box']) ? $word['box'] : NULL);

            foreach ($matches as $token) {
                $token = strtoupper($token);
                $token_confidence = $confidence;

                // Event banners ("FOR CHARITY 2025") are not bib numbers.
                if ($raw_has_letters && $this->is_year($token)) {
                    continue;
                }

                if ($has_whitelist) {
                    $penalty = 0.0;
                    $canonical = $this->canonical($token, $known_set, $known_trim, $known_confused, $penalty, $range);

                    if ($canonical === NULL) {
                        continue;
                    }

                    $token = $canonical;
                    $token_confidence = max(0.0, $token_confidence - $penalty);
                } else {
                    if (strlen($token) > $range['max']) {
                        continue;
                    }

                    if ($this->is_year($token)) {
                        continue;
                    }

                    if ($this->is_distance($token)) {
                        continue;
                    }

                    if ($this->looks_like_time_token($raw, $token)) {
                        continue;
                    }
                }

                $score = $token_confidence + (0.5 * log(max(1.0, $area) + 1));

                if (!isset($candidates[$token]) || $candidates[$token]['score'] < $score) {
                    $candidates[$token] = array(
                        'bib' => $token,
                        'confidence' => $token_confidence,
                        'score' => $score
                    );
                }
            }
        }

        if (empty($candidates) && $text !== '') {
            $candidates = $this->fallback_text($text, $known_set, $known_trim, $known_confused, $has_whitelist, $range);
        }

        $ordered = array_values($candidates);
        usort($ordered, function ($a, $b) {
            return $b['score'] <=> $a['score'];
        });

        $top = array_slice($ordered, 0, $limit);

        foreach ($top as &$entry) {
            unset($entry['score']);
        }

        return $top;
    }

    /**
     * Effective digit range + regexes for a rule.
     *
     * @return array{min:int, max:int, alpha_min:int, alpha_max:int, digits_only:bool, digit_pattern:string, alpha_pattern:?string}
     */
    public function rule_range($rule)
    {
        $rule = is_array($rule) ? $rule : array();
        $digits_only = array_key_exists('digitsOnly', $rule) ? (bool) $rule['digitsOnly'] : TRUE;
        $digits = isset($rule['digits']) ? (int) $rule['digits'] : 0;

        if ($digits >= 1 && $digits <= self::MAX_DIGITS) {
            $min = $digits;
            $max = $digits;
            $alpha_min = $digits;
            $alpha_max = $digits;
        } else {
            $min = self::MIN_LEN;
            $max = self::MAX_LEN;
            $alpha_min = self::MIN_LEN;
            $alpha_max = self::MAX_ALPHA_LEN;
        }

        return array(
            'min' => $min,
            'max' => $max,
            'alpha_min' => $alpha_min,
            'alpha_max' => $alpha_max,
            'digits_only' => $digits_only,
            // Digit boundaries keep a 5-digit run from satisfying a 4-digit rule.
            'digit_pattern' => '/(?<![0-9])([0-9]{' . $min . ',' . $max . '})(?![0-9])/',
            'alpha_pattern' => $digits_only ? NULL : '/(?<![0-9A-Z])([0-9A-Z]{' . $alpha_min . ',' . $alpha_max . '})(?![0-9A-Z])/'
        );
    }

    public function primary_bib(array $resolved)
    {
        return !empty($resolved) ? $resolved[0]['bib'] : '';
    }

    public function bib_list(array $resolved)
    {
        $bibs = array();

        foreach ($resolved as $entry) {
            $bibs[] = $entry['bib'];
        }

        return $bibs;
    }

    private function fallback_text($text, $known_set, $known_trim, $known_confused, $has_whitelist, $range)
    {
        $candidates = array();
        $haystack = strtoupper((string) $text);
        $tokens = array();

        if (preg_match_all($range['digit_pattern'], $haystack, $matches)) {
            $tokens = $matches[1];
        }

        if ($range['alpha_pattern'] !== NULL && preg_match_all($range['alpha_pattern'], $haystack, $matches)) {
            foreach ($matches[1] as $token) {
                if (!in_array($token, $tokens, TRUE)) {
                    $tokens[] = $token;
                }
            }
        }

        foreach ($tokens as $token) {
            $token = strtoupper($token);

            if ($has_whitelist) {
                $penalty = 0.0;
                $canonical = $this->canonical($token, $known_set, $known_trim, $known_confused, $penalty, $range);

                if ($canonical === NULL) {
                    continue;
                }

                $token = $canonical;
            } elseif ($this->is_year($token) || $this->is_distance($token) || strlen($token) > $range['max']) {
                continue;
            }

            $candidates[$token] = array('bib' => $token, 'confidence' => 30.0, 'score' => 30.0);
        }

        return $candidates;
    }

    /**
     * Maps an OCR token to the canonical whitelist bib. Returns NULL when the
     * token does not belong to the event. Sets $penalty (confidence points)
     * for fuzzy matches so exact reads still rank first.
     */
    private function canonical($token, $known_set, $known_trim, $known_confused, &$penalty, $range)
    {
        $penalty = 0.0;

        if (isset($known_set[$token])) {
            return $token;
        }

        $trimmed = ltrim($token, '0');

        if (isset($known_trim[$trimmed])) {
            return $known_trim[$trimmed];
        }

        $confused = $this->confuse($token);

        if (isset($known_confused[$confused])) {
            $penalty = 3.0;

            return $known_confused[$confused];
        }

        // OCR sometimes glues an extra digit (e.g. "14127" for bib 1412), so a
        // token that is exactly one or two digits longer than the rule may
        // still be the real bib.
        if (ctype_digit($token)) {
            for ($drop = 1; $drop <= 2; $drop++) {
                $length = strlen($token) - $drop;

                if ($length < $range['min'] || $length > $range['max']) {
                    continue;
                }

                $prefix = substr($token, 0, -$drop);

                if (isset($known_set[$prefix])) {
                    $penalty = 6.0;

                    return $prefix;
                }

                $suffix = substr($token, $drop);

                if (isset($known_set[$suffix])) {
                    $penalty = 6.0;

                    return $suffix;
                }
            }
        }

        return NULL;
    }

    /**
     * Digit tokens the rule rejected but that match the known bib list anyway
     * (a glued read such as "14127" for bib 1412). Only returns canonical
     * whitelist entries, so it can never invent a bib.
     *
     * @return string[]
     */
    private function whitelist_digits($raw, $known_set, $range)
    {
        $upper = strtoupper((string) $raw);

        if (!preg_match_all('/([0-9]{1,12})/', $upper, $matches)) {
            return array();
        }

        $out = array();

        foreach ($matches[1] as $token) {
            $length = strlen($token);

            if ($length >= $range['min'] && $length <= $range['max']) {
                // Already offered by the rule-based pass.
                continue;
            }

            for ($drop = 1; $drop <= 2; $drop++) {
                $candidate_length = $length - $drop;

                if ($candidate_length < $range['min'] || $candidate_length > $range['max']) {
                    continue;
                }

                foreach (array(substr($token, 0, -$drop), substr($token, $drop)) as $candidate) {
                    if ($this->confuse($candidate) !== '' && isset($known_set[$candidate])) {
                        $out[] = $candidate;
                    }
                }
            }
        }

        return array_values(array_unique($out));
    }

    private function normalize($value)
    {
        return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) $value));
    }

    /**
     * Digit candidates inside a token that mixes digits with look-alike letters.
     *
     * Only segments where every character is either a digit or an unambiguous
     * numeral look-alike qualify, and the mapped length must match the rule.
     *
     * @return string[] Canonical digit strings (possibly empty).
     */
    private function confusable_digits($raw, $range)
    {
        $upper = strtoupper((string) $raw);

        if (!preg_match('/[0-9]/', $upper) || !preg_match('/[A-Z]/', $upper)) {
            return array();
        }

        // Split on letters that are not numeral look-alikes ("SUBANG" -> safe).
        $segments = preg_split('/[^0-9OQDUJILSBZGT]+/', $upper, -1, PREG_SPLIT_NO_EMPTY);

        if ($segments === FALSE) {
            return array();
        }

        $out = array();

        foreach ($segments as $segment) {
            $mapped = $this->confuse($segment);
            $length = strlen($mapped);

            if ($length < $range['alpha_min'] || $length > $range['max']) {
                continue;
            }

            if (!ctype_digit($mapped)) {
                continue;
            }

            $out[] = $mapped;
        }

        return $out;
    }

    /** Common OCR letter/digit confusions used as a second-pass whitelist match. */
    private function confuse($value)
    {
        return strtr((string) $value, array(
            'O' => '0',
            'Q' => '0',
            'D' => '0',
            'I' => '1',
            'L' => '1',
            'S' => '5',
            'B' => '8',
            'Z' => '2',
            'G' => '6',
            'U' => '0',
            'J' => '1',
            'T' => '7'
        ));
    }

    private function is_time_like($text)
    {
        return (bool) preg_match('/\d{1,2}:\d{2}(:\d{2})?/', $text);
    }

    private function looks_like_time_token($raw, $token)
    {
        $pos = strpos($raw, $token);

        if ($pos === FALSE) {
            return FALSE;
        }

        $before = $pos > 0 ? substr($raw, $pos - 1, 1) : '';
        $after = substr($raw, $pos + strlen($token), 1);

        return $before === ':' || $after === ':';
    }

    private function is_year($token)
    {
        $value = (int) ltrim($token, '0');

        return strlen($token) === 4 && $value >= 1900 && $value <= 2099;
    }

    private function is_distance($token)
    {
        if (preg_match('/^(5|10|21|42)K(M)?$/i', $token)) {
            return TRUE;
        }

        $value = (int) ltrim($token, '0');

        return in_array($value, array(5, 10, 21, 42, 42195), TRUE) && strlen($token) <= 5;
    }

    private function area($box)
    {
        if (!is_array($box)) {
            return 0.0;
        }

        $x0 = isset($box[0]) ? (float) $box[0] : 0.0;
        $y0 = isset($box[1]) ? (float) $box[1] : 0.0;
        $x1 = isset($box[2]) ? (float) $box[2] : 0.0;
        $y1 = isset($box[3]) ? (float) $box[3] : 0.0;

        if ($x1 <= $x0 || $y1 <= $y0) {
            return 0.0;
        }

        return ($x1 - $x0) * ($y1 - $y0);
    }
}
