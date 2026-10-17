<?php
// Checks all URLs in links.json and marks dead ones with "dead": true.
// Without parameters it only reports; ?write=1 writes the marks.
// The directory protection in front of /edit/ is the only safeguard — as with save.php.

set_time_limit(300);
header('Content-Type: text/html; charset=utf-8');

$file = __DIR__ . '/links.json';
if (!file_exists($file)) {
    http_response_code(500);
    exit('links.json is missing');
}

$data = json_decode(file_get_contents($file), true);
if (!is_array($data)) {
    http_response_code(500);
    exit('links.json is not valid JSON');
}

$write = isset($_GET['write']) && $_GET['write'] === '1';
$UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 '
    . '(KHTML, like Gecko) Version/17.0 Safari/605.1.15';

// These addresses are never "dead": the own network plus everything in ../never-dead.json (all IP addresses, host names);
// the page (app.js) reads the same file
$EXCEPTIONS = json_decode((string) @file_get_contents(__DIR__ . '/../never-dead.json'), true) ?: [];
$ALL_IPS = $EXCEPTIONS['allIpAddresses'] ?? true;
$NEVER_DEAD_HOSTS = array_map('strtolower', $EXCEPTIONS['hosts'] ?? []);

function internal($url)
{
    global $ALL_IPS, $NEVER_DEAD_HOSTS;
    $host = parse_url($url, PHP_URL_HOST);
    if (!$host) return true;
    $host = strtolower(trim($host, '[]'));
    if (preg_match('/\.(local|fritz\.box|lan|home)$/i', $host)) return true;
    if (filter_var($host, FILTER_VALIDATE_IP)) {
        // private and reserved addresses are never reachable from outside; public ones only if the file exempts all IPs
        return $ALL_IPS || !filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
    }
    return in_array($host, $NEVER_DEAD_HOSTS, true);
}

// collect all entries, with a back reference to their place in $data
$entries = [];
foreach ($data as $si => $sec) {
    foreach (($sec['links'] ?? []) as $li => $link) {
        $entries[] = ['si' => $si, 'li' => $li,
            'sec' => $sec['title'] ?? '?', 'name' => $link['name'] ?? '?',
            'url' => $link['url'] ?? ''];
    }
}

// Checks a batch of entries in parallel. HEAD first; with $get = true a GET that stops after the first bytes.
function checkBatch($batch, $UA, $get = false)
{
    $mh = curl_multi_init();
    $handles = [];
    foreach ($batch as $i => $e) {
        $ch = curl_init($e['url']);
        $opts = [
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 5,
            CURLOPT_TIMEOUT => 12,
            CURLOPT_CONNECTTIMEOUT => 6,
            CURLOPT_USERAGENT => $UA,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_RETURNTRANSFER => true,
        ];
        if ($get) {
            // servers do not always like HEAD: ask with GET, but abort after the first chunk (the status line is enough)
            $opts[CURLOPT_WRITEFUNCTION] = function ($ch, $chunk) { return 0; };
        } else {
            $opts[CURLOPT_NOBODY] = true;
        }
        curl_setopt_array($ch, $opts);
        curl_multi_add_handle($mh, $ch);
        $handles[$i] = $ch;
    }
    do {
        curl_multi_exec($mh, $running);
        curl_multi_select($mh, 0.5);
    } while ($running > 0);

    $result = [];
    foreach ($handles as $i => $ch) {
        $code = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        // an aborted GET reports a write error although the status code arrived
        $error = $code ? '' : curl_error($ch);
        $result[$i] = ['code' => $code, 'error' => $error];
        curl_multi_remove_handle($mh, $ch);
        curl_close($ch);
    }
    curl_multi_close($mh);
    return $result;
}

$dead = [];
$unclear = [];
$ok = [];
$skipped = [];

