<?php
/**
 * Prepended to every built page by scripts/postbuild.mjs. Pages show edited
 * content, so browsers revalidate them instead of keeping an old copy.
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/render.php';

header('Cache-Control: no-cache');
header('X-Content-Type-Options: nosniff');
