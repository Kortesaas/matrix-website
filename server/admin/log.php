<?php
/** Who changed what, newest first. */
declare(strict_types=1);

require __DIR__ . '/../_app/admin.php';

use function Matrix\e;
use function Matrix\Admin\{require_user, page_start, page_end, when, paginate, pager, avatar};
use function Matrix\Auth\{change_log, users};

$user = require_user();
$showLogins = isset($_GET['anmeldungen']);
$entries = array_filter(change_log(5000), fn ($entry) => $showLogins || $entry['action'] !== 'Anmeldung');
$list = paginate($entries, 25);
// Profile pictures by username, so you can see at a glance who did what.
$people = array_column(users(), null, 'username');

page_start('Verlauf', $user);
?>
<p class="lead">Jede Änderung im Verwaltungsbereich, mit Person und Zeitpunkt.</p>
<p><a href="log.php<?= $showLogins ? '' : '?anmeldungen' ?>"><?= $showLogins ? 'Anmeldungen ausblenden' : 'Anmeldungen auch zeigen' ?></a></p>
<div class="card">
  <?php if (!$entries): ?>
    <p class="muted">Noch keine Einträge.</p>
  <?php else: ?>
    <table class="table">
      <thead><tr><th>Wann</th><th>Wer</th><th>Was</th></tr></thead>
      <tbody>
        <?php foreach ($list['items'] as $entry): ?>
          <tr>
            <td class="nowrap"><?= e(when($entry['at'])) ?></td>
            <td><span class="who"><?php avatar($people[$entry['username'] ?? ''] ?? ['name' => $entry['user']], 'who__avatar'); ?><?= e($entry['user']) ?></span></td>
            <td><?= e($entry['action']) ?><?php if ($entry['detail']): ?><br><span class="muted small"><?= e($entry['detail']) ?></span><?php endif; ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
    <?php pager($list, 'Seiten des Verlaufs', 'Einträge'); ?>
  <?php endif; ?>
</div>
<?php page_end();
