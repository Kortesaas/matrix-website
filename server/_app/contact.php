<?php
/**
 * The contact form on Mitmachen (/mitmachen/#kontakt): checks a message and
 * sends it by e-mail to the team.
 *
 * Spam protection: Google reCAPTCHA v3 (score) when keys are configured, plus
 * the same self-hosted checks as the whiteboard ideas: a signed form token
 * that must be a few seconds old, a honeypot field and limits per visitor
 * and per day (the IP only as a salted hash, dropped after a day). Without
 * reCAPTCHA keys the form still works with the self-hosted checks alone.
 *
 * Configuration (environment variables, e.g. `SetEnv` in the host's panel or
 * a `.htaccess` outside the uploaded site, or `contact-config.php` in the data
 * folder returning an array with the same names). Nothing secret is in dist/.
 *   RECAPTCHA_SITE_KEY    public key for the page (reCAPTCHA v3)
 *   RECAPTCHA_SECRET_KEY  secret key, only used on the server
 *   RECAPTCHA_MIN_SCORE   0.0–1.0, default 0.5
 *   CONTACT_TO            recipient, default info@diematrix.de
 *   MAIL_FROM             sender address on our domain, default website@<host>
 *   SMTP_HOST, SMTP_PORT (465 = SSL, otherwise STARTTLS), SMTP_USER, SMTP_PASS
 *                         send via SMTP instead of PHP's mail()
 * Locally (php -S) messages are written to the data folder's outbox/ instead.
 */
declare(strict_types=1);

namespace Matrix\Contact;

use function Matrix\{data_path, ensure_dir, read_json, update_json, random_id, write_json};

const DEFAULT_TO = 'info@diematrix.de';
const TOPICS = [
    'frage' => 'Allgemeine Frage',
    'angebote' => 'Angebote & Events',
    'mitmachen' => 'Mitmachen & FSJ',
    'idee' => 'Idee oder Vorschlag',
    'feedback' => 'Lob & Kritik',
    'sonstiges' => 'Etwas anderes',
];
const MAX_NAME = 100;
const MAX_MESSAGE = 4000;
const MIN_MESSAGE = 10;
const TOKEN_MIN_AGE = 3;
const TOKEN_MAX_AGE = 6 * 3600;
const PER_VISITOR_HOUR = 3;
const PER_VISITOR_DAY = 6;
const PER_DAY_TOTAL = 80;

/** A setting from the environment, else from contact-config.php in the data folder. */
function config(string $name, string $default = ''): string
{
    static $file = null;
    $value = getenv($name);
    if ($value === false || $value === '') $value = $_SERVER[$name] ?? $_SERVER["REDIRECT_$name"] ?? '';
    if ($value === '') {
        if ($file === null) {
            $path = data_path('contact-config.php');
            $file = is_file($path) ? (array) (include $path) : [];
        }
        $value = (string) ($file[$name] ?? '');
    }
    return $value !== '' ? (string) $value : $default;
}

function site_key(): string
{
    return config('RECAPTCHA_SECRET_KEY') !== '' ? config('RECAPTCHA_SITE_KEY') : '';
}

function secret(): string
{
    $saved = read_json('contact-secret.json');
    if (is_array($saved) && !empty($saved['key'])) return $saved['key'];
    $key = random_id(32);
    write_json('contact-secret.json', ['key' => $key]);
    return $key;
}

function token(): string
{
    $time = (string) time();
    return $time . '.' . hash_hmac('sha256', $time, secret());
}

function token_problem(string $token): ?string
{
    [$time, $mac] = array_pad(explode('.', $token, 2), 2, '');
    if (!ctype_digit($time) || !hash_equals(hash_hmac('sha256', $time, secret()), $mac)) return 'Bitte lade die Seite neu und versuch es noch einmal.';
    $age = time() - (int) $time;
    if ($age < TOKEN_MIN_AGE) return 'Nicht so schnell! Versuch es gleich noch einmal.';
    if ($age > TOKEN_MAX_AGE) return 'Die Seite war sehr lange offen. Bitte kopier deine Nachricht, lade die Seite neu und schick sie noch einmal.';
    return null;
}

