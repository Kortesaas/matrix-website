<?php
/** Which Google Calendar feeds the website (admins only). */
declare(strict_types=1);

require __DIR__ . '/../_app/admin.php';
require __DIR__ . '/../_app/calendar.php';

use function Matrix\{e, settings, update_json};
use function Matrix\Admin\{require_user, page_start, page_end, redirect, is_post, post, errors, flash};
use function Matrix\Auth\{check_csrf, csrf_field, log_change};
use function Matrix\Calendar\{normalize_url, download, clear_cache};

$user = require_user('admin');
$settings = settings();
$errors = [];
$test = null;

if (is_post()) {
    check_csrf();
    $ics = post('calendar_ics_url');
    $subscribe = post('calendar_subscribe_url');
    if ($ics !== '' && normalize_url($ics) === null) $errors[] = 'Die Kalender-Adresse muss mit https:// oder webcal:// beginnen.';
    if ($subscribe !== '' && !preg_match('#^(https|webcal)://#i', $subscribe)) $errors[] = 'Der Abo-Link muss mit https:// oder webcal:// beginnen.';
    if (!$errors && $ics !== '') {
        $test = download(normalize_url($ics));
        if ($test['error']) $errors[] = $test['error'];
    }
    if (!$errors) {
        update_json('settings.json', [], fn ($s) => ['calendar_ics_url' => $ics, 'calendar_subscribe_url' => $subscribe] + $s);
        clear_cache();
        log_change($user, 'Kalender-Einstellungen geändert', $ics === '' ? 'Kalender getrennt' : 'neue Kalender-Adresse');
        $count = $test ? substr_count($test['ics'], 'BEGIN:VEVENT') : 0;
        flash('success', $ics === '' ? 'Gespeichert. Es ist kein Kalender verbunden.' : "Verbunden! Im Kalender stehen $count Einträge (Serien zählen einmal).");
        redirect('calendar.php');
    }
    $settings = ['calendar_ics_url' => $ics, 'calendar_subscribe_url' => $subscribe];
}

page_start('Kalender', $user);
?>
<p class="lead">Die Termine auf der Website kommen direkt aus Google Calendar. Änderungen dort sind nach spätestens zehn Minuten auf der Website.</p>
<?php errors($errors); ?>
<form method="post" class="card form">
  <?= csrf_field() ?>
  <label>Kalender-Adresse (iCal)
    <input name="calendar_ics_url" type="url" value="<?= e($settings['calendar_ics_url']) ?>" placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" autocomplete="off" spellcheck="false">
    <small>Google Calendar: Einstellungen › den Kalender wählen › „Kalender integrieren“ › <b>„Geheime Adresse im iCal-Format“</b> (oder die öffentliche Adresse, wenn der Kalender öffentlich ist). Die Adresse bleibt auf dem Server und wird Besuchern nie gezeigt.</small>
  </label>
  <label>Link „Kalender abonnieren“ (optional)
    <input name="calendar_subscribe_url" type="url" value="<?= e($settings['calendar_subscribe_url']) ?>" placeholder="https://calendar.google.com/calendar/u/0?cid=…" autocomplete="off" spellcheck="false">
    <small>Wird unter dem Kalender auf „Aktuelles“ gezeigt. Nur eine <b>öffentliche</b> Adresse eintragen, niemals die geheime!</small>
  </label>
  <button class="btn" type="submit">Speichern und testen</button>
</form>
<?php page_end();
