<?php
/**
 * Ideas sent from the whiteboard on the Gruppenraum page: a PNG of the
 * drawing plus an optional short note, stored in the data folder and shown
 * in the admin area under "Ideen".
 *
 * Spam protection without a third-party captcha (which would send visitor
 * data to Google and need a consent banner): a signed form token that must
 * be a few seconds old, a honeypot field, a limit per visitor and a daily
 * limit for the whole site. Visitors are told on the page not to draw names
 * or contact details; nothing personal is stored (the IP only as a salted
 * hash for the limits, dropped after a day).
 */
declare(strict_types=1);

namespace Matrix\Ideas;

use function Matrix\{data_path, read_json, update_json, ensure_dir, random_id, write_json};

const WIDTH = 900;
const HEIGHT = 600;
const MAX_BYTES = 900_000;
const MAX_NOTE = 300;
const TOKEN_MIN_AGE = 4;        // seconds: bots post right away
const TOKEN_MAX_AGE = 3 * 3600; // a drawing session may take a while
const PER_VISITOR_HOUR = 3;
const PER_VISITOR_DAY = 8;
const PER_DAY_TOTAL = 60;
const MAX_STORED = 500;

function dir(): string
{
    $dir = data_path('ideas');
    ensure_dir($dir);
    return $dir;
}

/** A random key for signing form tokens, created on first use. */
function secret(): string
{
    $saved = read_json('ideas-secret.json');
    if (is_array($saved) && !empty($saved['key'])) return $saved['key'];
    $key = random_id(32);
    write_json('ideas-secret.json', ['key' => $key]);
    return $key;
}

function token(): string
{
    $time = (string) time();
    return $time . '.' . hash_hmac('sha256', $time, secret());
}

function token_problem(string $token): ?string
{
    [$time, $mac] = array_pad(explode('.', $token, 2), 2, '');
    if (!ctype_digit($time) || !hash_equals(hash_hmac('sha256', $time, secret()), $mac)) return 'Bitte lade die Seite neu und versuch es noch einmal.';
    $age = time() - (int) $time;
    if ($age < TOKEN_MIN_AGE) return 'Nicht so schnell! Versuch es gleich noch einmal.';
    if ($age > TOKEN_MAX_AGE) return 'Die Seite war zu lange offen. Bitte lade sie neu, deine Zeichnung bleibt leider nicht erhalten.';
    return null;
}

function visitor(): string
{
    return hash_hmac('sha256', $_SERVER['REMOTE_ADDR'] ?? '', secret());
}

/** Counts this submission against the limits; a message when one is reached. */
function rate_problem(): ?string
{
    $who = visitor();
    $now = time();
    $problem = null;
    update_json('ideas-limits.json', [], function ($limits) use ($who, $now, &$problem) {
        $limits = is_array($limits) ? $limits : [];
        foreach ($limits as $key => $times) {
            $limits[$key] = array_values(array_filter((array) $times, fn ($t) => $t > $now - 86400));
            if (!$limits[$key]) unset($limits[$key]);
        }
        $mine = $limits[$who] ?? [];
        $total = array_sum(array_map('count', $limits));
        if (count(array_filter($mine, fn ($t) => $t > $now - 3600)) >= PER_VISITOR_HOUR) $problem = 'Danke, das waren schon einige Ideen! Schick die nächste bitte in einer Stunde.';
        elseif (count($mine) >= PER_VISITOR_DAY) $problem = 'Danke, das waren schon einige Ideen! Schick die nächste bitte morgen.';
        elseif ($total >= PER_DAY_TOTAL) $problem = 'Heute sind schon sehr viele Ideen angekommen. Versuch es bitte morgen noch einmal.';
        if (!$problem) $limits[$who] = [...$mine, $now];
        return $limits;
    });
    return $problem;
}

/** Checks the PNG and re-encodes it (when GD is there), so only plain pixels are kept. */
function clean_png(string $bytes): ?string
{
    if ($bytes === '' || strlen($bytes) > MAX_BYTES || !str_starts_with($bytes, "\x89PNG\r\n\x1a\n")) return null;
    $info = @getimagesizefromstring($bytes);
    if (!$info || $info[2] !== IMAGETYPE_PNG || $info[0] !== WIDTH || $info[1] !== HEIGHT) return null;
    if (!function_exists('imagecreatefromstring')) return $bytes;
    $image = @imagecreatefromstring($bytes);
    if (!$image) return null;
    ob_start();
    imagepng($image, null, 9);
    imagedestroy($image);
    return (string) ob_get_clean();
}

function all(): array
{
    return read_json('ideas.json', ['items' => []])['items'] ?? [];
}

function add(string $png, string $note): void
{
    $id = random_id(10);
    file_put_contents(dir() . "/$id.png", $png);
    $dropped = [];
    update_json('ideas.json', ['items' => []], function ($data) use ($id, $note, &$dropped) {
        $items = [['id' => $id, 'created_at' => date('c'), 'note' => $note, 'read' => false], ...($data['items'] ?? [])];
        $dropped = array_slice($items, MAX_STORED);
        return ['items' => array_slice($items, 0, MAX_STORED)];
    });
    foreach ($dropped as $old) @unlink(dir() . '/' . $old['id'] . '.png');
}

function find(string $id): ?array
{
    foreach (all() as $idea) if ($idea['id'] === $id) return $idea;
    return null;
}

function image_path(string $id): ?string
{
    if (!preg_match('/^[a-f0-9]{20}$/', $id)) return null;
    $path = dir() . "/$id.png";
    return is_file($path) ? $path : null;
}

function set_read(string $id, bool $read): void
{
    update_json('ideas.json', ['items' => []], fn ($data) => ['items' => array_map(
        fn ($idea) => $idea['id'] === $id ? ['read' => $read] + $idea : $idea,
        $data['items'] ?? [],
    )]);
}

function delete(string $id): void
{
    update_json('ideas.json', ['items' => []], fn ($data) => ['items' => array_values(array_filter(
        $data['items'] ?? [],
        fn ($idea) => $idea['id'] !== $id,
    ))]);
    if ($path = image_path($id)) @unlink($path);
}

function unread(): int
{
    return count(array_filter(all(), fn ($idea) => empty($idea['read'])));
}
