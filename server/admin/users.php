<?php
/** Accounts of the team (admins only). One per person, so the Verlauf shows who did what. */
declare(strict_types=1);

require __DIR__ . '/../_app/admin.php';
require __DIR__ . '/../_app/images.php';

use function Matrix\e;
use function Matrix\Admin\{require_user, page_start, page_end, redirect, is_post, post, errors, flash, when};
use function Matrix\Auth\{check_csrf, csrf_field, users, find_user, create_user, update_user, delete_user, active_admins, password_problem, log_change};
use const Matrix\Auth\ROLES;

$user = require_user('admin');
$errors = [];

if (is_post()) {
    check_csrf();
    $action = post('action');
    $target = find_user(post('id'));

    if ($action === 'create') {
        $error = create_user(post('username'), post('name'), post('role'), (string) ($_POST['password'] ?? ''), $user);
        if ($error) $errors[] = $error;
        else {
            flash('success', 'Konto angelegt. Gib das Startpasswort persönlich weiter; beim ersten Anmelden wird ein eigenes vergeben.');
            redirect('users.php');
        }
    } elseif ($target) {
        $isSelf = $target['id'] === $user['id'];
        $lastAdmin = $target['role'] === 'admin' && !empty($target['active']) && active_admins() <= 1;

        if ($action === 'role') {
            $role = post('role');
            if (!isset(ROLES[$role])) $errors[] = 'Unbekannte Rolle.';
            elseif ($lastAdmin && $role !== 'admin') $errors[] = 'Es muss mindestens ein aktives Admin-Konto geben.';
            else {
                update_user($target['id'], fn ($u) => ['role' => $role] + $u);
                log_change($user, 'Rolle geändert', "{$target['name']}: " . ROLES[$role]);
                flash('success', 'Rolle geändert.');
                redirect('users.php');
            }
        } elseif ($action === 'toggle') {
            if ($isSelf) $errors[] = 'Du kannst dein eigenes Konto nicht sperren.';
            elseif ($lastAdmin) $errors[] = 'Es muss mindestens ein aktives Admin-Konto geben.';
            else {
                $active = empty($target['active']);
                update_user($target['id'], fn ($u) => ['active' => $active] + $u);
                log_change($user, $active ? 'Konto entsperrt' : 'Konto gesperrt', $target['name']);
                flash('success', $active ? 'Konto entsperrt.' : 'Konto gesperrt. Die Person kann sich nicht mehr anmelden.');
                redirect('users.php');
            }
        } elseif ($action === 'reset') {
            $password = (string) ($_POST['password'] ?? '');
            if ($problem = password_problem($password)) $errors[] = $problem;
            else {
                update_user($target['id'], fn ($u) => ['password' => password_hash($password, PASSWORD_DEFAULT), 'must_change' => true] + $u);
                log_change($user, 'Passwort zurückgesetzt', $target['name']);
                flash('success', "Neues Startpasswort für {$target['name']} gesetzt.");
                redirect('users.php');
            }
        } elseif ($action === 'delete') {
            if ($isSelf) $errors[] = 'Du kannst dein eigenes Konto nicht löschen.';
            elseif ($lastAdmin) $errors[] = 'Es muss mindestens ein aktives Admin-Konto geben.';
            else {
                delete_user($target['id']);
                Matrix\Images\delete($target['avatar'] ?? null);
                log_change($user, 'Konto gelöscht', $target['name']);
                flash('success', 'Konto gelöscht. Einträge im Verlauf bleiben erhalten.');
                redirect('users.php');
            }
        }
    }
}

page_start('Konten', $user);
?>
<p class="lead">Jede Person bekommt ein eigenes Konto. <b>Redaktion</b> darf Inhalte pflegen, <b>Admin</b> zusätzlich Konten und den Kalender verwalten.</p>
<?php errors($errors); ?>
<ul class="list">
  <?php foreach (users() as $u): ?>
    <li class="list__item<?= empty($u['active']) ? ' list__item--expired' : '' ?>">
      <?php \Matrix\Admin\avatar($u, empty($u['avatar']['src']) ? 'list__thumb list__thumb--empty list__thumb--round' : 'list__thumb list__thumb--round'); ?>
      <div class="list__main">
        <b><?= e($u['name']) ?><?= $u['id'] === $user['id'] ? ' (du)' : '' ?></b>
        <span class="muted small"><?= e($u['username']) ?> · <?= e(ROLES[$u['role']]) ?><?= empty($u['active']) ? ' · gesperrt' : '' ?><?= !empty($u['must_change']) ? ' · Startpasswort' : '' ?> · zuletzt angemeldet: <?= e(when($u['last_login'] ?? null) ?: 'nie') ?></span>
      </div>
      <details class="list__more">
        <summary class="btn btn--small btn--ghost">Verwalten</summary>
        <div class="list__panel">
          <form method="post" class="inline-form">
            <?= csrf_field() ?><input type="hidden" name="action" value="role"><input type="hidden" name="id" value="<?= e($u['id']) ?>">
            <select name="role" aria-label="Rolle">
              <?php foreach (ROLES as $key => $label): ?><option value="<?= $key ?>"<?= $u['role'] === $key ? ' selected' : '' ?>><?= $label ?></option><?php endforeach; ?>
            </select>
            <button class="btn btn--small btn--ghost" type="submit">Rolle speichern</button>
          </form>
          <form method="post" class="inline-form">
            <?= csrf_field() ?><input type="hidden" name="action" value="reset"><input type="hidden" name="id" value="<?= e($u['id']) ?>">
            <input name="password" type="text" minlength="10" required placeholder="Neues Startpasswort" aria-label="Neues Startpasswort" autocomplete="off">
            <button class="btn btn--small btn--ghost" type="submit">Zurücksetzen</button>
          </form>
          <?php if ($u['id'] !== $user['id']): ?>
            <form method="post" class="inline-form">
              <?= csrf_field() ?><input type="hidden" name="action" value="toggle"><input type="hidden" name="id" value="<?= e($u['id']) ?>">
              <button class="btn btn--small btn--ghost" type="submit"><?= empty($u['active']) ? 'Entsperren' : 'Sperren' ?></button>
            </form>
            <form method="post" class="inline-form" data-confirm="Konto von <?= e($u['name']) ?> wirklich löschen?">
              <?= csrf_field() ?><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?= e($u['id']) ?>">
              <button class="btn btn--small btn--danger" type="submit">Löschen</button>
            </form>
          <?php endif; ?>
        </div>
      </details>
    </li>
  <?php endforeach; ?>
</ul>

<form method="post" class="card form">
  <h2>Neues Konto</h2>
  <?= csrf_field() ?><input type="hidden" name="action" value="create">
  <div class="row">
    <label>Name <input name="name" required maxlength="80" value="<?= e(post('name')) ?>"></label>
    <label>Benutzername <input name="username" required pattern="[a-z0-9._\-]{3,40}" value="<?= e(post('username')) ?>" autocomplete="off"><small>z. B. vorname.nachname</small></label>
  </div>
  <div class="row">
    <label>Rolle
      <select name="role">
        <?php foreach (ROLES as $key => $label): ?><option value="<?= $key ?>"<?= post('role', 'redaktion') === $key ? ' selected' : '' ?>><?= $label ?></option><?php endforeach; ?>
      </select>
    </label>
    <label>Startpasswort <input name="password" type="text" required minlength="10" autocomplete="off"><small>mindestens 10 Zeichen, wird beim ersten Anmelden geändert</small></label>
  </div>
  <button class="btn" type="submit">Konto anlegen</button>
</form>
<?php page_end();
