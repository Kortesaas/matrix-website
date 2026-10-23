<?php
/**
 * Frame for the admin pages: login check, navigation, messages.
 * Each page in /admin/ starts with `require __DIR__ . '/../_app/admin.php';`.
 */
declare(strict_types=1);

namespace Matrix\Admin;

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/auth.php';

use function Matrix\e;
use function Matrix\Auth\{start_session, current_user, csrf_field, users};

header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('Cache-Control: no-store');
header("Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");

// Passwords only travel encrypted: the admin area always runs on HTTPS
// (except on this computer during development).
$host = strtolower(explode(':', $_SERVER['HTTP_HOST'] ?? '')[0]);
$local = in_array($host, ['localhost', '127.0.0.1', '[::1]'], true) || str_ends_with($host, '.localhost') || str_ends_with($host, '.test');
if (!\Matrix\is_https() && !$local && preg_match('/^[a-z0-9.-]+$/', $host)) {
    header('Location: https://' . $host . ($_SERVER['REQUEST_URI'] ?? '/admin/'), true, 301);
    exit;
}
if (\Matrix\is_https()) header('Strict-Transport-Security: max-age=31536000');

start_session();
\Matrix\Auth\cleanup_setup();

const NAV = [
    'index.php' => ['Übersicht', null],
    'notice.php' => ['Hinweis-Banner', null],
    'flyers.php' => ['Pinnwand', null],
    'team.php' => ['Team', null],
    'menu.php' => ['Speisekarte', null],
    'ideas.php' => ['Ideen', null],
    'hours.php' => ['Öffnungszeiten', null],
    'calendar.php' => ['Kalender', 'admin'],
    'users.php' => ['Konten', 'admin'],
    'log.php' => ['Verlauf', null],
];

/** The logged-in person, or a redirect to the login (or first setup). */
function require_user(?string $role = null): array
{
    $user = current_user();
    if (!$user) {
        redirect(users() ? 'login.php' : 'setup.php');
    }
    if (!empty($user['must_change']) && basename($_SERVER['SCRIPT_NAME']) !== 'account.php') {
        flash('info', 'Bitte vergib dir zuerst ein eigenes Passwort.');
        redirect('account.php');
    }
    if ($role && $user['role'] !== $role) {
        http_response_code(403);
        page_start('Kein Zugriff', $user);
        echo '<div class="card"><p>Diese Seite ist nur für Admins.</p></div>';
        page_end();
        exit;
    }
    return $user;
}

function redirect(string $to): never
{
    header('Location: ' . $to, true, 303);
    exit;
}

function flash(string $type, string $message): void
{
    $_SESSION['flash'][] = [$type, $message];
}

function is_post(): bool
{
    return ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST';
}

function post(string $key, string $default = ''): string
{
    $value = $_POST[$key] ?? $default;
    return is_string($value) ? trim($value) : $default;
}

/** Short German date and time, e.g. "17.10.2026, 14:05". */
function when(?string $iso, bool $time = true): string
{
    if (!$iso) return '';
    $date = new \DateTimeImmutable($iso);
    return $date->format($time && strlen($iso) > 10 ? 'd.m.Y, H:i' : 'd.m.Y');
}

function page_start(string $title, ?array $user = null): void
{
    $self = basename($_SERVER['SCRIPT_NAME']);
    ?>
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title><?= e($title) ?> | MatriX Verwaltung</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="/fonts/figtree-latin-wght.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/boogaloo-latin-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="admin.css?v=16">
  <noscript><link rel="stylesheet" href="admin-noscript.css"></noscript>
  <script src="admin.js?v=5" defer></script>
  <script src="/custom-select.js?v=1" type="module"></script>
</head>
<body class="<?= $user ? 'is-app' : 'is-auth' ?>">
<?php if ($user): ?>
  <header class="top">
    <a class="brand" href="index.php"><img src="logo.svg" alt="" width="28" height="35"><span>MatriX <small>Verwaltung</small></span></a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav"><span aria-hidden="true"></span>Menü</button>
    <nav id="nav" class="nav" aria-label="Verwaltung">
      <div class="nav__main">
        <?php foreach (NAV as $file => [$label, $role]):
            if ($role && $user['role'] !== $role) continue; ?>
          <a href="<?= $file ?>"<?= $self === $file ? ' aria-current="page"' : '' ?>><?= e($label) ?></a>
        <?php endforeach; ?>
      </div>
      <div class="nav__end">
      <a class="nav__site" href="/" target="_blank" rel="noopener">Website ansehen <span aria-hidden="true">↗</span></a>
      <details class="usermenu">
        <summary><?php avatar($user, 'usermenu__avatar'); ?><span class="usermenu__name"><?= e($user['name']) ?></span></summary>
        <div class="usermenu__panel">
          <a href="account.php"<?= $self === 'account.php' ? ' aria-current="page"' : '' ?>>Mein Konto</a>
          <form method="post" action="logout.php"><?= csrf_field() ?><button type="submit">Abmelden</button></form>
        </div>
      </details>
      </div>
    </nav>
  </header>
  <main class="main">
    <h1><?= e($title) ?></h1>
<?php else: ?>
  <main class="auth">
    <div class="auth__brand"><img src="logo.svg" alt="" width="40" height="50"><span>MatriX <small>Verwaltung</small></span></div>
    <div class="auth__card">
      <h1><?= e($title) ?></h1>
<?php endif; ?>
    <?php foreach ($_SESSION['flash'] ?? [] as [$type, $message]): ?>
      <p class="flash flash--<?= e($type) ?>" role="status"><?= e($message) ?></p>
    <?php endforeach; unset($_SESSION['flash']); ?>
<?php
}

