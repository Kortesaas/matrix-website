<?php
/** The Pinnwand on Aktuelles: the Monatsprogramm and event posters with an end date. */
declare(strict_types=1);

require __DIR__ . '/../_app/admin.php';
require __DIR__ . '/../_app/images.php';

use function Matrix\{e, flyers, programs, current_program, month_label, update_json, in_window, random_id};
use function Matrix\Admin\{require_user, page_start, page_end, redirect, is_post, post, errors, flash, when};
use function Matrix\Auth\{check_csrf, csrf_field, log_change};

$user = require_user();
$errors = [];

function find_flyer(string $id): ?array
{
    foreach (flyers() as $flyer) if ($flyer['id'] === $id) return $flyer;
    return null;
}

function status(array $flyer): array
{
    if (in_window($flyer['from'] ?? '', $flyer['until'] ?? '')) return ['live', 'sichtbar'];
    if (($flyer['from'] ?? '') !== '' && date('Y-m-d') < $flyer['from']) return ['planned', 'ab ' . when($flyer['from'], false)];
    return ['expired', 'abgelaufen'];
}

$editing = isset($_GET['new']) ? [] : (isset($_GET['edit']) ? find_flyer((string) $_GET['edit']) : null);
// Re-using a past event: same poster and texts, new dates.
$reuse = $editing && isset($_GET['reuse']);
if ($reuse) $editing = ['from' => '', 'until' => ''] + $editing;

if (is_post()) {
    check_csrf();
    $action = post('action');

    if ($action === 'program_save') {
        $month = post('month');
        if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month)) $errors[] = 'Bitte den Monat auswählen.';
        $upload = $_FILES['image'] ?? null;
        $stored = null;
        if (!$errors) {
            $stored = Matrix\Images\store($upload ?? [], 'program', [600, 1000, 1600]);
            if (is_string($stored)) $errors[] = $stored;
        }
        if (!$errors) {
            $replaced = null;
            update_json('programs.json', ['items' => programs()], function ($data) use ($month, $stored, $user, &$replaced) {
                // One programme per month; a new upload replaces the old one.
                $data['items'] = array_values(array_filter($data['items'], function ($p) use ($month, &$replaced) {
                    if ($p['month'] !== $month) return true;
                    $replaced = $p;
                    return false;
                }));
                $data['items'][] = ['id' => random_id(), 'month' => $month, 'image' => $stored, 'updated_by' => $user['name'], 'updated_at' => date('c')];
                usort($data['items'], fn ($a, $b) => strcmp($b['month'], $a['month']));
                return $data;
            });
            if ($replaced) Matrix\Images\delete($replaced['image'] ?? null);
            log_change($user, $replaced ? 'Monatsprogramm ersetzt' : 'Monatsprogramm hochgeladen', month_label($month));
            flash('success', 'Das Monatsprogramm für ' . month_label($month) . ' ist gespeichert.');
            redirect('flyers.php');
        }
    }

    if ($action === 'program_delete') {
        $removed = null;
        update_json('programs.json', ['items' => programs()], function ($data) use (&$removed) {
            $data['items'] = array_values(array_filter($data['items'], function ($p) use (&$removed) {
                if ($p['id'] !== post('id')) return true;
                $removed = $p;
                return false;
            }));
            return $data;
        });
        if ($removed) {
            Matrix\Images\delete($removed['image'] ?? null);
            log_change($user, 'Monatsprogramm gelöscht', month_label($removed['month']));
            flash('success', 'Das Monatsprogramm ist gelöscht.');
        }
        redirect('flyers.php');
    }

    if ($action === 'delete') {
        $removed = null;
        update_json('flyers.json', ['items' => flyers()], function ($data) use (&$removed) {
            $data['items'] = array_values(array_filter($data['items'], function ($f) use (&$removed) {
                if ($f['id'] !== post('id')) return true;
                $removed = $f;
                return false;
            }));
            return $data;
        });
        if ($removed) {
            Matrix\Images\delete($removed['image'] ?? null);
            log_change($user, 'Event gelöscht', $removed['title']);
            flash('success', 'Das Event ist gelöscht.');
        }
        redirect('flyers.php');
    }

    if ($action === 'save') {
        $id = post('id');
        $existing = $id ? find_flyer($id) : null;
        $flyer = [
            'id' => $existing['id'] ?? random_id(),
            'title' => mb_substr(post('title'), 0, 120),
            'description' => mb_substr(post('description'), 0, 800),
            'alt' => mb_substr(post('alt'), 0, 200),
            'when' => mb_substr(post('when'), 0, 80),
            'from' => post('from'),
            'until' => post('until'),
            'image' => $existing['image'] ?? null,
            'created_by' => $existing['created_by'] ?? $user['name'],
            'updated_by' => $user['name'],
            'updated_at' => date('c'),
        ];
        if ($flyer['title'] === '') $errors[] = 'Bitte einen Titel eingeben.';
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $flyer['until'])) $errors[] = 'Bitte angeben, bis wann das Plakat sichtbar sein soll.';
        if ($flyer['from'] !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $flyer['from'])) $errors[] = 'Bitte ein gültiges Startdatum angeben.';
        if (!$errors && $flyer['from'] !== '' && $flyer['until'] < $flyer['from']) $errors[] = '„Sichtbar bis“ liegt vor „Sichtbar ab“.';
        $reuse = post('reuse') === '1';
        if (!$errors && $reuse && $flyer['until'] < date('Y-m-d')) $errors[] = 'Bitte ein „Sichtbar bis“ ab heute wählen, sonst landet das Event gleich wieder bei den vergangenen.';

        $upload = $_FILES['image'] ?? null;
        $hasUpload = $upload && ($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE;
        if (!$errors && $hasUpload) {
            $stored = Matrix\Images\store($upload, 'flyer', [480, 960, 1600]);
            if (is_string($stored)) $errors[] = $stored;
            else {
                Matrix\Images\delete($flyer['image']);
                $flyer['image'] = $stored;
            }
        }
        // Events without a poster are fine: they hang on the board as a note.
        if (!$errors && !$hasUpload && isset($_POST['remove_image'])) {
            Matrix\Images\delete($flyer['image']);
            $flyer['image'] = null;
        }

        if ($errors) {
            $editing = $flyer;
        } else {
            update_json('flyers.json', ['items' => flyers()], function ($data) use ($flyer) {
                $found = false;
                foreach ($data['items'] as &$item) {
                    if ($item['id'] === $flyer['id']) {
                        $item = $flyer;
                        $found = true;
                    }
                }
                if (!$found) array_unshift($data['items'], $flyer);
                return $data;
            });
            log_change($user, $reuse ? 'Event wieder verwendet' : ($existing ? 'Event geändert' : 'Event hinzugefügt'), $flyer['title'] . ' (bis ' . when($flyer['until'], false) . ')');
            flash('success', $reuse ? 'Das Event hängt wieder an der Pinnwand.' : 'Das Event ist gespeichert.');
            redirect('flyers.php');
        }
    }
}

