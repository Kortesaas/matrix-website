<?php
/**
 * Accounts, sessions, CSRF protection and the change log of the admin area.
 *
 * Every person has their own account (role "admin" or "redaktion"), so the
 * Verlauf shows who changed what. Only logged-in staff ever get a cookie;
 * visitors of the public site get none.
 */
declare(strict_types=1);

namespace Matrix\Auth;

use function Matrix\{data_path, read_json, update_json, random_id, is_https};

const ROLES = ['admin' => 'Admin', 'redaktion' => 'Redaktion'];
const MIN_PASSWORD = 10;
const IDLE_SECONDS = 2 * 3600;
const MAX_FAILURES = 5;
const LOCK_SECONDS = 15 * 60;

// ---------- Session ----------

function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $dir = data_path('sessions');
    \Matrix\ensure_dir($dir, 0700);
    session_save_path($dir);
    session_name('matrix_admin');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/admin/',
        'secure' => is_https(),
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    ini_set('session.use_strict_mode', '1');
    ini_set('session.gc_maxlifetime', (string) IDLE_SECONDS);
    session_start();

    if (isset($_SESSION['seen']) && time() - $_SESSION['seen'] > IDLE_SECONDS) {
        $_SESSION = [];
        session_regenerate_id(true);
    }
    $_SESSION['seen'] = time();
}

function current_user(): ?array
{
    $id = $_SESSION['user_id'] ?? null;
    if (!$id) return null;
    $user = find_user($id);
    // Deactivated or deleted accounts are logged out on their next click.
    if (!$user || empty($user['active'])) {
        logout();
        return null;
    }
    return $user;
}

function login(array $user): void
{
    session_regenerate_id(true);
    $_SESSION = ['user_id' => $user['id'], 'seen' => time(), 'csrf' => random_id(16)];
    update_user($user['id'], fn ($u) => ['last_login' => date('c')] + $u);
    log_change($user, 'Anmeldung', '');
}

function logout(): void
{
    $_SESSION = [];
    if (session_status() === PHP_SESSION_ACTIVE) session_regenerate_id(true);
}

// ---------- CSRF ----------

function csrf_token(): string
{
    return $_SESSION['csrf'] ??= random_id(16);
}

function csrf_field(): string
{
    return '<input type="hidden" name="csrf" value="' . csrf_token() . '">';
}

function check_csrf(): void
{
    $sent = $_POST['csrf'] ?? '';
    if (!is_string($sent) || !hash_equals(csrf_token(), $sent)) {
        http_response_code(400);
        exit('Das Formular ist abgelaufen. Bitte lade die Seite neu und versuche es noch einmal.');
    }
}

// ---------- Users ----------

function users(): array
{
    return read_json('users.json', ['users' => []])['users'];
}

function find_user(string $id): ?array
{
    foreach (users() as $user) if ($user['id'] === $id) return $user;
    return null;
}

function find_by_username(string $username): ?array
{
    $username = mb_strtolower(trim($username));
    foreach (users() as $user) if ($user['username'] === $username) return $user;
    return null;
}

function valid_username(string $username): bool
{
    return (bool) preg_match('/^[a-z0-9._-]{3,40}$/', $username);
}

function password_problem(string $password): ?string
{
    if (mb_strlen($password) < MIN_PASSWORD) return 'Das Passwort braucht mindestens ' . MIN_PASSWORD . ' Zeichen.';
    return null;
}

/** @return string|null error message */
function create_user(string $username, string $name, string $role, string $password, array $by): ?string
{
    $username = mb_strtolower(trim($username));
    if (!valid_username($username)) return 'Der Benutzername darf nur Kleinbuchstaben, Ziffern, Punkt, Bindestrich und Unterstrich enthalten (3 bis 40 Zeichen).';
    if (trim($name) === '') return 'Bitte einen Namen angeben.';
    if (!isset(ROLES[$role])) return 'Unbekannte Rolle.';
    if ($problem = password_problem($password)) return $problem;
    $error = null;
    update_json('users.json', ['users' => []], function ($data) use ($username, $name, $role, $password, $by, &$error) {
        foreach ($data['users'] as $u) {
            if ($u['username'] === $username) {
                $error = 'Diesen Benutzernamen gibt es schon.';
                return $data;
            }
        }
        $data['users'][] = [
            'id' => random_id(),
            'username' => $username,
            'name' => trim($name),
            'role' => $role,
            'password' => password_hash($password, PASSWORD_DEFAULT),
            'active' => true,
            // People set their own password after the first login.
            'must_change' => $by['id'] !== 'setup',
            'created_at' => date('c'),
            'created_by' => $by['name'],
        ];
        return $data;
    });
    if (!$error) log_change($by, 'Konto angelegt', "$name ($username, " . ROLES[$role] . ')');
    return $error;
}

function update_user(string $id, callable $change): void
{
    update_json('users.json', ['users' => []], function ($data) use ($id, $change) {
        foreach ($data['users'] as &$user) {
            if ($user['id'] === $id) $user = $change($user);
        }
        return $data;
    });
}

