<?php
/**
 * The "Sicherheit" box on the admin dashboard: checks on the live server
 * that nothing private can be reached from outside.
 */
declare(strict_types=1);

namespace Matrix\Security;

use function Matrix\{data_dir, data_path, data_in_web_root, is_https};
use function Matrix\Auth\users;

/** HTTP status of a path on this site, fetched by the server itself. */
function probe(string $path): ?int
{
    $host = strtolower(explode(':', $_SERVER['HTTP_HOST'] ?? '')[0]);
    if (!preg_match('/^[a-z0-9.-]+$/', $host) || !function_exists('curl_init')) return null;
    $ch = curl_init((is_https() ? 'https://' : 'http://') . $_SERVER['HTTP_HOST'] . $path);
    curl_setopt_array($ch, [
        CURLOPT_NOBODY => false,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_TIMEOUT => 4,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_RANGE => '0-200',
    ]);
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    if ($body === false || $status === 0) return null;
    // A 200 with an empty body is the guard of a data file doing its job.
    return $status === 200 && trim((string) $body) === '' ? 404 : $status;
}

/** @return list<array{state: 'ok'|'warn'|'skip', title: string, detail: string}> */
function checks(): array
{
    $out = [];
    $add = function (string $state, string $title, string $detail) use (&$out) {
        $out[] = compact('state', 'title', 'detail');
    };

    $add(is_https() ? 'ok' : 'warn', 'Verschlüsselte Verbindung (HTTPS)', is_https()
        ? 'Passwörter und Inhalte werden verschlüsselt übertragen.'
        : 'Die Seite läuft ohne HTTPS. Bitte beim Webhoster ein Zertifikat aktivieren.');

    $inside = data_in_web_root();
    $add($inside ? 'warn' : 'ok', 'Datenordner', $inside
        ? 'Liegt im Webordner (' . basename(data_dir()) . '/). Er ist gesperrt, sicherer wäre aber ein Ordner „matrix-data“ neben dem Webordner, falls der Hoster das erlaubt.'
        : 'Liegt außerhalb des Webordners und ist von außen nicht erreichbar.');

    $local = PHP_SAPI === 'cli-server';
    $paths = ['/_app/seed.json', '/_app/templates/notice.html', '/_app/auth.php'];
    if ($inside) array_push($paths, '/_data/users.json.php', '/_data/index.html', '/_data/sessions/');
    if ($local) {
        $add('skip', 'Gesperrte Adressen', 'Wird nur auf dem echten Server geprüft.');
    } else {
        $open = [];
        $unknown = 0;
        foreach ($paths as $path) {
            $status = probe($path);
            if ($status === null) $unknown++;
            elseif ($status === 200) $open[] = $path;
        }
        if ($open) $add('warn', 'Gesperrte Adressen', 'Von außen erreichbar: ' . implode(', ', $open) . '. Der Webserver beachtet die .htaccess-Dateien nicht; bitte den Hoster fragen (AllowOverride).');
        elseif ($unknown === count($paths)) $add('skip', 'Gesperrte Adressen', 'Konnte nicht geprüft werden (der Server erreicht sich selbst nicht).');
        else $add('ok', 'Gesperrte Adressen', 'Code, Vorlagen und Daten sind von außen nicht abrufbar.');
    }

    $setupLeft = is_file(data_path('setup-key.php')) || is_file(data_path('setup-key.txt'));
    $add($setupLeft ? 'warn' : 'ok', 'Einrichtungsschlüssel', $setupLeft
        ? 'Die Schlüsseldatei liegt noch im Datenordner. Sie wird beim nächsten Seitenaufruf entfernt.'
        : 'Entfernt; die Ersteinrichtung ist abgeschlossen.');

    $errorsShown = in_array(strtolower((string) ini_get('display_errors')), ['1', 'on', 'stdout'], true);
    $add($errorsShown && !$local ? 'warn' : 'ok', 'Fehlermeldungen', $errorsShown && !$local
        ? 'PHP zeigt Fehler im Browser an. Bitte display_errors beim Hoster ausschalten.'
        : 'PHP-Fehler werden nicht im Browser angezeigt.');

    $starters = count(array_filter(users(), fn ($u) => !empty($u['active']) && !empty($u['must_change'])));
    $add($starters ? 'warn' : 'ok', 'Startpasswörter', $starters
        ? "$starters Konto/Konten nutzen noch ihr Startpasswort. Es wird beim ersten Anmelden geändert; ungenutzte Konten besser sperren."
        : 'Alle aktiven Konten haben ein eigenes Passwort.');

    $add(version_compare(PHP_VERSION, '8.1', '>=') ? 'ok' : 'warn', 'PHP-Version', 'PHP ' . PHP_VERSION . '.');
    return $out;
}