// Show progress while checking (the check takes a while): send the page head first and flush after every batch
header('X-Accel-Buffering: no');
while (ob_get_level()) ob_end_flush();
ob_implicit_flush(true);
echo '<!doctype html><meta charset="utf-8"><title>URL check</title><h1>URL check</h1><p>Checking ' . count($entries) . ' entries …</p><pre>';
$done = 0;
foreach (array_chunk($entries, 40, true) as $batch) {
    $checkable = [];
    foreach ($batch as $i => $e) {
        if ($e['url'] === '' || internal($e['url'])) {
            $skipped[] = $e;
        } else {
            $checkable[$i] = $e;
        }
    }
    $done += count($batch);
    if ($checkable) {
        $results = checkBatch($checkable, $UA);
        // HEAD rejected or failed: ask those again with GET, also in parallel
        $again = [];
        foreach ($results as $i => $r) {
            if (in_array($r['code'], [403, 405, 501], true) || $r['code'] === 0) $again[$i] = $checkable[$i];
        }
        if ($again) {
            foreach (checkBatch($again, $UA, true) as $i => $r) $results[$i] = $r;
        }
        foreach ($results as $i => $r) {
            $e = $checkable[$i];
            $e['code'] = $r['code'];
            $e['error'] = $r['error'];
            if ($r['code'] >= 200 && $r['code'] < 400) {
                $ok[] = $e;
            } elseif (in_array($r['code'], [404, 410], true)
                || ($r['code'] === 0 && preg_match('/resolve|refused|not connect|timed out/i', $r['error']))) {
                $dead[] = $e;
            } else {
                $unclear[] = $e;   // 401, 403, 429, 5xx: bot blocks and server moods
            }
        }
    }
    echo $done . ' / ' . count($entries) . "\n";
}
echo '</pre>';

if ($write) {
    foreach ($data as $si => $sec) {
        foreach (($sec['links'] ?? []) as $li => $link) {
            unset($data[$si]['links'][$li]['dead']);
        }
    }
    foreach ($dead as $e) {
        $data[$e['si']]['links'][$e['li']]['dead'] = true;
    }
    copy($file, __DIR__ . '/links.bak.json');
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (file_put_contents($file, $json . "\n") === false) {
        http_response_code(500);
        exit('Writing failed');
    }
}

function row($e)
{
    return '<tr><td>' . htmlspecialchars($e['sec']) . '</td><td>'
        . htmlspecialchars($e['name']) . '</td><td>'
        . (($e['code'] ?? 0) ?: htmlspecialchars(substr($e['error'] ?? '', 0, 60)))
        . '</td><td><a href="' . htmlspecialchars($e['url']) . '">'
        . htmlspecialchars($e['url']) . '</a></td></tr>';
}

echo '<style>body{font:14px/1.5 system-ui,sans-serif;margin:2em;max-width:60em}'
    . 'table{border-collapse:collapse;width:100%;margin:.5em 0 2em}'
    . 'td,th{border-bottom:1px solid #ddd;padding:4px 8px;text-align:left;'
    . 'vertical-align:top;font-size:13px}a{word-break:break-all}'
    . 'h2{margin-top:1.5em}.dead{color:#c00}</style>';

echo '<h1>Result</h1><p>Checked: ' . count($entries) . ' · reachable: '
    . count($ok) . ' · <span class="dead">dead: ' . count($dead) . '</span> · unclear: '
    . count($unclear) . ' · skipped: ' . count($skipped) . '</p>';

echo $write
    ? '<p><b>Written.</b> The previous version is in links.bak.json.</p>'
    : '<p>Report only, nothing changed. To apply: '
      . '<a href="?write=1">?write=1</a></p>';

echo '<h2 class="dead">Dead (' . count($dead) . ')</h2><table>'
    . '<tr><th>Section<th>Name<th>Status<th>URL';
foreach ($dead as $e) echo row($e);
echo '</table>';

echo '<h2>Unclear – not marked (' . count($unclear) . ')</h2>'
    . '<p>Bot blocks and server moods: 401, 403, 429, 5xx.</p><table>'
    . '<tr><th>Section<th>Name<th>Status<th>URL';
foreach ($unclear as $e) echo row($e);
echo '</table>';

echo '<h2>Skipped – own network (' . count($skipped) . ')</h2><table>'
    . '<tr><th>Section<th>Name<th>Status<th>URL';
foreach ($skipped as $e) echo row($e);
echo '</table>';
