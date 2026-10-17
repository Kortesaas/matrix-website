<?php
/** Opening hours, shown in the footer of every page. */
declare(strict_types=1);

require __DIR__ . '/../_app/admin.php';

use function Matrix\{e, hours, write_json, read_json};
use function Matrix\Admin\{require_user, page_start, page_end, redirect, is_post, errors, flash, when};
use function Matrix\Auth\{check_csrf, csrf_field, log_change};

$user = require_user();
$rows = hours();
$errors = [];

if (is_post()) {
    check_csrf();
    $days = (array) ($_POST['days'] ?? []);
    $times = (array) ($_POST['time'] ?? []);
    $rows = [];
    foreach ($days as $i => $day) {
        $day = trim((string) $day);
        $time = trim((string) ($times[$i] ?? ''));
        if ($day === '' && $time === '') continue;
        if ($day === '' || $time === '') $errors[] = 'Jede Zeile braucht Tage und Uhrzeit.';
        $rows[] = ['days' => mb_substr($day, 0, 60), 'time' => mb_substr($time, 0, 60)];
    }
    if (!$rows) $errors[] = 'Bitte mindestens eine Zeile ausfüllen.';
    if (count($rows) > 12) $errors[] = 'Höchstens 12 Zeilen.';

    if (!$errors) {
        write_json('hours.json', ['rows' => $rows, 'updated_at' => date('c'), 'updated_by' => $user['name']]);
        log_change($user, 'Öffnungszeiten geändert', implode('; ', array_map(fn ($r) => "{$r['days']} {$r['time']}", $rows)));
        flash('success', 'Die Öffnungszeiten sind gespeichert.');
        redirect('hours.php');
    }
}

$meta = read_json('hours.json');
page_start('Öffnungszeiten', $user);
?>
<p class="lead">Stehen unten auf jeder Seite. Schreibweise wie bisher: „12:00 bis 18:00 Uhr“, ohne Gedankenstrich.</p>
<?php if ($meta): ?><p class="muted small">Zuletzt geändert von <?= e($meta['updated_by']) ?> am <?= e(when($meta['updated_at'])) ?>.</p><?php endif; ?>
<?php errors($errors); ?>
<form method="post" class="card form">
  <?= csrf_field() ?>
  <div class="hours" data-rows>
    <div class="hours__head" aria-hidden="true"><span>Tage</span><span>Uhrzeit</span><span></span></div>
    <?php foreach ([...$rows, ['days' => '', 'time' => '']] as $row): ?>
      <div class="hours__row" data-row>
        <input name="days[]" aria-label="Tage" value="<?= e($row['days']) ?>" placeholder="z. B. Dienstag & Mittwoch">
        <input name="time[]" aria-label="Uhrzeit" value="<?= e($row['time']) ?>" placeholder="z. B. 12:00 bis 20:00 Uhr">
        <button type="button" class="icon-btn" data-remove-row aria-label="Zeile entfernen">✕</button>
      </div>
    <?php endforeach; ?>
  </div>
  <p><button type="button" class="btn btn--small btn--ghost" data-add-row>Zeile hinzufügen</button></p>
  <button class="btn" type="submit">Speichern</button>
</form>
<?php page_end();
