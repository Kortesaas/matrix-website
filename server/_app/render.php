<?php
/**
 * Render functions called from the built pages (see src/components/php/).
 * They fill the markup templates that the Astro build wrote to
 * _app/templates/, so the look is defined in exactly one place.
 */
declare(strict_types=1);

namespace Matrix\Render;

use function Matrix\{e, menu as menu_data, hours as hours_data, team as team_data, notice as notice_data, flyers as flyers_data, order_flyers, settings, in_window, current_program, month_label};

function template(string $name): string
{
    static $cache = [];
    return $cache[$name] ??= (string) @file_get_contents(__DIR__ . "/templates/$name.html");
}

/** %%key%% gets the escaped value, %%!key%% the value as HTML. */
function fill(string $name, array $values): string
{
    $map = [];
    foreach ($values as $key => $value) {
        $map["%%!$key%%"] = (string) $value;
        $map["%%$key%%"] = e((string) $value);
    }
    return strtr(template($name), $map);
}

function paragraphs(string $text): string
{
    return nl2br(e(trim($text)), false);
}

function hours(): void
{
    foreach (hours_data() as $row) {
        echo fill('hours-item', ['days' => $row['days'] ?? '', 'time' => $row['time'] ?? '']);
    }
}

/** The Speisekarte booklet on Theke & Küche: tabs, one page per group, arrows. */
function menu(): void
{
    $groups = array_values(array_filter(menu_data(), fn ($g) => !empty($g['items'])));
    if (!$groups) {
        echo template('menu-soon');
        return;
    }
    $book = count($groups) > 1;
    $tabs = '';
    $pages = '';
    foreach ($groups as $i => $group) {
        $tabs .= fill('menu-tab', ['i' => $i, 'title' => $group['title'], 'selected' => $i === 0 ? 'true' : 'false', 'tabindex' => $i === 0 ? '0' : '-1']);
        $items = '';
        foreach ($group['items'] as $item) {
            $items .= fill('menu-item', [
                'name' => $item['name'],
                'price' => $item['price'],
                'note' => ($item['note'] ?? '') !== '' ? fill('menu-item-note', ['note' => $item['note']]) : '',
            ]);
        }
        $pages .= fill('menu-page', [
            'i' => $i,
            'current' => $i === 0 ? 'is-current' : '',
            'role' => $book ? 'tabpanel' : '',
            'labelledby' => $book ? "menu-tab-$i" : '',
            'title' => $group['title'],
            'items' => $items,
            'note' => ($group['note'] ?? '') !== '' ? fill('menu-group-note', ['note' => $group['note']]) : '',
        ]);
    }
    if ($book) echo fill('menu-tabs', ['tabs' => $tabs]);
    echo fill('menu-pages', ['pages' => $pages]);
    if ($book) echo fill('menu-foot', ['total' => count($groups)]);
}

function team(string $group): void
{
    team_members($group);
    if ($group === 'fsj' && !empty(team_data()['fsjOpening'])) echo template('team-card-open');
}

/** Just the people of a group, without the "Bewirb dich" card (FSJ page). */
function team_members(string $group): void
{
    $team = team_data();
    foreach ($team['members'] as $member) {
        if (($member['group'] ?? '') !== $group || empty($member['visible'])) continue;
        $values = [
            'name' => $member['name'],
            'role' => $member['role'] ?? '',
            'first' => explode(' ', trim($member['name']))[0],
        ];
        if (!empty($member['photo']['src'])) {
            echo fill('team-card-photo', $values + ['src' => $member['photo']['src'], 'srcset' => $member['photo']['srcset'] ?? '']);
        } else {
            echo fill('team-card-placeholder', $values);
        }
    }
}

function notice(): void
{
    $notice = notice_data();
    if (!$notice['active'] || trim($notice['title']) === '' || !in_window($notice['from'], $notice['until'])) return;
    echo fill('notice', [
        'tone' => in_array($notice['tone'], ['closed', 'info', 'special'], true) ? $notice['tone'] : 'info',
        'label' => $notice['label'],
        'title' => $notice['title'],
        'text' => paragraphs($notice['text']),
    ]);
}

/** The Pinnwand: the Monatsprogramm slot and the event posters. */
function flyers(): void
{
    $items = '';
    foreach (visible_flyers() as $flyer) {
        $values = [
            'title' => $flyer['title'],
            'when' => $flyer['when'] ?? '',
            'text' => paragraphs($flyer['description'] ?? ''),
        ];
        $items .= empty($flyer['image']['src'])
            ? fill('flyer-note', $values)
            : fill('flyer-card', poster_values($flyer['image']) + $values + ['alt' => $flyer['alt'] ?: $flyer['title']]);
    }
    // The board always shows: with fallbacks when the Monatsprogramm or the
    // event posters are missing.
    $program = current_program();

    $html = $program
        ? fill('flyer-program', poster_values($program['image']) + ['month' => month_label($program['month'])])
        : fill('flyer-program-empty', ['month' => month_label(date('Y-m'))]);
    echo fill('flyer-section', [
        'program' => $html,
        'items' => $items !== '' ? $items : template('flyer-events-empty'),
    ]);
}

function poster_values(array $image): array
{
    return [
        'src' => $image['src'],
        'full' => $image['src'],
        'srcset' => $image['srcset'],
        'width' => $image['width'],
        'height' => $image['height'],
    ];
}

/** Flyers shown today, in the order arranged in the admin area. */
function visible_flyers(): array
{
    return order_flyers(array_filter(flyers_data(), fn ($f) => in_window($f['from'] ?? '', $f['until'] ?? '')));
}

function calendar_subscribe(): void
{
    $url = settings()['calendar_subscribe_url'];
    if ($url !== '' && preg_match('#^(https|webcal)://#i', $url)) echo fill('calendar-subscribe', ['url' => $url]);
}
