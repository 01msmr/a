<?php
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit('Method Not Allowed');
}

$body = file_get_contents('php://input');
if (strlen($body) < 10) {
    http_response_code(400);
    exit('Payload too short');
}

$parsed = json_decode($body);
if ($parsed === null) {
    http_response_code(400);
    exit('Invalid JSON');
}

// Datenbank und Backup bleiben im geschützten Verzeichnis
$target = __DIR__ . '/links.json';

if (file_exists($target)) {
    copy($target, __DIR__ . '/links.bak.json');
}

if (file_put_contents($target, $body) === false) {
    http_response_code(500);
    exit('Write failed');
}

http_response_code(200);
echo 'OK';
