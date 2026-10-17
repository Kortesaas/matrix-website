<?php
/**
 * The Termine for the website, straight from Google Calendar (or any iCal
 * feed set in the admin area under "Kalender"). Fetched on our server and
 * kept for a few minutes, so visitors never contact Google and the feed's
 * address stays private. The browser reads the result with ics.ts.
 */
declare(strict_types=1);

require_once __DIR__ . '/../_app/bootstrap.php';
require_once __DIR__ . '/../_app/calendar.php';

$result = Matrix\Calendar\feed();

header('Content-Type: text/calendar; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: public, max-age=120');
if ($result['stale']) header('X-Calendar-Stale: 1');

if ($result['ics'] === null) {
    http_response_code(502);
    header('Cache-Control: no-store');
    exit;
}

$etag = '"' . md5($result['ics']) . '"';
header("ETag: $etag");
if (trim($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) {
    http_response_code(304);
    exit;
}

// Calendar files shrink to a tenth when compressed.
if (!ini_get('zlib.output_compression') && str_contains($_SERVER['HTTP_ACCEPT_ENCODING'] ?? '', 'gzip')) {
    ob_start('ob_gzhandler');
}
echo $result['ics'];