if ($editing !== null) {
    page_start($reuse ? 'Event wieder verwenden' : (empty($editing['id']) ? 'Neues Event' : 'Event bearbeiten'), $user);
    if ($reuse && !$errors) echo '<p class="flash flash--info">Bild und Texte sind übernommen. Trag die neuen Daten ein und pass den Text bei Bedarf an; nach dem Speichern hängt das Event wieder an der Pinnwand.</p>';
    errors($errors);
    ?>
  <form method="post" enctype="multipart/form-data" class="card form">
    <?= csrf_field() ?>
    <input type="hidden" name="action" value="save">
    <input type="hidden" name="id" value="<?= e($editing['id'] ?? '') ?>">
    <input type="hidden" name="reuse" value="<?= $reuse ? '1' : '' ?>">
    <div class="split split--form">
      <div>
        <?php Matrix\Admin\upload_field('image', 'Plakat (optional)', 'JPG, PNG oder WebP, höchstens 15 MB. Hoch-, Quer- und quadratische Formate passen. Ohne Bild hängt das Event als Notizzettel an der Pinnwand.', false, $editing['image']['src'] ?? null); ?>
        <?php if (!empty($editing['image'])): ?>
          <label class="check"><input type="checkbox" name="remove_image"> Bild entfernen (als Notizzettel zeigen)</label>
        <?php endif; ?>
      </div>
      <div>
        <label>Titel <input name="title" required maxlength="120" value="<?= e($editing['title'] ?? '') ?>"></label>
        <label>Wann <input name="when" maxlength="80" value="<?= e($editing['when'] ?? '') ?>" placeholder="z. B. Sa., 24. Oktober, 18 Uhr"><small>optional, steht über der Beschreibung</small></label>
        <label>Beschreibung <textarea name="description" rows="4" maxlength="800"><?= e($editing['description'] ?? '') ?></textarea><small>optional, kurz halten</small></label>
        <div class="row">
          <label>Sichtbar ab <input type="date" name="from" value="<?= e($editing['from'] ?? '') ?>"><small>leer = sofort</small></label>
          <label>Sichtbar bis (einschließlich) <input type="date" name="until" required value="<?= e($editing['until'] ?? '') ?>"><small>z. B. der Tag des Events</small></label>
        </div>
        <label>Bildbeschreibung für Screenreader <input name="alt" maxlength="200" value="<?= e($editing['alt'] ?? '') ?>"><small>optional, sonst wird der Titel verwendet</small></label>
      </div>
    </div>
    <div class="actions">
      <button class="btn" type="submit">Speichern</button>
      <a class="btn btn--ghost" href="flyers.php">Abbrechen</a>
    </div>
  </form>
    <?php
    page_end();
    exit;
}

