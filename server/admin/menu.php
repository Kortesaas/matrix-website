<?php
/** The Speisekarte on Theke & Küche: one booklet page per group (Essen, Getränke …). */
declare(strict_types=1);

require __DIR__ . '/../_app/admin.php';

use function Matrix\{e, menu, write_json, read_json};
use function Matrix\Admin\{require_user, page_start, page_end, redirect, is_post, errors, flash, when};
use function Matrix\Auth\{check_csrf, csrf_field, log_change};

const MAX_GROUPS = 6;
const MAX_ITEMS = 40;

$user = require_user();
$groups = menu();
$errors = [];

/** "1,5", "1.50 €" or "20 ct" become "1,50 €" / "0,20 €"; other text stays as typed. */
function price(string $price): string
{
    $price = trim(preg_replace('/\s+/u', ' ', $price));
    if (preg_match('/^(\d{1,3})\s*ct$/iu', $price, $m)) return number_format((int) $m[1] / 100, 2, ',', '') . ' €';
    if (preg_match('/^(\d{1,3})(?:[.,](\d{1,2}))?\s*(?:€|eur|euro)?$/iu', $price, $m)) {
        return number_format((float) ($m[1] . '.' . ($m[2] ?? '0')), 2, ',', '') . ' €';
    }
    return $price;
}

if (is_post()) {
    check_csrf();
    $text = fn (mixed $value, int $max) => mb_substr(trim(is_string($value) ? $value : ''), 0, $max);
    $groups = [];
    foreach ((array) ($_POST['groups'] ?? []) as $posted) {
        if (!is_array($posted)) continue;
        $group = ['title' => $text($posted['title'] ?? '', 30), 'note' => $text($posted['note'] ?? '', 160), 'items' => []];
        $rows = (array) ($posted['items'] ?? []);
        foreach ((array) ($rows['name'] ?? []) as $i => $name) {
            $item = [
                'name' => $text($name, 60),
                'price' => $text($rows['price'][$i] ?? '', 20),
                'note' => $text($rows['note'][$i] ?? '', 80),
            ];
            if ($item['name'] === '' && $item['price'] === '' && $item['note'] === '') continue;
            if ($item['name'] === '' || $item['price'] === '') {
                $errors['row'] = 'Jeder Eintrag braucht einen Namen und einen Preis.';
            } else {
                $item['price'] = price($item['price']);
            }
            $group['items'][] = $item;
        }
        if ($group['title'] === '' && !$group['items'] && $group['note'] === '') continue;
        if ($group['title'] === '') $errors['title'] = 'Jede Seite braucht einen Namen (z. B. „Getränke“).';
        elseif (!$group['items']) $errors[] = "Auf der Seite „{$group['title']}“ steht noch nichts.";
        if (count($group['items']) > MAX_ITEMS) $errors[] = 'Höchstens ' . MAX_ITEMS . " Einträge pro Seite („{$group['title']}“).";
        $groups[] = $group;
    }
    if (count($groups) > MAX_GROUPS) $errors[] = 'Höchstens ' . MAX_GROUPS . ' Seiten.';

    if (!$errors) {
        write_json('menu.json', ['groups' => $groups, 'updated_at' => date('c'), 'updated_by' => $user['name']]);
        $count = array_sum(array_map(fn ($g) => count($g['items']), $groups));
        log_change($user, 'Speisekarte geändert', implode(', ', array_column($groups, 'title')) . " ($count Einträge)");
        flash('success', $groups ? 'Die Speisekarte ist gespeichert.' : 'Gespeichert. Die Speisekarte ist jetzt leer, auf der Website steht „kommt bald“.');
        redirect('menu.php');
    }
}

$meta = read_json('menu.json');

/** One page of the menu; with $key "__G__" it is the template for new pages. */
function group_fields(string $key, array $group): void
{
    $name = fn (string $field) => 'groups[' . e($key) . "][$field]";
    $items = [...($group['items'] ?? []), ['name' => '', 'price' => '', 'note' => '']];
    ?>
  <div class="menu-group" data-group data-row-scope>
    <div class="menu-group__head">
      <label>Seite <input name="<?= $name('title') ?>" value="<?= e($group['title'] ?? '') ?>" maxlength="30" placeholder="z. B. Getränke"></label>
      <div class="menu-tools">
        <button type="button" class="icon-btn" data-move-group="-1" aria-label="Seite nach vorne">↑</button>
        <button type="button" class="icon-btn" data-move-group="1" aria-label="Seite nach hinten">↓</button>
        <button type="button" class="icon-btn" data-remove-group aria-label="Seite entfernen">✕</button>
      </div>
    </div>
    <div class="menu-rows" data-rows>
      <div class="menu-rows__head" aria-hidden="true"><span>Name</span><span>Preis</span><span>Hinweis</span><span></span></div>
      <?php foreach ($items as $item): ?>
        <div class="menu-row" data-row>
          <input name="<?= $name('items') ?>[name][]" aria-label="Name" value="<?= e($item['name']) ?>" maxlength="60" placeholder="z. B. Kräuterbaguette">
          <input name="<?= $name('items') ?>[price][]" aria-label="Preis" value="<?= e($item['price']) ?>" maxlength="20" placeholder="1,50 €">
          <input name="<?= $name('items') ?>[note][]" aria-label="Hinweis" value="<?= e($item['note'] ?? '') ?>" maxlength="80" placeholder="optional, z. B. jeden Freitag">
          <div class="menu-tools">
            <button type="button" class="icon-btn" data-move-row="-1" aria-label="Nach oben">↑</button>
            <button type="button" class="icon-btn" data-move-row="1" aria-label="Nach unten">↓</button>
            <button type="button" class="icon-btn" data-remove-row aria-label="Eintrag entfernen">✕</button>
          </div>
        </div>
      <?php endforeach; ?>
    </div>
    <p><button type="button" class="btn btn--small btn--ghost" data-add-row>Eintrag hinzufügen</button></p>
    <label>Kleingedrucktes unter der Seite <input name="<?= $name('note') ?>" value="<?= e($group['note'] ?? '') ?>" maxlength="160" placeholder="optional, z. B. Auf alle Flaschen kommen 50 ct Pfand."></label>
  </div>
    <?php
}

page_start('Speisekarte', $user);
?>
<p class="lead">Steht als kleines Heft auf der Seite „Theke &amp; Küche“, jede Seite hier ist eine Seite zum Umblättern. Preise wie „1,5“ oder „20 ct“ werden automatisch zu „1,50 €“ und „0,20 €“. Leere Zeilen werden ignoriert.</p>
<?php if ($meta): ?><p class="muted small">Zuletzt geändert von <?= e($meta['updated_by']) ?> am <?= e(when($meta['updated_at'])) ?>.</p><?php endif; ?>
<?php errors(array_values($errors)); ?>
<form method="post" class="card form">
  <?= csrf_field() ?>
  <div class="menu-groups" data-groups>
    <?php foreach ($groups ?: [['title' => '', 'items' => []]] as $i => $group) group_fields((string) $i, $group); ?>
  </div>
  <p><button type="button" class="btn btn--small btn--ghost" data-add-group>Seite hinzufügen</button></p>
  <template data-group-template><?php group_fields('__G__', ['title' => '', 'items' => []]); ?></template>
  <button class="btn" type="submit">Speichern</button>
</form>
<?php page_end();
