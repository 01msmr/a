<?php
$base = '/var/www/vhosts/hosting189417.ae8d9.netcup.net/a.msmr.co';
$candidates = [
    $base . '/.htpasswd',
    $base . '/httpdocs/.htpasswd',
    $base . '/conf/.htpasswd',
    dirname($base) . '/.htpasswd',
];
foreach ($candidates as $f) {
    echo (file_exists($f) ? '✓ FOUND' : '✗ nicht da') . ': ' . $f . '<br>';
}
