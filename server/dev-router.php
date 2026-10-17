<?php
/**
 * Local preview of the built site with PHP's own server (npm run serve):
 *   php -S 127.0.0.1:4330 -t dist server/dev-router.php
 * Mimics what .htaccess does on the webspace. Not uploaded.
 */
$path = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/');
$root = $_SERVER['DOCUMENT_ROOT'];

if (preg_match('#^/(_app|_data)(/|$)#', $path)) {
    http_response_code(403);
    exit('Forbidden');
}
if (is_dir($root . $path) && !str_ends_with($path, '/')) {
    header('Location: ' . $path . '/', true, 301);
    exit;
}
if (file_exists($root . $path) || is_file($root . rtrim($path, '/') . '/index.php')) return false;

http_response_code(404);
require $root . '/404.php';