function delete_user(string $id): void
{
    update_json('users.json', ['users' => []], function ($data) use ($id) {
        $data['users'] = array_values(array_filter($data['users'], fn ($u) => $u['id'] !== $id));
        return $data;
    });
}

function active_admins(): int
{
    return count(array_filter(users(), fn ($u) => $u['role'] === 'admin' && !empty($u['active'])));
}

// ---------- Login throttling ----------

function throttle_key(string $username): string
{
    return hash('sha256', mb_strtolower(trim($username)) . '|' . ($_SERVER['REMOTE_ADDR'] ?? ''));
}

/** Seconds until another attempt is allowed, 0 when allowed. */
function locked_for(string $username): int
{
    $entry = read_json('login-attempts.json', [])[throttle_key($username)] ?? null;
    if (!$entry || $entry['count'] < MAX_FAILURES) return 0;
    return max(0, $entry['last'] + LOCK_SECONDS - time());
}

function record_attempt(string $username, bool $success): void
{
    $key = throttle_key($username);
    update_json('login-attempts.json', [], function ($attempts) use ($key, $success) {
        // Forget old entries so the file stays small.
        $attempts = array_filter($attempts, fn ($a) => $a['last'] > time() - LOCK_SECONDS);
        if ($success) unset($attempts[$key]);
        else $attempts[$key] = ['count' => ($attempts[$key]['count'] ?? 0) + 1, 'last' => time()];
        return $attempts;
    });
}

/** @return array|string the user, or an error message */
function attempt_login(string $username, string $password): array|string
{
    if ($wait = locked_for($username)) {
        return 'Zu viele Fehlversuche. Bitte warte ' . ceil($wait / 60) . ' Minuten.';
    }
    $user = find_by_username($username);
    // Unknown names cost a hash too, so timing does not reveal valid ones.
    $hash = $user['password'] ?? password_hash(random_id(), PASSWORD_DEFAULT);
    $ok = password_verify($password, $hash) && $user && !empty($user['active']);
    record_attempt($username, $ok);
    if (!$ok) return 'Benutzername oder Passwort stimmen nicht.';
    if (password_needs_rehash($user['password'], PASSWORD_DEFAULT)) {
        update_user($user['id'], fn ($u) => ['password' => password_hash($password, PASSWORD_DEFAULT)] + $u);
    }
    return $user;
}

// ---------- First account ----------

/** A key in the data folder proves that whoever sets up the first account has access to the server. */
const SETUP_FILE = 'setup-key.php';

function setup_key(): string
{
    $path = data_path(SETUP_FILE);
    if (!is_file($path)) {
        $key = implode('-', str_split(strtoupper(random_id(6)), 4));
        // A PHP file that ends at once, so the key never shows in a browser.
        file_put_contents($path, "<?php http_response_code(404); exit; ?>\nEinrichtungsschlüssel für /admin/: $key\n");
        chmod($path, 0640);
    }
    preg_match('/[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}/', (string) file_get_contents($path), $m);
    return $m[0] ?? '';
}

/**
 * Proof of server access for the first account: an empty file with this
 * name, created by FTP in the web root (where index.php lives). Showing the
 * name is harmless; only someone with FTP access can create the file.
 */
function setup_proof_name(): string
{
    return 'matrix-einrichtung-' . strtolower(str_replace('-', '', setup_key())) . '.txt';
}

function setup_proof_present(): bool
{
    $key = setup_key();
    return $key !== '' && is_file(\Matrix\WEB_ROOT . '/' . setup_proof_name());
}

/** Leftover key files go as soon as an account exists. */
function cleanup_setup(): void
{
    if (users()) finish_setup();
}

function finish_setup(): void
{
    foreach (glob(\Matrix\WEB_ROOT . '/matrix-einrichtung-*.txt') ?: [] as $proof) @unlink($proof);
    @unlink(data_path(SETUP_FILE));
    @unlink(data_path('setup-key.txt'));
}

// ---------- Change log ----------

function log_change(array $user, string $action, string $detail): void
{
    $line = json_encode([
        'at' => date('c'),
        'user' => $user['name'] ?? '?',
        'username' => $user['username'] ?? '',
        'action' => $action,
        'detail' => $detail,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $path = data_path('audit.log.php');
    if (!is_file($path)) file_put_contents($path, \Matrix\GUARD, LOCK_EX);
    file_put_contents($path, $line . "\n", FILE_APPEND | LOCK_EX);
}

/** Newest first. */
function change_log(int $limit = 300): array
{
    $lines = [];
    foreach ([data_path('audit.log'), data_path('audit.log.php')] as $path) {
        if (is_file($path)) array_push($lines, ...(file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: []));
    }
    $lines = array_values(array_filter($lines, fn ($l) => str_starts_with($l, '{')));
    $entries = [];
    foreach (array_reverse(array_slice($lines, -$limit)) as $line) {
        if ($entry = json_decode($line, true)) $entries[] = $entry;
    }
    return $entries;
}
