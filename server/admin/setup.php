<?php
/**
 * First start: creates the first admin account. Only possible while no
 * account exists, and only after an empty file with a given name has been
 * created by FTP in the web root, which proves access to the server.
 */
declare(strict_types=1);

require __DIR__ . '/../_app/admin.php';

use function Matrix\e;
use function Matrix\Admin\{page_start, page_end, redirect, is_post, post, errors, flash};
use function Matrix\Auth\{users, setup_proof_name, setup_proof_present, check_csrf, csrf_field, create_user, find_by_username, login, finish_setup};

if (users()) redirect('login.php');

$proof = setup_proof_name();
$errors = [];
if (is_post()) {
    check_csrf();
    if (!setup_proof_present()) {
        $errors[] = "Die Datei $proof liegt noch nicht im Webordner. Bitte anlegen (Schritt 1) und dann noch einmal auf „Konto anlegen“ klicken.";
    } elseif (post('password') !== post('password2')) {
        $errors[] = 'Die beiden Passwörter sind nicht gleich.';
    } elseif ($error = create_user(post('username'), post('name'), 'admin', post('password'), ['id' => 'setup', 'name' => 'Einrichtung'])) {
        $errors[] = $error;
    } else {
        finish_setup();
        login(find_by_username(post('username')));
        flash('success', 'Willkommen! Dein Admin-Konto ist eingerichtet.');
        redirect('index.php');
    }
}

page_start('Ersteinrichtung');
?>
<div>
  <p>Hier legst du das erste Admin-Konto an. Weitere Konten für das Team erstellst du danach unter <b>Konten</b>.</p>
  <ol class="steps">
    <li>
      <b>Datei anlegen:</b> Lege per FTP oder im Dateimanager deines Hosters im Webordner (dort, wo <code>index.php</code> und der Ordner <code>admin</code> liegen) eine <b>leere Datei</b> mit genau diesem Namen an:
      <code class="steps__file" data-copy><?= e($proof) ?></code>
      <small>Damit zeigst du, dass du Zugriff auf den Server hast. Die Datei wird nach der Einrichtung automatisch gelöscht.</small>
      <span class="steps__state<?= setup_proof_present() ? ' is-ok' : '' ?>"><?= setup_proof_present() ? '✓ Datei gefunden' : 'Noch nicht gefunden' ?></span>
    </li>
    <li><b>Konto anlegen:</b> Formular ausfüllen und absenden.</li>
  </ol>
  <?php errors($errors); ?>
  <form method="post" class="form">
    <?= csrf_field() ?>
    <label>Dein Name <input name="name" required autocomplete="name" value="<?= e(post('name')) ?>"></label>
    <label>Benutzername <input name="username" required autocomplete="username" pattern="[a-z0-9._\-]{3,40}" value="<?= e(post('username')) ?>"><small>Kleinbuchstaben, z. B. vorname.nachname</small></label>
    <label>Passwort <input name="password" type="password" required minlength="10" autocomplete="new-password"></label>
    <label>Passwort wiederholen <input name="password2" type="password" required minlength="10" autocomplete="new-password"></label>
    <button class="btn" type="submit">Konto anlegen</button>
  </form>
</div>
<?php page_end(true);