function page_end(bool $auth = false): void
{
    if ($auth) echo "    </div>\n";
    ?>
  </main>
  <dialog class="confirm" data-confirm-dialog aria-labelledby="confirm-text">
    <p id="confirm-text" data-confirm-text></p>
    <div class="actions">
      <button type="button" class="btn btn--danger" data-confirm-yes>Ja, löschen</button>
      <button type="button" class="btn btn--ghost" data-confirm-no autofocus>Abbrechen</button>
    </div>
  </dialog>
</body>
</html>
<?php
}

/** A person's profile picture, or the first letter of their name without one. */
function avatar(array $user, string $class): void
{
    if (!empty($user['avatar']['src'])) {
        echo '<img class="' . e($class) . '" src="' . e($user['avatar']['src']) . '" alt="" width="64" height="64">';
    } else {
        echo '<span class="' . e($class) . '" aria-hidden="true">' . e(mb_strtoupper(mb_substr($user['name'], 0, 1))) . '</span>';
    }
}

/**
 * One page of a long list. The page number comes from ?$param (1 when it's
 * missing or out of range), so several lists on one page page separately.
 */
function paginate(array $items, int $per, string $param = 'seite'): array
{
    $items = array_values($items);
    $pages = max(1, (int) ceil(count($items) / $per));
    $page = min($pages, max(1, (int) ($_GET[$param] ?? 1)));
    return [
        'items' => array_slice($items, ($page - 1) * $per, $per),
        'page' => $page,
        'pages' => $pages,
        'total' => count($items),
        'param' => $param,
    ];
}

/** Address of another page of the list, keeping the rest of the query. */
function page_url(array $list, int $page, string $anchor = ''): string
{
    $query = $_GET;
    if ($page > 1) $query[$list['param']] = $page;
    else unset($query[$list['param']]);
    return basename($_SERVER['SCRIPT_NAME']) . ($query ? '?' . http_build_query($query) : '') . $anchor;
}

/**
 * Page links under a list from paginate(), only when there is more than one
 * page: "← Neuere 1 … 4 5 6 … 9 Ältere →" and "Seite 5 von 9 · 70 $noun".
 */
function pager(array $list, string $label, string $noun, string $anchor = '', string $back = '← Neuere', string $forward = 'Ältere →'): void
{
    ['page' => $page, 'pages' => $pages] = $list;
    if ($pages < 2) return;
    ?>
  <nav class="pager" aria-label="<?= e($label) ?>">
    <?php if ($page > 1): ?>
      <a class="pager__step" href="<?= e(page_url($list, $page - 1, $anchor)) ?>" rel="prev"><?= e($back) ?></a>
    <?php else: ?>
      <span class="pager__step" aria-hidden="true"><?= e($back) ?></span>
    <?php endif; ?>
    <span class="pager__pages">
      <?php for ($i = 1; $i <= $pages; $i++): ?>
        <?php if ($i === $page): ?>
          <span class="pager__page" aria-current="page"><?= $i ?></span>
        <?php elseif ($i === 1 || $i === $pages || abs($i - $page) <= 1): ?>
          <a class="pager__page" href="<?= e(page_url($list, $i, $anchor)) ?>" aria-label="Seite <?= $i ?>"><?= $i ?></a>
        <?php elseif (abs($i - $page) === 2): ?>
          <span class="pager__gap" aria-hidden="true">…</span>
        <?php endif; ?>
      <?php endfor; ?>
    </span>
    <?php if ($page < $pages): ?>
      <a class="pager__step" href="<?= e(page_url($list, $page + 1, $anchor)) ?>" rel="next"><?= e($forward) ?></a>
    <?php else: ?>
      <span class="pager__step" aria-hidden="true"><?= e($forward) ?></span>
    <?php endif; ?>
  </nav>
  <p class="muted small pager__info">Seite <?= $page ?> von <?= $pages ?> · <?= $list['total'] ?> <?= e($noun) ?></p>
<?php
}

/**
 * Image picker with preview, drag and drop and a German button (instead of
 * the browser's own file field).
 */
function upload_field(string $name, string $label, string $hint, bool $required = false, ?string $current = null, bool $square = false): void
{
    $id = 'upload-' . $name;
    ?>
  <div class="upload<?= $square ? ' upload--square' : '' ?>" data-upload>
    <span class="upload__label" id="<?= $id ?>-label"><?= e($label) ?></span>
    <label class="upload__drop" data-upload-drop>
      <input class="upload__input" type="file" id="<?= $id ?>" name="<?= e($name) ?>" accept="image/jpeg,image/png,image/webp,image/gif" aria-labelledby="<?= $id ?>-label" aria-describedby="<?= $id ?>-hint" <?= $required ? 'required' : '' ?>>
      <img class="upload__preview" data-upload-preview alt="" <?= $current ? 'src="' . e($current) . '"' : 'hidden' ?>>
      <span class="upload__cta">
        <span class="btn btn--small btn--ghost" aria-hidden="true"><?= $current ? 'Anderes Bild wählen' : 'Bild auswählen' ?></span>
        <span class="upload__or">oder hierher ziehen</span>
      </span>
      <span class="upload__file" data-upload-name><?= $current ? 'Aktuelles Bild' : 'Noch kein Bild gewählt' ?></span>
    </label>
    <small id="<?= $id ?>-hint"><?= e($hint) ?></small>
  </div>
<?php
}

/** Messages from a failed form, shown above it. */
function errors(array $errors): void
{
    if (!$errors) return;
    echo '<div class="flash flash--error" role="alert"><ul>';
    foreach ($errors as $error) echo '<li>' . e($error) . '</li>';
    echo '</ul></div>';
}
