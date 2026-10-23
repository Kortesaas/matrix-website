<?php
declare(strict_types=1);

require __DIR__ . '/../_app/admin.php';
require __DIR__ . '/../_app/render.php';
require __DIR__ . '/../_app/security.php';
require __DIR__ . '/../_app/ideas.php';

use function Matrix\{e, notice, flyers, team, settings, in_window};
use function Matrix\Admin\{require_user, page_start, page_end, when};
use function Matrix\Auth\change_log;
use function Matrix\Render\visible_flyers;

$user = require_user();
$notice = notice();
$noticeLive = $notice['active'] && in_window($notice['from'], $notice['until']);
$shownFlyers = count(visible_flyers());
$people = count(array_filter(team()['members'], fn ($m) => !empty($m['visible'])));
$calendar = settings()['calendar_ics_url'] !== '';

page_start('Hallo ' . explode(' ', $user['name'])[0] . '!', $user);
?>
<?php if (\Matrix\demo('pinnwand.json') || \Matrix\demo('calendar.ics')): ?>
  <p class="flash flash--info">Demo-Version: Solange unter „Kalender“ kein Google Calendar eingetragen ist, zeigt die Website Beispieltermine. Die Pinnwand zeigt Beispielplakate; sobald ihr dort etwas speichert, werden sie zu normalen Einträgen, die ihr bearbeiten oder löschen könnt.</p>
<?php endif; ?>
<div class="tiles">
  <a class="tile" href="notice.php">
    <span class="tile__label">Hinweis-Banner</span>
    <span class="tile__value"><?= $noticeLive ? 'Wird angezeigt' : ($notice['active'] ? 'Geplant' : 'Aus') ?></span>
    <span class="tile__meta"><?= $notice['active'] ? e($notice['title']) : 'z. B. bei Schließzeiten einschalten' ?></span>
  </a>
  <a class="tile" href="flyers.php">
    <span class="tile__label">Pinnwand</span>
    <span class="tile__value"><?= $shownFlyers ?> Plakate</span>
    <span class="tile__meta"><?= \Matrix\current_program() ? "Monatsprogramm hängt" : "Monatsprogramm fehlt" ?></span>
  </a>
  <a class="tile" href="team.php">
    <span class="tile__label">Team</span>
    <span class="tile__value"><?= $people ?> Personen</span>
    <span class="tile__meta">Namen, Rollen und Fotos</span>
  </a>
  <a class="tile" href="ideas.php">
    <span class="tile__label">Ideen</span>
    <span class="tile__value"><?= ($newIdeas = \Matrix\Ideas\unread()) ? "$newIdeas neu" : 'Nichts Neues' ?></span>
    <span class="tile__meta">Vom Whiteboard im Gruppenraum</span>
  </a>
  <?php if ($user['role'] === 'admin'): ?>
  <a class="tile" href="calendar.php">
    <span class="tile__label">Kalender</span>
    <span class="tile__value"><?= $calendar ? 'Verbunden' : 'Nicht verbunden' ?></span>
    <span class="tile__meta">Termine kommen aus Google Calendar</span>
  </a>
  <?php endif; ?>
</div>

<section class="card">
  <h2>Zuletzt geändert</h2>
  <?php $entries = array_slice(array_filter(change_log(50), fn ($e) => $e['action'] !== 'Anmeldung'), 0, 6); ?>
  <?php if (!$entries): ?>
    <p class="muted">Noch keine Änderungen.</p>
  <?php else: ?>
    <ul class="log">
      <?php foreach ($entries as $entry): ?>
        <li><span class="log__when"><?= e(when($entry['at'])) ?></span> <b><?= e($entry['user']) ?></b>: <?= e($entry['action']) ?><?= $entry['detail'] ? ' · ' . e($entry['detail']) : '' ?></li>
      <?php endforeach; ?>
    </ul>
    <p><a href="log.php">Ganzer Verlauf</a></p>
  <?php endif; ?>
</section>

<?php if ($user['role'] === 'admin'): $checks = Matrix\Security\checks(); $warnings = count(array_filter($checks, fn ($c) => $c['state'] === 'warn')); ?>
<section class="card">
  <div class="card__head">
    <h2>Sicherheit</h2>
    <span class="badge <?= $warnings ? 'badge--planned' : 'badge--live' ?>"><?= $warnings ? "$warnings Hinweis" . ($warnings > 1 ? 'e' : '') : 'Alles in Ordnung' ?></span>
  </div>
  <ul class="checks">
    <?php foreach ($checks as $check): ?>
      <li class="checks__item checks__item--<?= $check['state'] ?>">
        <span class="checks__icon" aria-hidden="true"><?= ['ok' => '✓', 'warn' => '!', 'skip' => '–'][$check['state']] ?></span>
        <div><b><?= e($check['title']) ?></b><span class="muted small"><?= e($check['detail']) ?></span></div>
      </li>
    <?php endforeach; ?>
  </ul>
</section>
<?php endif; ?>

<section class="card">
  <h2>Termine eintragen</h2>
  <p>Events und feste Termine pflegt ihr direkt in Google Calendar. Die Website übernimmt Änderungen nach spätestens zehn Minuten. Tipps: Ort ins Feld „Ort“ eintragen, Links in der Beschreibung (z. B. zu Tickets) werden auf der Website klickbar, wöchentliche Termine als Serie „Jede Woche“ anlegen, dann erscheinen sie unter „Jede Woche“. Als „Privat“ markierte Termine bleiben verborgen.</p>
</section>
<?php page_end();
