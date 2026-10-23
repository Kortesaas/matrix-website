<?php
/**
 * The contact form's endpoint (Mitmachen → Kontakt).
 *   GET  → { token, siteKey } (siteKey empty when reCAPTCHA isn't configured)
 *   POST → name, email (optional), topic, message, token, captcha, website (honeypot)
 * Answers with JSON: { ok: true } or { ok: false, message, fields? }.
 */
declare(strict_types=1);

require_once __DIR__ . '/../_app/bootstrap.php';
require_once __DIR__ . '/../_app/contact.php';

use Matrix\Contact;

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
if ($method === 'GET') answer(200, ['token' => Contact\token(), 'siteKey' => Contact\site_key()]);
if ($method !== 'POST') answer(405, ['ok' => false, 'message' => 'Nicht erlaubt.']);

// Only from our own pages.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$host = $_SERVER['HTTP_HOST'] ?? '';
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) . (parse_url($origin, PHP_URL_PORT) ? ':' . parse_url($origin, PHP_URL_PORT) : '') !== $host) {
    answer(403, ['ok' => false, 'message' => 'Nicht erlaubt.']);
}

// Bots fill every field; people never see this one. Pretend it worked.
if (trim((string) ($_POST['website'] ?? '')) !== '') answer(200, ['ok' => true]);

[$data, $errors] = Contact\validate($_POST);
if ($errors) answer(422, ['ok' => false, 'message' => 'Bitte schau dir die markierten Felder noch einmal an.', 'fields' => $errors]);

$problem = Contact\token_problem((string) ($_POST['token'] ?? ''))
    ?? Contact\captcha_problem((string) ($_POST['captcha'] ?? ''))
    ?? Contact\rate_problem();
if ($problem) answer(400, ['ok' => false, 'message' => $problem]);

try {
    $sent = Contact\send($data);
} catch (Throwable $error) {
    error_log('Kontaktformular: ' . $error->getMessage());
    $sent = false;
}
if (!$sent) answer(502, ['ok' => false, 'message' => 'Deine Nachricht konnte gerade nicht verschickt werden. Versuch es bitte später noch einmal oder schreib uns direkt eine E-Mail.']);
answer(200, ['ok' => true]);
