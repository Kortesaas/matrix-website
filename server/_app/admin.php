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
  <link rel="stylesheet" href="admin.css?v=9">
  <script src="admin.js?v=3" defer></script>
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
        <summary><span class="usermenu__avatar" aria-hidden="true"><?= e(mb_strtoupper(mb_substr($user['name'], 0, 1))) ?></span><span class="usermenu__name"><?= e($user['name']) ?></span></summary>
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
