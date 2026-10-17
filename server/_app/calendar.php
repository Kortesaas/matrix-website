<?php
/**
 * Fetching and caching the iCal feed (used by api/calendar.php and the
 * "Kalender" page of the admin area).
 */
declare(strict_types=1);

namespace Matrix\Calendar;

use function Matrix\{data_path, settings};

const TTL_SECONDS = 600;
const MAX_BYTES = 15 * 1024 * 1024;
const EMPTY_CALENDAR = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//MatriX//Website//DE\r\nEND:VCALENDAR\r\n";

/** Accepts https:// and webcal:// addresses; returns the https form or null. */
function normalize_url(string $url): ?string
{
    $url = trim($url);
    if ($url === '') return null;
    $url = preg_replace('#^webcal://#i', 'https://', $url);
    if (!preg_match('#^https://#i', $url) || !filter_var($url, FILTER_VALIDATE_URL)) return null;
    return $url;
}

/** @return array{ics: string, error: null}|array{ics: null, error: string} */
function download(string $url): array
{
    $body = '';
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 3,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
        CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_USERAGENT => 'MatriX-Website/1.0 (+calendar)',
        CURLOPT_ENCODING => '',
        CURLOPT_WRITEFUNCTION => function ($ch, $chunk) use (&$body) {
            $body .= $chunk;
            return strlen($body) > MAX_BYTES ? 0 : strlen($chunk);
        },
    ]);
    $ok = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $error = curl_error($ch);

    if (!$ok) return ['ics' => null, 'error' => strlen($body) > MAX_BYTES ? 'Der Kalender ist zu groß.' : "Keine Verbindung ($error)."];
    if ($status !== 200) return ['ics' => null, 'error' => "Der Kalender antwortet mit Status $status. Stimmt die Adresse?"];
    if (!str_contains(substr($body, 0, 2000), 'BEGIN:VCALENDAR')) return ['ics' => null, 'error' => 'Unter der Adresse liegt kein iCal-Kalender.'];
    return ['ics' => $body, 'error' => null];
}

/**
 * Keeps only what the website shows. A secret Google address also delivers
 * private appointments and the e-mail addresses of organisers and guests;
 * none of that may leave the server, so it is removed before caching.
 */
function sanitize(string $ics): string
{
    $lines = explode("\n", preg_replace("/\r\n?/", "\n", $ics));
    // Unfold continuation lines first, so a removed property goes completely.
    $unfolded = [];
    foreach ($lines as $line) {
        if ($unfolded && ($line[0] ?? '') !== '' && ($line[0] === ' ' || $line[0] === "\t")) $unfolded[count($unfolded) - 1] .= substr($line, 1);
        else $unfolded[] = $line;
    }

    $drop = '/^(ATTENDEE|ORGANIZER|CONTACT|X-[A-Z0-9-]+|ATTACH|CONFERENCE)[;:]/i';
    $out = [];
    $event = null;
    $skipDepth = 0; // inside VALARM and similar nested blocks
    foreach ($unfolded as $line) {
        if ($line === '') continue;
        if ($event !== null) {
            if (preg_match('/^BEGIN:/i', $line) && !preg_match('/^BEGIN:VEVENT$/i', $line)) { $skipDepth++; continue; }
            if ($skipDepth > 0) { if (preg_match('/^END:/i', $line)) $skipDepth--; continue; }
            if (preg_match('/^END:VEVENT$/i', $line)) {
                $event[] = $line;
                $private = (bool) preg_grep('/^CLASS[;:].*(PRIVATE|CONFIDENTIAL)/i', $event);
                if (!$private) array_push($out, ...$event);
                $event = null;
                continue;
            }
            if (!preg_match($drop, $line)) $event[] = $line;
            continue;
        }
        if (preg_match('/^BEGIN:VEVENT$/i', $line)) { $event = [$line]; continue; }
        if (preg_match($drop, $line)) continue;
        $out[] = $line;
    }
    // Fold long lines again (RFC 5545: 75 octets), without splitting UTF-8.
    $folded = [];
    foreach ($out as $line) {
        while (strlen($line) > 75) {
            $cut = 75;
            while ($cut > 1 && (ord($line[$cut]) & 0xC0) === 0x80) $cut--;
            $folded[] = substr($line, 0, $cut);
            $line = ' ' . substr($line, $cut);
        }
        $folded[] = $line;
    }
    return implode("\r\n", $folded) . "\r\n";
}

/**
 * The feed, at most TTL_SECONDS old. If Google is unreachable the last copy
 * is served (stale) rather than an empty calendar.
 *
 * @return array{ics: ?string, stale: bool}
 */
function feed(): array
{
    $url = normalize_url(settings()['calendar_ics_url']);
    if ($url === null) {
        $demo = \Matrix\demo('calendar.ics');
        return ['ics' => $demo ? sanitize((string) file_get_contents($demo)) : EMPTY_CALENDAR, 'stale' => false];
    }

    $dir = data_path('cache');
    \Matrix\ensure_dir($dir);
    $file = "$dir/calendar-v2-" . substr(hash('sha256', $url), 0, 16) . '.ics';
    $fresh = fn () => is_file($file) && time() - filemtime($file) < TTL_SECONDS;
    if ($fresh()) return ['ics' => (string) file_get_contents($file), 'stale' => false];

    // One request refreshes; others wait briefly and read its result.
    $lock = fopen("$file.lock", 'c');
    flock($lock, LOCK_EX);
    try {
        clearstatcache(true, $file);
        if ($fresh()) return ['ics' => (string) file_get_contents($file), 'stale' => false];
        $result = download($url);
        if ($result['ics'] !== null) {
            $clean = sanitize($result['ics']);
            $tmp = tempnam($dir, '.tmp-');
            file_put_contents($tmp, $clean);
            rename($tmp, $file);
            return ['ics' => $clean, 'stale' => false];
        }
        if (is_file($file)) {
            touch($file, time() - TTL_SECONDS + 60); // retry in a minute
            return ['ics' => (string) file_get_contents($file), 'stale' => true];
        }
        return ['ics' => null, 'stale' => true];
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function clear_cache(): void
{
    foreach (glob(data_path('cache') . '/calendar-*') ?: [] as $file) @unlink($file);
}
