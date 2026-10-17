<?php
/** The people on the Team page: Hauptamtliche and FSJler. */
declare(strict_types=1);

require __DIR__ . '/../_app/admin.php';
require __DIR__ . '/../_app/images.php';

use function Matrix\{e, team, team_groups, update_json, random_id};
use function Matrix\Admin\{require_user, page_start, page_end, redirect, is_post, post, errors, flash};
use function Matrix\Auth\{check_csrf, csrf_field, log_change};

$user = require_user();
$groups = array_column(team_groups(), 'title', 'key');
$errors = [];

/** Changes the team under a lock; the first save turns the seed into team.json. */
function change_team(callable $change): void
{
    $current = team();
    update_json('team.json', $current, $change);
}

function find_member(string $id): ?array
{
    foreach (team()['members'] as $m) if ($m['id'] === $id) return $m;
    return null;
}

$editing = isset($_GET['new']) ? ['group' => (string) ($_GET['new'] === 'fsj' ? 'fsj' : 'hauptamtliche'), 'visible' => true] : (isset($_GET['edit']) ? find_member((string) $_GET['edit']) : null);

if (is_post()) {
    check_csrf();
    $action = post('action');
    $id = post('id');

    if ($action === 'move') {
        $dir = post('dir') === 'up' ? -1 : 1;
        change_team(function ($team) use ($id, $dir) {
            $members = $team['members'];
            $index = array_search($id, array_column($members, 'id'), true);
            if ($index === false) return $team;
            // Swap with the next person of the same group.
            for ($j = $index + $dir; $j >= 0 && $j < count($members); $j += $dir) {
                if ($members[$j]['group'] === $members[$index]['group']) {
                    [$members[$index], $members[$j]] = [$members[$j], $members[$index]];
                    break;
                }
            }
            $team['members'] = $members;
            return $team;
        });
        log_change($user, 'Team: Reihenfolge geändert', find_member($id)['name'] ?? '');
        redirect('team.php#p-' . rawurlencode($id));
    }

    if ($action === 'opening') {
        $on = isset($_POST['fsjOpening']);
        change_team(fn ($team) => ['fsjOpening' => $on] + $team);
        log_change($user, 'Team: „Bewirb dich“-Karte ' . ($on ? 'an' : 'aus'), '');
        flash('success', 'Gespeichert.');
        redirect('team.php');
    }

    if ($action === 'delete') {
        $member = find_member($id);
        if ($member) {
            change_team(function ($team) use ($id) {
                $team['members'] = array_values(array_filter($team['members'], fn ($m) => $m['id'] !== $id));
                return $team;
            });
            Matrix\Images\delete($member['photo'] ?? null);
            log_change($user, 'Team: Person entfernt', $member['name']);
            flash('success', $member['name'] . ' ist nicht mehr auf der Team-Seite.');
        }
        redirect('team.php');
    }

    if ($action === 'save') {
        $existing = $id ? find_member($id) : null;
        $member = [
            'id' => $existing['id'] ?? random_id(),
            'name' => mb_substr(post('name'), 0, 80),
            'role' => mb_substr(post('role'), 0, 80),
            'group' => isset($groups[post('group')]) ? post('group') : 'hauptamtliche',
            'visible' => isset($_POST['visible']),
            'photo' => $existing['photo'] ?? null,
        ];
        if ($member['name'] === '') $errors[] = 'Bitte einen Namen eingeben.';

        $upload = $_FILES['photo'] ?? null;
        if (!$errors && $upload && ($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
            $stored = Matrix\Images\store($upload, 'team', [400, 800]);
            if (is_string($stored)) $errors[] = $stored;
            else {
                Matrix\Images\delete($member['photo']);
                $member['photo'] = $stored;
            }
        } elseif (!$errors && isset($_POST['remove_photo'])) {
            Matrix\Images\delete($member['photo']);
            $member['photo'] = null;
        }

        if ($errors) {
            $editing = $member;
        } else {
            change_team(function ($team) use ($member) {
                foreach ($team['members'] as &$m) {
                    if ($m['id'] === $member['id']) {
                        $m = $member;
                        return $team;
                    }
                }
                $team['members'][] = $member;
                return $team;
            });
            log_change($user, $existing ? 'Team: Person geändert' : 'Team: Person hinzugefügt', $member['name'] . ' (' . $groups[$member['group']] . ')');
            flash('success', 'Gespeichert.');
            redirect('team.php#p-' . rawurlencode($member['id']));
        }
    }
}

if ($editing !== null) {
    page_start(empty($editing['id']) ? 'Person hinzufügen' : 'Person bearbeiten', $user);
    errors($errors);
    ?>
  <form method="post" enctype="multipart/form-data" class="card form">
    <?= csrf_field() ?>
    <input type="hidden" name="action" value="save">
    <input type="hidden" name="id" value="<?= e($editing['id'] ?? '') ?>">
    <div class="split split--form">
      <div>
        <?php Matrix\Admin\upload_field('photo', 'Foto', 'Quadratisch, Schultern aufwärts, am besten vor der X-Wand. Ohne Foto erscheint ein X als Platzhalter.', false, $editing['photo']['src'] ?? null, true); ?>
        <?php if (!empty($editing['photo']['src'])): ?>
          <label class="check"><input type="checkbox" name="remove_photo"> Foto entfernen</label>
        <?php endif; ?>
      </div>
      <div>
        <label>Name <input name="name" required maxlength="80" value="<?= e($editing['name'] ?? '') ?>"></label>
        <label>Rolle <input name="role" maxlength="80" value="<?= e($editing['role'] ?? '') ?>" placeholder="z. B. Medienpädagoge oder FSJler"></label>
        <label>Gruppe
          <select name="group">
            <?php foreach ($groups as $key => $title): ?>
              <option value="<?= e($key) ?>"<?= ($editing['group'] ?? '') === $key ? ' selected' : '' ?>><?= e($title) ?></option>
            <?php endforeach; ?>
          </select>
        </label>
        <label class="check"><input type="checkbox" name="visible" <?= !empty($editing['visible']) ? 'checked' : '' ?>> Auf der Website zeigen</label>
      </div>
    </div>
    <div class="actions">
      <button class="btn" type="submit">Speichern</button>
      <a class="btn btn--ghost" href="team.php">Abbrechen</a>
    </div>
  </form>
    <?php
    page_end();
    exit;
}

$team = team();
page_start('Team', $user);
?>
<p class="lead">Wer auf der Team-Seite zu sehen ist. Die Reihenfolge hier ist die Reihenfolge auf der Website.</p>
<?php foreach ($groups as $key => $title):
    $members = array_values(array_filter($team['members'], fn ($m) => $m['group'] === $key)); ?>
  <section class="card">
    <div class="card__head">
      <h2><?= e($title) ?></h2>
      <a class="btn btn--small" href="team.php?new=<?= e($key) ?>">Person hinzufügen</a>
    </div>
    <ul class="list list--flat">
      <?php foreach ($members as $i => $m): ?>
        <li class="list__item<?= empty($m['visible']) ? ' list__item--expired' : '' ?>" id="p-<?= e($m['id']) ?>">
          <?php if (!empty($m['photo']['src'])): ?>
            <img class="list__thumb" src="<?= e($m['photo']['src']) ?>" alt="">
          <?php else: ?>
            <span class="list__thumb list__thumb--empty" aria-hidden="true">X</span>
          <?php endif; ?>
          <div class="list__main">
            <b><?= e($m['name']) ?></b>
            <span class="muted small"><?= e($m['role'] ?? '') ?><?= empty($m['visible']) ? ' · ausgeblendet' : '' ?></span>
          </div>
          <div class="list__actions">
            <form method="post"><?= csrf_field() ?><input type="hidden" name="action" value="move"><input type="hidden" name="id" value="<?= e($m['id']) ?>">
              <button class="icon-btn" name="dir" value="up" aria-label="<?= e($m['name']) ?> nach oben" <?= $i === 0 ? 'disabled' : '' ?>>↑</button>
              <button class="icon-btn" name="dir" value="down" aria-label="<?= e($m['name']) ?> nach unten" <?= $i === count($members) - 1 ? 'disabled' : '' ?>>↓</button>
            </form>
            <a class="btn btn--small btn--ghost" href="team.php?edit=<?= e($m['id']) ?>">Bearbeiten</a>
            <form method="post" data-confirm="<?= e($m['name']) ?> wirklich von der Team-Seite entfernen?" data-confirm-action="Ja, entfernen">
              <?= csrf_field() ?><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?= e($m['id']) ?>">
              <button class="btn btn--small btn--danger" type="submit">Entfernen</button>
            </form>
          </div>
        </li>
      <?php endforeach; ?>
      <?php if (!$members): ?><li class="muted">Noch niemand eingetragen.</li><?php endif; ?>
    </ul>
    <?php if ($key === 'fsj'): ?>
      <form method="post" class="inline-form">
        <?= csrf_field() ?><input type="hidden" name="action" value="opening">
        <label class="check"><input type="checkbox" name="fsjOpening" <?= !empty($team['fsjOpening']) ? 'checked' : '' ?> data-autosubmit> Karte „Bewirb dich jetzt!“ am Ende zeigen</label>
        <noscript><button class="btn btn--small" type="submit">Speichern</button></noscript>
      </form>
    <?php endif; ?>
  </section>
<?php endforeach;
page_end();
