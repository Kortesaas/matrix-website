<?php
/** Your own name and password. */
declare(strict_types=1);

require __DIR__ . '/../_app/admin.php';

use function Matrix\e;
use function Matrix\Admin\{require_user, page_start, page_end, redirect, is_post, post, errors, flash};
use function Matrix\Auth\{check_csrf, csrf_field, update_user, password_problem, log_change};
use const Matrix\Auth\ROLES;

$user = require_user();
$errors = [];

if (is_post()) {
    check_csrf();
    $current = (string) ($_POST['current'] ?? '');
    $new = (string) ($_POST['password'] ?? '');
    $name = post('name');
    if ($name === '') $errors[] = 'Bitte einen Namen angeben.';
    if ($new !== '' || !empty($user['must_change'])) {
        if (!password_verify($current, $user['password'])) $errors[] = 'Das aktuelle Passwort stimmt nicht.';
        elseif ($problem = password_problem($new)) $errors[] = $problem;
        elseif ($new !== (string) ($_POST['password2'] ?? '')) $errors[] = 'Die beiden neuen Passwörter sind nicht gleich.';
        elseif ($new === $current) $errors[] = 'Bitte ein neues Passwort wählen.';
    }
    if (!$errors) {
        update_user($user['id'], function ($u) use ($name, $new) {
            $u['name'] = mb_substr($name, 0, 80);
            if ($new !== '') {
                $u['password'] = password_hash($new, PASSWORD_DEFAULT);
                $u['must_change'] = false;
            }
            return $u;
        });
        if ($new !== '') {
            session_regenerate_id(true);
            log_change($user, 'Eigenes Passwort geändert', '');
        }
        flash('success', 'Gespeichert.');
        redirect($new !== '' && !empty($user['must_change']) ? 'index.php' : 'account.php');
    }
}

page_start('Mein Konto', $user);
?>
<?php errors($errors); ?>
<form method="post" class="card form narrow">
  <?= csrf_field() ?>
  <p class="muted small">Benutzername: <b><?= e($user['username']) ?></b> · Rolle: <?= e(ROLES[$user['role']]) ?></p>
  <label>Name <input name="name" required maxlength="80" autocomplete="name" value="<?= e($user['name']) ?>"><small>So erscheinst du im Verlauf.</small></label>
  <fieldset>
    <legend><?= !empty($user['must_change']) ? 'Eigenes Passwort festlegen' : 'Passwort ändern' ?></legend>
    <input type="text" name="username" value="<?= e($user['username']) ?>" autocomplete="username" hidden>
    <label>Aktuelles Passwort <input name="current" type="password" autocomplete="current-password" <?= !empty($user['must_change']) ? 'required' : '' ?>></label>
    <label>Neues Passwort <input name="password" type="password" minlength="10" autocomplete="new-password" <?= !empty($user['must_change']) ? 'required' : '' ?>><small>mindestens 10 Zeichen</small></label>
    <label>Neues Passwort wiederholen <input name="password2" type="password" minlength="10" autocomplete="new-password"></label>
  </fieldset>
  <button class="btn" type="submit">Speichern</button>
</form>
<?php page_end();
