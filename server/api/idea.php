<?php
/**
 * The whiteboard's "send my idea" endpoint (Gruppenraum).
 *   GET  → { token } for the form (must be a few seconds old when sending)
 *   POST → token, image (PNG, 900×600), note (optional), website (honeypot)
 * Answers with JSON: { ok: true } or { ok: false, message }.
 */
declare(strict_types=1);

require_once __DIR__ . '/../_app/bootstrap.php';
require_once __DIR__ . '/../_app/ideas.php';

use Matrix\Ideas;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function answer(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'GET') answer(200, ['token' => Ideas\token()]);
if ($method !== 'POST') answer(405, ['ok' => false, 'message' => 'Nicht erlaubt.']);

// Only from our own pages.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$host = $_SERVER['HTTP_HOST'] ?? '';
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) . (parse_url($origin, PHP_URL_PORT) ? ':' . parse_url($origin, PHP_URL_PORT) : '') !== $host) {
    answer(403, ['ok' => false, 'message' => 'Nicht erlaubt.']);
}

// Bots fill every field; people never see this one. Pretend it worked.
if (trim((string) ($_POST['website'] ?? '')) !== '') answer(200, ['ok' => true]);

$problem = Ideas\token_problem((string) ($_POST['token'] ?? ''));
if ($problem) answer(400, ['ok' => false, 'message' => $problem]);

$upload = $_FILES['image'] ?? null;
$bytes = $upload && ($upload['error'] ?? 1) === UPLOAD_ERR_OK && is_uploaded_file($upload['tmp_name']) ? (string) file_get_contents($upload['tmp_name']) : '';
$png = Ideas\clean_png($bytes);
if ($png === null) answer(400, ['ok' => false, 'message' => 'Die Zeichnung konnte nicht gelesen werden. Versuch es bitte noch einmal.']);

$note = trim(preg_replace('/\s+/u', ' ', (string) ($_POST['note'] ?? '')) ?? '');
$note = mb_substr($note, 0, Ideas\MAX_NOTE);

$problem = Ideas\rate_problem();
if ($problem) answer(429, ['ok' => false, 'message' => $problem]);

try {
    Ideas\add($png, $note);
} catch (Throwable $error) {
    error_log('Idee speichern: ' . $error->getMessage());
    answer(500, ['ok' => false, 'message' => 'Gerade klappt das Speichern nicht. Versuch es später noch einmal.']);
}
answer(200, ['ok' => true]);
