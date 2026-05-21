<?php
$base = '/var/www/vhosts/hosting189417.ae8d9.netcup.net/a.msmr.co';
$candidates = [
    $base . '/.htpasswd',
    $base . '/httpdocs/.htpasswd',
    $base . '/httpdocs/edit/.htpasswd',
    $base . '/conf/.htpasswd',
    $base . '/conf/htpasswd',
    dirname($base) . '/.htpasswd',
    '/etc/httpd/.htpasswd',
    '/usr/local/psa/admin/.htpasswd',
];
foreach ($candidates as $f) {
    echo (file_exists($f) ? '<b style="color:green">✓ FOUND</b>' : '✗') . ': ' . $f . '<br>';
}
