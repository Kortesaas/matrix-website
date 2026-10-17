<?php
declare(strict_types=1);

require __DIR__ . '/../_app/admin.php';

use function Matrix\e;
use function Matrix\Admin\{page_start, page_end, redirect, is_post, post, errors};
use function Matrix\Auth\{users, current_user, check_csrf, csrf_field, attempt_login, login};

if (!users()) redirect('setup.php');
if (current_user()) redirect('index.php');

$errors = [];
if (is_post()) {
    check_csrf();
    $result = attempt_login(post('username'), (string) ($_POST['password'] ?? ''));
    if (is_array($result)) {
        login($result);
        redirect('index.php');
    }
    $errors[] = $result;
}

page_start('Anmelden');
?>
<div>
  <?php errors($errors); ?>
  <form method="post" class="form">
    <?= csrf_field() ?>
    <label>Benutzername <input name="username" required autocomplete="username" autofocus value="<?= e(post('username')) ?>"></label>
    <label>Passwort <input name="password" type="password" required autocomplete="current-password"></label>
    <button class="btn" type="submit">Anmelden</button>
  </form>
  <p class="muted small">Passwort vergessen? Ein Admin kann es unter „Konten“ zurücksetzen.</p>
</div>
<?php page_end(true);
