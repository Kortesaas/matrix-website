<?php
/**
 * Serves images uploaded in the admin area from the data folder. File names
 * are random and never reused, so browsers may keep them for a year.
 */
declare(strict_types=1);

require_once __DIR__ . '/_app/bootstrap.php';
require_once __DIR__ . '/_app/images.php';

$file = is_string($_GET['f'] ?? null) ? $_GET['f'] : '';
$path = Matrix\Images\media_path($file);
if ($path === null) {
    http_response_code(404);
    exit;
}

$etag = '"' . filemtime($path) . '-' . filesize($path) . '"';
header('Content-Type: ' . (str_ends_with($path, '.webp') ? 'image/webp' : 'image/jpeg'));
header('Cache-Control: public, max-age=31536000, immutable');
header('X-Content-Type-Options: nosniff');
header("ETag: $etag");
if (trim($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) {
    http_response_code(304);
    exit;
}
header('Content-Length: ' . filesize($path));
readfile($path);
