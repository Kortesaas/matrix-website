<?php
/**
 * Image uploads from the admin area. Every upload is decoded and saved anew
 * as WebP in a few widths: that strips camera data (EXIF, GPS) and makes
 * sure only real images are stored. Files live in the data folder (so a new
 * upload of the site never deletes them) and are served by /media.php.
 */
declare(strict_types=1);

namespace Matrix\Images;

use function Matrix\{data_path, random_id};

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;

/**
 * @param array $file one entry of $_FILES
 * @param string $folder "team", "flyer" or "avatar"
 * @param int[] $widths target widths; smaller originals keep their size
 * @param bool $square cut the middle square out first (profile pictures)
 * @return array|string image info for the content files, or an error message
 */
function store(array $file, string $folder, array $widths, bool $square = false): array|string
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        return match ($file['error'] ?? null) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Das Bild ist zu groß (höchstens 15 MB).',
            UPLOAD_ERR_NO_FILE => 'Bitte ein Bild auswählen.',
            default => 'Das Hochladen hat nicht geklappt. Bitte noch einmal versuchen.',
        };
    }
    if ($file['size'] > MAX_BYTES) return 'Das Bild ist zu groß (höchstens 15 MB).';
    if (!is_uploaded_file($file['tmp_name'])) return 'Ungültiger Upload.';

    $info = @getimagesize($file['tmp_name']);
    if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP, IMAGETYPE_GIF], true)) {
        return 'Bitte ein Foto als JPG, PNG, WebP oder GIF hochladen.';
    }
    if ($info[0] * $info[1] > MAX_PIXELS) return 'Das Bild hat zu viele Pixel. Bitte eine kleinere Version hochladen.';

    @ini_set('memory_limit', '512M');
    $image = match ($info[2]) {
        IMAGETYPE_JPEG => @imagecreatefromjpeg($file['tmp_name']),
        IMAGETYPE_PNG => @imagecreatefrompng($file['tmp_name']),
        IMAGETYPE_WEBP => @imagecreatefromwebp($file['tmp_name']),
        IMAGETYPE_GIF => @imagecreatefromgif($file['tmp_name']),
    };
    if (!$image) return 'Das Bild konnte nicht gelesen werden.';
    if ($info[2] === IMAGETYPE_JPEG) $image = orient($image, $file['tmp_name']);
    if ($square) {
        $side = min(imagesx($image), imagesy($image));
        $image = imagecrop($image, ['x' => intdiv(imagesx($image) - $side, 2), 'y' => intdiv(imagesy($image) - $side, 2), 'width' => $side, 'height' => $side]) ?: $image;
    }

    if (!preg_match('/^[a-z]+$/', $folder)) return 'Ungültiger Ordner.';
    $dir = data_path("uploads/$folder");
    \Matrix\ensure_dir(data_path('uploads'));
    \Matrix\ensure_dir($dir);
    if (!is_writable($dir)) return 'Der Upload-Ordner ist nicht beschreibbar.';

    $webp = function_exists('imagewebp');
    $ext = $webp ? 'webp' : 'jpg';
    $base = date('Ymd') . '-' . random_id(6);
    $srcW = imagesx($image);
    $srcH = imagesy($image);
    $targets = array_unique(array_merge(array_filter($widths, fn ($w) => $w < $srcW), [min($srcW, max($widths))]));
    sort($targets);

    $files = [];
    $srcset = [];
    foreach ($targets as $w) {
        $h = (int) round($srcH * $w / $srcW);
        $copy = imagecreatetruecolor($w, $h);
        imagealphablending($copy, false);
        imagesavealpha($copy, true);
        imagecopyresampled($copy, $image, 0, 0, 0, 0, $w, $h, $srcW, $srcH);
        $name = "$base-$w.$ext";
        $ok = $webp ? imagewebp($copy, "$dir/$name", 82) : imagejpeg($copy, "$dir/$name", 85);
        if (!$ok) return 'Das Bild konnte nicht gespeichert werden.';
        $files[] = "$folder/$name";
        $srcset[] = media_url("$folder/$name") . " {$w}w";
    }

    $largest = end($targets);
    return [
        'src' => media_url(end($files)),
        'srcset' => implode(', ', $srcset),
        'width' => $largest,
        'height' => (int) round($srcH * $largest / $srcW),
        'files' => $files,
    ];
}

/** Phone photos are often stored sideways with a rotation note in EXIF. */
function orient(\GdImage $image, string $path): \GdImage
{
    $exif = function_exists('exif_read_data') ? @exif_read_data($path) : false;
    $angle = match ((int) ($exif['Orientation'] ?? 1)) {
        3 => 180,
        6 => -90,
        8 => 90,
        default => 0,
    };
    if ($angle === 0) return $image;
    $rotated = imagerotate($image, $angle, 0);
    return $rotated ?: $image;
}

const FILE_PATTERN = '#^[a-z]+/[A-Za-z0-9-]+\\.(webp|jpg)$#';

function media_url(string $file): string
{
    return '/media.php?f=' . $file;
}

/** Full path of a stored file, or null for anything that is not one. */
function media_path(string $file): ?string
{
    if (!preg_match(FILE_PATTERN, $file)) return null;
    $path = data_path("uploads/$file");
    return is_file($path) ? $path : null;
}

/** Removes the files of an uploaded image (built seed images are left alone). */
function delete(?array $image): void
{
    foreach ($image['files'] ?? [] as $file) {
        if ($path = media_path($file)) @unlink($path);
    }
}
