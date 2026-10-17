<?php
/**
 * Shared setup for the public pages, the calendar endpoint and the admin
 * area: paths, the data folder, JSON storage and small helpers.
 *
 * Data lives outside the web root when the host allows it
 * (../matrix-data next to the uploaded site), otherwise in _data/ inside it,
 * locked by .htaccess. MATRIX_DATA_DIR overrides both.
 */
declare(strict_types=1);

namespace Matrix;

date_default_timezone_set('Europe/Berlin');

// Never show PHP errors (paths, values) to visitors; they go to the log.
if (PHP_SAPI !== 'cli-server' && PHP_SAPI !== 'cli') {
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
}
header_remove('X-Powered-By');

/** The uploaded site (the contents of dist/). */
const WEB_ROOT = __DIR__ . '/..';

function data_dir(): string
{
    static $dir = null;
    if ($dir !== null) return $dir;

    $candidates = [];
    if (($env = getenv('MATRIX_DATA_DIR')) !== false && $env !== '') $candidates[] = $env;
    $outside = dirname(realpath(WEB_ROOT) ?: WEB_ROOT) . '/matrix-data';
    $inside = WEB_ROOT . '/_data';
    // Keep using whichever folder already holds data.
    if (!$candidates) {
        if (is_dir($outside)) $candidates[] = $outside;
        elseif (is_dir($inside)) $candidates[] = $inside;
        else array_push($candidates, $outside, $inside);
    }

    foreach ($candidates as $candidate) {
        if (!is_dir($candidate) && !@mkdir($candidate, 0750, true)) continue;
        if (!is_writable($candidate)) continue;
        $dir = rtrim($candidate, '/');
        protect_dir($dir);
        migrate_plain_files($dir);
        return $dir;
    }
    throw new \RuntimeException('Kein beschreibbarer Datenordner gefunden (matrix-data oder _data).');
}

const HTACCESS_DENY = "# Nur für PHP lesbar, nie über das Web.\n<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n  Order allow,deny\n  Deny from all\n</IfModule>\n";

/**
 * Blocks web access to a folder on Apache. The data files do not rely on it
 * alone: they are stored as .php files that stop before printing anything.
 */
function protect_dir(string $dir): void
{
    if (!is_file("$dir/.htaccess") || !str_contains((string) file_get_contents("$dir/.htaccess"), 'IfModule')) {
        @file_put_contents("$dir/.htaccess", HTACCESS_DENY);
    }
    if (!is_file("$dir/index.html")) @file_put_contents("$dir/index.html", '');
}

/** Data written before the GUARD existed: wrap it the same way. */
function migrate_plain_files(string $dir): void
{
    foreach ([...(glob("$dir/*.json") ?: []), "$dir/audit.log"] as $plain) {
        if (!is_file($plain)) continue;
        $target = "$plain.php";
        $content = (string) file_get_contents($plain);
        if (is_file($target)) {
            // Both exist (log): keep the older plain lines in front.
            $content .= strip_guard((string) file_get_contents($target));
        }
        if (file_put_contents("$target.tmp", GUARD . ltrim($content, "\n")) !== false && rename("$target.tmp", $target)) {
            chmod($target, 0640);
            unlink($plain);
        }
    }
}

/** Creates a folder in the data area with an empty index, so it can never be listed. */
function ensure_dir(string $dir, int $mode = 0750): void
{
    if (!is_dir($dir)) mkdir($dir, $mode, true);
    if (!is_file("$dir/index.html")) @file_put_contents("$dir/index.html", '');
}

/** Is the data folder inside the uploaded site (and so reachable by URL)? */
function data_in_web_root(): bool
{
    $web = realpath(WEB_ROOT);
    $data = realpath(data_dir());
    return $web && $data && str_starts_with($data . '/', $web . '/');
}

function data_path(string $name): string
{
    return data_dir() . '/' . $name;
}

// ---------- JSON storage ----------

/**
 * Every data file starts with this line. Should a host ever serve the data
 * folder, PHP runs the file and stops before the JSON, so nothing leaks.
 */
const GUARD = "<?php http_response_code(404); exit; ?>\n";

/** users.json is stored as users.json.php (see GUARD). */
function stored_path(string $name): string
{
    return data_path($name . '.php');
}

function strip_guard(string $raw): string
{
    return str_starts_with($raw, '<?php') ? substr($raw, strpos($raw, "?>") + 2) : $raw;
}

