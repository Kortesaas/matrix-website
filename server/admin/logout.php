<?php
declare(strict_types=1);

require __DIR__ . '/../_app/admin.php';

use function Matrix\Admin\{redirect, is_post, flash};
use function Matrix\Auth\{check_csrf, logout};

if (is_post()) {
    check_csrf();
    logout();
    flash('success', 'Du bist abgemeldet.');
}
redirect('login.php');