/** Checks the reCAPTCHA v3 answer with Google; null when fine or not configured. */
function captcha_problem(string $answer): ?string
{
    $secret = config('RECAPTCHA_SECRET_KEY');
    if ($secret === '') return null;
    $failed = 'Die Spam-Prüfung hat nicht geklappt. Versuch es bitte noch einmal oder schreib uns direkt eine E-Mail.';
    if ($answer === '') return $failed;

    $body = http_build_query(['secret' => $secret, 'response' => $answer, 'remoteip' => $_SERVER['REMOTE_ADDR'] ?? '']);
    $raw = false;
    if (function_exists('curl_init')) {
        $curl = curl_init('https://www.google.com/recaptcha/api/siteverify');
        curl_setopt_array($curl, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8]);
        $raw = curl_exec($curl);
        curl_close($curl);
    } else {
        $raw = @file_get_contents('https://www.google.com/recaptcha/api/siteverify', false, stream_context_create([
            'http' => ['method' => 'POST', 'header' => 'Content-Type: application/x-www-form-urlencoded', 'content' => $body, 'timeout' => 8],
        ]));
    }
    $result = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($result)) {
        error_log('reCAPTCHA: keine Antwort von Google');
        return 'Die Spam-Prüfung ist gerade nicht erreichbar. Versuch es später noch einmal oder schreib uns direkt eine E-Mail.';
    }
    $min = (float) config('RECAPTCHA_MIN_SCORE', '0.5');
    if (empty($result['success']) || ($result['action'] ?? '') !== 'contact' || (float) ($result['score'] ?? 0) < $min) return $failed;
    return null;
}

function visitor(): string
{
    return hash_hmac('sha256', $_SERVER['REMOTE_ADDR'] ?? '', secret());
}

/** Counts this message against the limits; a message when one is reached. */
function rate_problem(): ?string
{
    $who = visitor();
    $now = time();
    $problem = null;
    update_json('contact-limits.json', [], function ($limits) use ($who, $now, &$problem) {
        $limits = is_array($limits) ? $limits : [];
        foreach ($limits as $key => $times) {
            $limits[$key] = array_values(array_filter((array) $times, fn ($t) => $t > $now - 86400));
            if (!$limits[$key]) unset($limits[$key]);
        }
        $mine = $limits[$who] ?? [];
        $total = array_sum(array_map('count', $limits));
        if (count(array_filter($mine, fn ($t) => $t > $now - 3600)) >= PER_VISITOR_HOUR) $problem = 'Du hast uns gerade schon ein paar Nachrichten geschickt. Versuch es bitte in einer Stunde noch einmal.';
        elseif (count($mine) >= PER_VISITOR_DAY) $problem = 'Du hast uns heute schon einige Nachrichten geschickt. Versuch es bitte morgen noch einmal.';
        elseif ($total >= PER_DAY_TOTAL) $problem = 'Heute sind schon sehr viele Nachrichten angekommen. Schreib uns bitte direkt eine E-Mail.';
        if (!$problem) $limits[$who] = [...$mine, $now];
        return $limits;
    });
    return $problem;
}

/** One line of plain text: no line breaks (header injection), no control characters. */
function line(string $value, int $max): string
{
    $value = trim(preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $value) ?? '');
    return mb_substr(preg_replace('/\s+/u', ' ', $value) ?? '', 0, $max);
}

/**
 * Validates the posted fields.
 * @return array{0: array{name: string, email: string, topic: string, message: string}, 1: array<string, string>}
 */
function validate(array $input): array
{
    $data = [
        'name' => line((string) ($input['name'] ?? ''), MAX_NAME),
        'email' => line((string) ($input['email'] ?? ''), 200),
        'topic' => (string) ($input['topic'] ?? ''),
        'message' => trim(str_replace("\r\n", "\n", (string) ($input['message'] ?? ''))),
    ];
    $data['message'] = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $data['message']) ?? '';
    $errors = [];
    if ($data['name'] === '') $errors['name'] = 'Wie heißt du?';
    if ($data['email'] !== '' && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) $errors['email'] = 'Diese E-Mail-Adresse sieht nicht richtig aus.';
    if (!isset(TOPICS[$data['topic']])) $errors['topic'] = 'Worum geht es?';
    $length = mb_strlen($data['message']);
    if ($length < MIN_MESSAGE) $errors['message'] = 'Schreib uns bitte ein paar Worte mehr.';
    elseif ($length > MAX_MESSAGE) $errors['message'] = 'Deine Nachricht ist zu lang (höchstens ' . MAX_MESSAGE . ' Zeichen).';
    return [$data, $errors];
}

