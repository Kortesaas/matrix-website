<?php
/** Ideas sent from the whiteboard on the Gruppenraum page. */
declare(strict_types=1);

require __DIR__ . '/../_app/admin.php';
require __DIR__ . '/../_app/ideas.php';

use Matrix\Ideas;
use function Matrix\e;
use function Matrix\Admin\{require_user, page_start, page_end, redirect, is_post, post, flash, when, paginate, pager};
use function Matrix\Auth\{check_csrf, csrf_field, log_change};

$user = require_user();

// The drawings are only for the team: served from here, behind the login.
if (isset($_GET['bild'])) {
    $path = Ideas\image_path((string) $_GET['bild']);
    if (!$path) {
        http_response_code(404);
        exit;
    }
    header('Content-Type: image/png');
    header('Content-Length: ' . filesize($path));
    readfile($path);
    exit;
}

if (is_post()) {
    check_csrf();
    $id = post('id');
    $idea = Ideas\find($id);
    if ($idea) {
        $action = post('action');
        if ($action === 'read' || $action === 'unread') {
            Ideas\set_read($id, $action === 'read');
        } elseif ($action === 'delete') {
            Ideas\delete($id);
            log_change($user, 'Idee gelöscht', 'vom ' . when($idea['created_at']));
            flash('success', 'Die Idee wurde gelöscht.');
        }
    }
    // Back to the page of the list the idea was on.
    $page = (int) post('seite', '1');
    redirect('ideas.php' . ($page > 1 ? "?seite=$page" : ''));
}

const PER_PAGE = 10;
$ideas = Ideas\all();
$list = paginate($ideas, PER_PAGE);
page_start('Ideen', $user);
?>
<p class="lead">Ideen, die Besucherinnen und Besucher im Gruppenraum aufs Whiteboard gemalt und an euch geschickt haben. Neue Ideen sind markiert, bis jemand sie als gelesen abhakt.</p>

<?php if (!$ideas): ?>
  <div class="card"><p class="muted">Noch keine Ideen angekommen.</p></div>
<?php else: ?>
  <ul class="list ideas">
    <?php foreach ($list['items'] as $idea): $src = 'ideas.php?bild=' . rawurlencode($idea['id']); ?>
      <li class="list__item<?= empty($idea['read']) ? ' is-new' : '' ?>">
        <a class="ideas__thumb" href="<?= e($src) ?>" target="_blank" rel="noopener"><img src="<?= e($src) ?>" alt="Zeichnung vom <?= e(when($idea['created_at'])) ?>" width="900" height="600" loading="lazy"></a>
        <div class="list__main">
          <b><?= e(when($idea['created_at'])) ?></b>
          <?php if (empty($idea['read'])): ?><span class="badge badge--live">neu</span><?php endif; ?>
          <?php if ($idea['note'] !== ''): ?><span>„<?= e($idea['note']) ?>“</span><?php else: ?><span class="muted small">Ohne Text</span><?php endif; ?>
        </div>
        <div class="list__actions">
          <form method="post">
            <?= csrf_field() ?><input type="hidden" name="id" value="<?= e($idea['id']) ?>"><input type="hidden" name="seite" value="<?= $list['page'] ?>">
            <input type="hidden" name="action" value="<?= empty($idea['read']) ? 'read' : 'unread' ?>">
            <button class="btn btn--small btn--ghost" type="submit"><?= empty($idea['read']) ? 'Als gelesen markieren' : 'Wieder als neu markieren' ?></button>
          </form>
          <form method="post" data-confirm="Diese Idee wirklich löschen?">
            <?= csrf_field() ?><input type="hidden" name="id" value="<?= e($idea['id']) ?>"><input type="hidden" name="seite" value="<?= $list['page'] ?>"><input type="hidden" name="action" value="delete">
            <button class="btn btn--small btn--danger" type="submit">Löschen</button>
          </form>
        </div>
      </li>
    <?php endforeach; ?>
  </ul>
  <?php pager($list, 'Seiten der Ideen', 'Ideen'); ?>
<?php endif; ?>
<?php page_end(); ?>
