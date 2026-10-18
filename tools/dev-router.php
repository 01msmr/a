<?php
// Local demo server without a cache: a normal reload immediately shows the newest version.
// Start in the project folder:  php -S 0.0.0.0:8080 tools/dev-router.php
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
        // Version number on CSS/JS: this also bypasses copies from the browser cache of earlier runs
        $html = file_get_contents($file);
        $html = preg_replace_callback('~(styles\.css|js/[\w-]+\.js)\?v=[^"]*~', function ($m) use ($root) {
            return $m[1] . '?v=' . filemtime("$root/$m[1]");
        }, $html);
        echo $html;
        return true;
    }
    readfile($file);
    return true;
}
header('Cache-Control: no-store');
return false;