/** Sends the message to the team; false when it could not be handed over. */
function send(array $data): bool
{
    $to = config('CONTACT_TO', DEFAULT_TO);
    $host = preg_replace('/:\d+$/', '', strtolower($_SERVER['HTTP_HOST'] ?? 'localhost')) ?: 'localhost';
    $host = preg_replace('/^www\./', '', $host);
    $from = config('MAIL_FROM', "website@$host");
    $topic = TOPICS[$data['topic']];
    $subject = "Kontaktformular: $topic – " . $data['name'];
    $text = "Neue Nachricht über das Kontaktformular der Website\n\n"
        . 'Name:    ' . $data['name'] . "\n"
        . 'E-Mail:  ' . ($data['email'] !== '' ? $data['email'] : '(keine angegeben, Antwort nicht möglich)') . "\n"
        . "Anliegen: $topic\n"
        . 'Datum:   ' . date('d.m.Y, H:i') . " Uhr\n\n"
        . $data['message'] . "\n";

    $headers = [
        'From' => encode_name('MatriX Website') . " <$from>",
        'MIME-Version' => '1.0',
        'Content-Type' => 'text/plain; charset=UTF-8',
        'Content-Transfer-Encoding' => '8bit',
        'X-Mailer' => 'MatriX Website',
    ];
    if ($data['email'] !== '') $headers['Reply-To'] = encode_name($data['name']) . ' <' . $data['email'] . '>';

    if (config('SMTP_HOST') !== '') return smtp($to, $from, $subject, $text, $headers);
    if (PHP_SAPI === 'cli-server') return outbox($to, $subject, $text, $headers);
    $encoded = mb_encode_mimeheader($subject, 'UTF-8', 'B', "\r\n");
    $lines = implode("\r\n", array_map(fn ($k, $v) => "$k: $v", array_keys($headers), $headers));
    return mail($to, $encoded, str_replace("\n", "\r\n", $text), $lines, '-f' . $from);
}

function encode_name(string $name): string
{
    $name = str_replace(['"', '\\'], '', $name);
    return preg_match('/[^\x20-\x7E]/', $name) ? mb_encode_mimeheader($name, 'UTF-8', 'B') : "\"$name\"";
}

/** Local testing: keep the mail as a file in the data folder. */
function outbox(string $to, string $subject, string $text, array $headers): bool
{
    $dir = data_path('outbox');
    ensure_dir($dir);
    $head = "To: $to\nSubject: $subject\n" . implode("\n", array_map(fn ($k, $v) => "$k: $v", array_keys($headers), $headers));
    return file_put_contents("$dir/" . date('Ymd-His') . '-' . random_id(3) . '.txt', "$head\n\n$text") !== false;
}

/** A small SMTP client (STARTTLS, or SSL on port 465) with AUTH LOGIN. */
function smtp(string $to, string $from, string $subject, string $text, array $headers): bool
{
    $host = config('SMTP_HOST');
    $port = (int) config('SMTP_PORT', '587');
    $ssl = $port === 465;
    $socket = @stream_socket_client(($ssl ? 'ssl://' : 'tcp://') . "$host:$port", $errno, $errstr, 10);
    if (!$socket) {
        error_log("SMTP: keine Verbindung zu $host:$port ($errstr)");
        return false;
    }
    stream_set_timeout($socket, 10);
    $read = function () use ($socket): string {
        $reply = '';
        while (($line = fgets($socket, 515)) !== false) {
            $reply .= $line;
            if (strlen($line) < 4 || $line[3] === ' ') break;
        }
        return $reply;
    };
    $say = function (string $command, int $expect) use ($socket, $read): bool {
        if ($command !== '') fwrite($socket, "$command\r\n");
        $reply = $read();
        if ((int) substr($reply, 0, 3) !== $expect) {
            error_log('SMTP: ' . preg_replace('/AUTH.*/', 'AUTH …', $command) . ' → ' . trim($reply));
            return false;
        }
        return true;
    };
    $name = gethostname() ?: 'localhost';
    $ok = $say('', 220) && $say("EHLO $name", 250);
    if ($ok && !$ssl) {
        $ok = $say('STARTTLS', 220)
            && stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT)
            && $say("EHLO $name", 250);
    }
    $user = config('SMTP_USER');
    if ($ok && $user !== '') {
        $ok = $say('AUTH LOGIN', 334) && $say(base64_encode($user), 334) && $say(base64_encode(config('SMTP_PASS')), 235);
    }
    $ok = $ok && $say("MAIL FROM:<$from>", 250) && $say("RCPT TO:<$to>", 250) && $say('DATA', 354);
    if ($ok) {
        $head = ['To' => $to, 'Subject' => mb_encode_mimeheader($subject, 'UTF-8', 'B', "\r\n"), 'Date' => date('r'), 'Message-ID' => '<' . random_id(12) . '@' . (explode('@', $from)[1] ?? 'localhost') . '>', ...$headers];
        $body = str_replace("\n", "\r\n", $text);
        // Dot-stuffing: a line with a single dot would end the message.
        $body = preg_replace('/^\./m', '..', $body);
        fwrite($socket, implode("\r\n", array_map(fn ($k, $v) => "$k: $v", array_keys($head), $head)) . "\r\n\r\n$body\r\n.\r\n");
        $ok = $say('', 250);
    }
    @fwrite($socket, "QUIT\r\n");
    fclose($socket);
    return $ok;
}