function read_json(string $name, mixed $default = null): mixed
{
    $path = stored_path($name);
    if (!is_file($path)) {
        $path = data_path($name); // written before the guard existed
        if (!is_file($path)) return $default;
    }
    $handle = fopen($path, 'rb');
    if (!$handle) return $default;
    flock($handle, LOCK_SH);
    $raw = stream_get_contents($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    $value = json_decode(strip_guard((string) $raw), true);
    return $value ?? $default;
}

/** Writes atomically, so a reader never sees half a file. */
function write_json(string $name, mixed $value): void
{
    $path = stored_path($name);
    $dir = dirname($path);
    ensure_dir($dir);
    $tmp = tempnam($dir, '.tmp-');
    file_put_contents($tmp, GUARD . json_encode($value, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    chmod($tmp, 0640);
    rename($tmp, $path);
    if (is_file(data_path($name))) @unlink(data_path($name));
}

/**
 * Reads, changes and writes a file under an exclusive lock, so two editors
 * saving at the same moment do not overwrite each other.
 */
function update_json(string $name, mixed $default, callable $change): mixed
{
    $lock = fopen(data_path($name . '.lock'), 'c');
    flock($lock, LOCK_EX);
    try {
        $value = $change(read_json($name, $default));
        write_json($name, $value);
        return $value;
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

// ---------- Content ----------

/** Starting content exported by the Astro build (src/pages/matrix-seed.json.ts). */
function seed(): array
{
    static $seed = null;
    if ($seed === null) {
        $raw = @file_get_contents(__DIR__ . '/seed.json');
        $seed = $raw ? (json_decode($raw, true) ?: []) : [];
    }
    return $seed;
}

function hours(): array
{
    return read_json('hours.json')['rows'] ?? seed()['hours'] ?? [];
}

function team_groups(): array
{
    return seed()['teamGroups'] ?? [['key' => 'hauptamtliche', 'title' => 'Die Hauptamtlichen'], ['key' => 'fsj', 'title' => 'Die FSJler']];
}

function team(): array
{
    $saved = read_json('team.json');
    if ($saved !== null) return $saved;
    $members = [];
    foreach (seed()['team']['members'] ?? [] as $i => $m) {
        $members[] = $m + ['id' => 'seed-' . $i, 'visible' => true];
    }
    return ['members' => $members, 'fsjOpening' => seed()['team']['fsjOpening'] ?? true];
}

function notice(): array
{
    return read_json('notice.json', []) + ['active' => false, 'tone' => 'closed', 'label' => '', 'title' => '', 'text' => '', 'from' => '', 'until' => ''];
}

/**
 * Demo content, only present in a demo upload (_app/demo/): sample dates
 * for the calendar and sample posters for the Pinnwand. It shows only where
 * nothing real exists yet; the first save in the admin area takes it over
 * as normal content, a connected calendar replaces the sample dates.
 */
function demo(string $file): ?string
{
    $path = __DIR__ . '/demo/' . $file;
    return is_file($path) ? $path : null;
}

function demo_pinwall(): array
{
    $path = demo('pinnwand.json');
    return $path ? (json_decode((string) file_get_contents($path), true) ?: []) : [];
}

function flyers(): array
{
    return read_json('flyers.json')['items'] ?? demo_pinwall()['events'] ?? [];
}

/** Monatsprogramm posters, one per month ("2026-10"). */
function programs(): array
{
    $saved = read_json('programs.json');
    if ($saved !== null) return $saved['items'];
    // The demo programme always counts as this month's.
    return array_map(fn ($p) => ['month' => date('Y-m')] + $p, demo_pinwall()['programs'] ?? []);
}

/**
 * The Monatsprogramm for the board: this month's, or next month's when it is
 * already up and this month has none.
 */
function current_program(?\DateTimeImmutable $now = null): ?array
{
    $now ??= new \DateTimeImmutable('now');
    $byMonth = array_column(programs(), null, 'month');
    return $byMonth[$now->format('Y-m')] ?? $byMonth[$now->modify('first day of next month')->format('Y-m')] ?? null;
}

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

/** "2026-10" → "Oktober 2026" */
function month_label(string $month): string
{
    [$y, $m] = array_map('intval', explode('-', $month));
    return (MONTHS[$m - 1] ?? '') . " $y";
}

function settings(): array
{
    return read_json('settings.json', []) + ['calendar_ics_url' => '', 'calendar_subscribe_url' => ''];
}

/** Is a notice or flyer shown right now? Dates are YYYY-MM-DD or YYYY-MM-DDTHH:MM, "until" is inclusive for dates. */
function in_window(string $from, string $until, ?\DateTimeImmutable $now = null): bool
{
    $now ??= new \DateTimeImmutable('now');
    if ($from !== '' && $now < new \DateTimeImmutable($from)) return false;
    if ($until !== '') {
        $end = new \DateTimeImmutable($until);
        if (strlen($until) === 10) $end = $end->modify('+1 day');
        if ($now >= $end) return false;
    }
    return true;
}

// ---------- Helpers ----------

function e(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function is_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
}

function random_id(int $bytes = 8): string
{
    return bin2hex(random_bytes($bytes));
}
