<?php
/** The notice on the start page, e.g. when the MatriX is closed for a while. */
declare(strict_types=1);

require __DIR__ . '/../_app/admin.php';

use function Matrix\{e, notice, write_json, in_window};
use function Matrix\Admin\{require_user, page_start, page_end, redirect, is_post, post, errors, flash};
use function Matrix\Auth\{check_csrf, csrf_field, log_change};

$user = require_user();

const TONES = ['closed' => 'Geschlossen (Koralle)', 'info' => 'Info (Gelb)', 'special' => 'Extra (Türkis)'];

// Ready-made texts. {von}, {bis} and {ab} are filled from the dates below.
const TEMPLATES = [
    'urlaub' => ['Schließzeit', 'closed', 'Geschlossen', 'Wir machen Pause', 'Die MatriX ist vom {von} bis {bis} geschlossen. Ab dem {ab} sind wir wieder für dich da!'],
    'ferien' => ['Ferien', 'info', 'Ferien', 'Andere Öffnungszeiten in den Ferien', 'Vom {von} bis {bis} gelten bei uns Ferienöffnungszeiten. Was genau läuft, siehst du unter Aktuelles.'],
    'krank' => ['Kurzfristig zu', 'closed', 'Heute zu', 'Heute bleibt die MatriX geschlossen', 'Wegen Krankheit im Team können wir heute leider nicht öffnen. Danke für dein Verständnis!'],
    'umbau' => ['Umbau', 'closed', 'Baustelle', 'Wir bauen um', 'Vom {von} bis {bis} wird bei uns renoviert, deshalb ist die MatriX geschlossen. Danach wird’s noch schöner!'],
    'feiertag' => ['Feiertag', 'info', 'Feiertag', 'Am Feiertag geschlossen', 'Am {von} ist Feiertag, die MatriX bleibt zu. Ab dem {ab} sind wir wieder da.'],
    'extra' => ['Sonderöffnung', 'special', 'Extra', 'Wir haben extra für dich offen', 'Am {von} hat die MatriX zusätzlich geöffnet. Komm vorbei!'],
];

$notice = notice();
$errors = [];

if (is_post()) {
    check_csrf();
    $next = [
        'active' => isset($_POST['active']),
        'tone' => array_key_exists(post('tone'), TONES) ? post('tone') : 'info',
        'label' => mb_substr(post('label'), 0, 30),
        'title' => mb_substr(post('title'), 0, 120),
        'text' => mb_substr(post('text'), 0, 600),
        'from' => post('from'),
        'until' => post('until'),
    ];
    foreach (['from', 'until'] as $field) {
        if ($next[$field] !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/', $next[$field])) $errors[] = 'Bitte ein gültiges Datum angeben.';
    }
    if ($next['active'] && $next['title'] === '') $errors[] = 'Bitte eine Überschrift eingeben.';
    if (!$errors && $next['from'] !== '' && $next['until'] !== '' && $next['until'] < $next['from']) $errors[] = '„Anzeigen bis“ liegt vor „Anzeigen ab“.';

    if ($errors) {
        $notice = $next;
    } else {
        write_json('notice.json', $next + ['updated_at' => date('c'), 'updated_by' => $user['name']]);
        log_change($user, $next['active'] ? 'Hinweis-Banner gespeichert (an)' : 'Hinweis-Banner ausgeschaltet', $next['title']);
        flash('success', $next['active'] ? 'Gespeichert. Der Hinweis ist eingeschaltet.' : 'Gespeichert. Der Hinweis ist aus.');
        redirect('notice.php');
    }
}

$live = $notice['active'] && in_window($notice['from'], $notice['until']);
page_start('Hinweis-Banner', $user);
?>
<p class="lead">Ein auffälliger Hinweis oben auf der Startseite, z. B. wenn die MatriX länger geschlossen ist. Mit „Anzeigen bis“ verschwindet er von selbst.</p>
<?php errors($errors); ?>
<?php if (!empty($notice['updated_by'])): ?>
  <p class="muted small">Zuletzt geändert von <?= e($notice['updated_by']) ?> am <?= e(\Matrix\Admin\when($notice['updated_at'] ?? null)) ?>.
  Status: <b><?= $live ? 'wird gerade angezeigt' : ($notice['active'] ? 'eingeschaltet, aber außerhalb des Zeitraums' : 'aus') ?></b></p>
<?php endif; ?>

<div class="split">
  <form method="post" class="card form" data-notice-form>
    <?= csrf_field() ?>
    <label class="switch"><input type="checkbox" name="active" <?= $notice['active'] ? 'checked' : '' ?>> <span>Hinweis auf der Startseite anzeigen</span></label>

    <fieldset>
      <legend>Vorlage übernehmen</legend>
      <div class="chips">
        <?php foreach (TEMPLATES as $key => [$name, $tone, $label, $title, $text]): ?>
          <button type="button" class="chip" data-template data-tone="<?= e($tone) ?>" data-label="<?= e($label) ?>" data-title="<?= e($title) ?>" data-text="<?= e($text) ?>"><?= e($name) ?></button>
        <?php endforeach; ?>
      </div>
      <small>Füllt die Felder unten aus. Trag vorher die Daten ein, dann werden sie gleich in den Text übernommen.</small>
    </fieldset>

    <div class="row">
      <label>Anzeigen ab <input type="date" name="from" value="<?= e(substr($notice['from'], 0, 10)) ?>"><small>leer = sofort</small></label>
      <label>Anzeigen bis (einschließlich) <input type="date" name="until" value="<?= e(substr($notice['until'], 0, 10)) ?>"><small>leer = bis zum Ausschalten</small></label>
    </div>
    <div class="row">
      <label>Farbe
        <select name="tone">
          <?php foreach (TONES as $value => $name): ?>
            <option value="<?= $value ?>"<?= $notice['tone'] === $value ? ' selected' : '' ?>><?= e($name) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <label>Etikett <input name="label" maxlength="30" value="<?= e($notice['label']) ?>" placeholder="z. B. Geschlossen"></label>
    </div>
    <label>Überschrift <input name="title" maxlength="120" value="<?= e($notice['title']) ?>"></label>
    <label>Text <textarea name="text" rows="4" maxlength="600"><?= e($notice['text']) ?></textarea></label>
    <button class="btn" type="submit">Speichern</button>
  </form>

  <div class="preview-wrap">
    <p class="muted small">Vorschau</p>
    <aside class="preview-notice" data-notice-preview>
      <span class="preview-notice__badge" data-preview="label"></span>
      <div>
        <p class="preview-notice__title" data-preview="title"></p>
        <p class="preview-notice__text" data-preview="text"></p>
      </div>
    </aside>
  </div>
</div>
<?php page_end();
