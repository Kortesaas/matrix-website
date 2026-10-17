<?php
/** Who changed what, newest first. */
declare(strict_types=1);

require __DIR__ . '/../_app/admin.php';

use function Matrix\e;
use function Matrix\Admin\{require_user, page_start, page_end, when};
use function Matrix\Auth\change_log;

$user = require_user();
$showLogins = isset($_GET['anmeldungen']);
$entries = array_filter(change_log(500), fn ($entry) => $showLogins || $entry['action'] !== 'Anmeldung');

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
        <?php foreach ($entries as $entry): ?>
          <tr>
            <td class="nowrap"><?= e(when($entry['at'])) ?></td>
            <td><?= e($entry['user']) ?></td>
            <td><?= e($entry['action']) ?><?php if ($entry['detail']): ?><br><span class="muted small"><?= e($entry['detail']) ?></span><?php endif; ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  <?php endif; ?>
</div>
<?php page_end();