page_start('Pinnwand', $user);
$all = flyers();
$shown = current_program();
$nextMonth = (new DateTimeImmutable('first day of next month'))->format('Y-m');
?>
<p class="lead">Die Pinnwand auf „Aktuelles“: links immer das Monatsprogramm, daneben die Plakate zu Events.</p>
<?php errors($errors); ?>

<section class="card">
  <h2>Monatsprogramm</h2>
  <p class="muted small">Pro Monat ein Bild. Gezeigt wird das Programm des aktuellen Monats; fehlt es, das des nächsten Monats. Du kannst es also schon vorher hochladen.</p>
  <div class="split split--form">
    <form method="post" enctype="multipart/form-data" class="form">
      <?= csrf_field() ?><input type="hidden" name="action" value="program_save">
      <label>Monat <input type="month" name="month" required value="<?= e(post('month', $shown ? $nextMonth : date('Y-m'))) ?>"></label>
      <?php Matrix\Admin\upload_field('image', 'Bild', 'JPG, PNG oder WebP, höchstens 15 MB. Gibt es für den Monat schon eins, wird es ersetzt.', true); ?>
      <button class="btn" type="submit">Hochladen</button>
    </form>
    <ul class="list list--flat">
      <?php foreach (programs() as $program): ?>
        <li class="list__item<?= $program['month'] < date('Y-m') ? ' list__item--expired' : '' ?>">
          <img class="list__thumb list__thumb--tall" src="<?= e($program['image']['src']) ?>" alt="">
          <div class="list__main">
            <b><?= e(month_label($program['month'])) ?></b>
            <?php if ($shown && $shown['id'] === $program['id']): ?><span class="badge badge--live">wird gezeigt</span>
            <?php elseif ($program['month'] < date('Y-m')): ?><span class="badge badge--expired">vorbei</span>
            <?php else: ?><span class="badge badge--planned">kommt</span><?php endif; ?>
            <span class="muted small">von <?= e($program['updated_by']) ?></span>
          </div>
          <form method="post" data-confirm="Monatsprogramm <?= e(month_label($program['month'])) ?> löschen?">
            <?= csrf_field() ?><input type="hidden" name="action" value="program_delete"><input type="hidden" name="id" value="<?= e($program['id']) ?>">
            <button class="btn btn--small btn--danger" type="submit">Löschen</button>
          </form>
        </li>
      <?php endforeach; ?>
      <?php if (!programs()): ?><li class="muted">Noch kein Monatsprogramm. Bis dahin zeigt die Pinnwand einen Platzhalter.</li><?php endif; ?>
    </ul>
  </div>
</section>

<div class="card__head"><h2>Events</h2><a class="btn" href="flyers.php?new=1">Event hinzufügen</a></div>
<p class="muted small">Jedes Event verschwindet nach dem Datum bei „Sichtbar bis“ von selbst. Mit Bild hängt es als Plakat im Originalformat an der Pinnwand, ohne Bild als Notizzettel.</p>
<?php
$past = array_values(array_filter($all, fn ($f) => status($f)[0] === 'expired'));
$current = array_values(array_filter($all, fn ($f) => status($f)[0] !== 'expired'));
usort($current, fn ($a, $b) => strcmp($a['until'], $b['until']));
usort($past, fn ($a, $b) => strcmp($b['until'], $a['until']));

// Past events page by page, newest first.
const PAST_PER_PAGE = 8;
$pastPages = max(1, (int) ceil(count($past) / PAST_PER_PAGE));
$pastPage = min($pastPages, max(1, (int) ($_GET['seite'] ?? 1)));
$pastShown = array_slice($past, ($pastPage - 1) * PAST_PER_PAGE, PAST_PER_PAGE);

