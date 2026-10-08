<?php
// Lokaler Demo-Server ohne Cache: ein normaler Reload zeigt sofort die neueste Fassung.
// Start im Projektordner:  php -S 0.0.0.0:8080 tools/dev-router.php
$root = dirname(__DIR__);
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if ($path === '/') $path = '/index.html';
$file = realpath($root . $path);
if ($file && strpos($file, $root) === 0 && is_file($file) && pathinfo($file, PATHINFO_EXTENSION) !== 'php') {
    $types = ['css' => 'text/css', 'js' => 'application/javascript', 'html' => 'text/html',
        'json' => 'application/json', 'png' => 'image/png', 'ico' => 'image/x-icon'];
    $ext = pathinfo($file, PATHINFO_EXTENSION);
    header('Content-Type: ' . ($types[$ext] ?? 'application/octet-stream'));
    header('Cache-Control: no-store');
    if ($ext === 'html') {
        // Versionsnummer an CSS/JS: auch Kopien aus dem Browser-Cache früherer Läufe werden so umgangen
        $html = file_get_contents($file);
        foreach (['styles.css', 'app.js'] as $asset) {
            $html = str_replace("\"$asset\"", "\"$asset?v=" . filemtime("$root/$asset") . "\"", $html);
        }
        echo $html;
        return true;
    }
    readfile($file);
    return true;
}
header('Cache-Control: no-store');
return false;
