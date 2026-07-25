<?php
$file = __DIR__ . '/edit/links.json';

if (!file_exists($file)) {
    file_put_contents($file, file_get_contents(__DIR__ . '/links.default.json'));
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache');
readfile($file);