function event_row(array $flyer, bool $past): void
{
    [$state, $label] = status($flyer);
    ?>
      <li class="list__item list__item--<?= $state ?>">
        <?php if (!empty($flyer['image']['src'])): ?>
          <img class="list__thumb list__thumb--tall" src="<?= e($flyer['image']['src']) ?>" alt="">
        <?php else: ?>
          <span class="list__thumb list__thumb--tall list__thumb--note" aria-hidden="true">Notiz</span>
        <?php endif; ?>
        <div class="list__main">
          <b><?= e($flyer['title']) ?></b>
          <?php if (!$past): ?><span class="badge badge--<?= $state ?>"><?= e($label) ?></span><?php endif; ?>
          <span class="muted small"><?= $past ? 'zuletzt gezeigt bis' : 'bis' ?> <?= e(when($flyer['until'], false)) ?> · von <?= e($flyer['updated_by'] ?? $flyer['created_by'] ?? '') ?></span>
        </div>
        <div class="list__actions">
          <?php if ($past): ?>
            <a class="btn btn--small" href="flyers.php?edit=<?= e($flyer['id']) ?>&amp;reuse=1">Wieder verwenden</a>
          <?php else: ?>
            <a class="btn btn--small btn--ghost" href="flyers.php?edit=<?= e($flyer['id']) ?>">Bearbeiten</a>
          <?php endif; ?>
          <form method="post" data-confirm="Event „<?= e($flyer['title']) ?>“ wirklich löschen?">
            <?= csrf_field() ?><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?= e($flyer['id']) ?>">
            <button class="btn btn--small btn--danger" type="submit">Löschen</button>
          </form>
        </div>
      </li>
    <?php
}
?>
<?php if (!$current): ?>
  <div class="card"><p class="muted">Gerade hängt kein Event an der Pinnwand. Leg ein neues an oder verwende eins von unten wieder.</p></div>
<?php else: ?>
  <ul class="list">
    <?php foreach ($current as $flyer) event_row($flyer, false); ?>
  </ul>
<?php endif; ?>

<?php if ($past): ?>
  <details class="past" id="vergangen"<?= !$current || isset($_GET['seite']) ? ' open' : '' ?>>
    <summary><h2>Vergangene Events</h2><span class="past__count"><?= count($past) ?></span></summary>
    <p class="muted small">Events landen hier automatisch, sobald ihr „Sichtbar bis“ vorbei ist. Mit „Wieder verwenden“ hängt ihr sie mit neuen Daten wieder an die Pinnwand, Bild und Texte bleiben erhalten.</p>
    <ul class="list">
      <?php foreach ($pastShown as $flyer) event_row($flyer, true); ?>
    </ul>
    <?php if ($pastPages > 1): ?>
      <nav class="pager" aria-label="Seiten der vergangenen Events">
        <?php if ($pastPage > 1): ?>
          <a class="pager__step" href="flyers.php?seite=<?= $pastPage - 1 ?>#vergangen" rel="prev">← Neuere</a>
        <?php else: ?>
          <span class="pager__step" aria-hidden="true">← Neuere</span>
        <?php endif; ?>
        <span class="pager__pages">
          <?php for ($i = 1; $i <= $pastPages; $i++): ?>
            <?php if ($i === $pastPage): ?>
              <span class="pager__page" aria-current="page"><?= $i ?></span>
            <?php elseif ($i === 1 || $i === $pastPages || abs($i - $pastPage) <= 1): ?>
              <a class="pager__page" href="flyers.php?seite=<?= $i ?>#vergangen" aria-label="Seite <?= $i ?>"><?= $i ?></a>
            <?php elseif (abs($i - $pastPage) === 2): ?>
              <span class="pager__gap" aria-hidden="true">…</span>
            <?php endif; ?>
          <?php endfor; ?>
        </span>
        <?php if ($pastPage < $pastPages): ?>
          <a class="pager__step" href="flyers.php?seite=<?= $pastPage + 1 ?>#vergangen" rel="next">Ältere →</a>
        <?php else: ?>
          <span class="pager__step" aria-hidden="true">Ältere →</span>
        <?php endif; ?>
      </nav>
      <p class="muted small pager__info">Seite <?= $pastPage ?> von <?= $pastPages ?> · <?= count($past) ?> vergangene Events</p>
    <?php endif; ?>
  </details>
<?php endif;
page_end();
