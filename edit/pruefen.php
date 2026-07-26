<?php
// Prüft alle URLs aus links.json und markiert tote mit "tot": true.
// Ohne Parameter wird nur berichtet; ?schreiben=1 schreibt die Markierungen.
// Der Verzeichnisschutz vor /edit/ ist die einzige Absicherung — wie bei save.php.

set_time_limit(300);
header('Content-Type: text/html; charset=utf-8');

$datei = __DIR__ . '/links.json';
if (!file_exists($datei)) {
    http_response_code(500);
    exit('links.json fehlt');
}

$daten = json_decode(file_get_contents($datei), true);
if (!is_array($daten)) {
    http_response_code(500);
    exit('links.json ist kein gültiges JSON');
}

$schreiben = isset($_GET['schreiben']) && $_GET['schreiben'] === '1';
$UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 '
    . '(KHTML, like Gecko) Version/17.0 Safari/605.1.15';

// Adressen im eigenen Netz sind von außen nicht erreichbar und nie "tot"
function intern($url)
{
    $host = parse_url($url, PHP_URL_HOST);
    if (!$host) return true;
    if (preg_match('/\.(local|fritz\.box|lan|home)$/i', $host)) return true;
    if (filter_var($host, FILTER_VALIDATE_IP)) {
        return !filter_var($host, FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
    }
    return false;
}

// alle Einträge einsammeln, mit Rückverweis auf ihren Platz in $daten
$eintraege = [];
foreach ($daten as $si => $sec) {
    foreach (($sec['links'] ?? []) as $li => $link) {
        $eintraege[] = ['si' => $si, 'li' => $li,
            'sec' => $sec['title'] ?? '?', 'name' => $link['name'] ?? '?',
            'url' => $link['url'] ?? ''];
    }
}

function pruefeStapel($stapel, $UA)
{
    $mh = curl_multi_init();
    $handles = [];
    foreach ($stapel as $i => $e) {
        $ch = curl_init($e['url']);
        curl_setopt_array($ch, [
            CURLOPT_NOBODY => true,          // HEAD zuerst
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 5,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_USERAGENT => $UA,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_RETURNTRANSFER => true,
        ]);
        curl_multi_add_handle($mh, $ch);
        $handles[$i] = $ch;
    }
    do {
        curl_multi_exec($mh, $laufend);
        curl_multi_select($mh, 0.5);
    } while ($laufend > 0);

    $ergebnis = [];
    foreach ($handles as $i => $ch) {
        $ergebnis[$i] = ['code' => (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE),
                         'fehler' => curl_error($ch)];
        curl_multi_remove_handle($mh, $ch);
        curl_close($ch);
    }
    curl_multi_close($mh);
    return $ergebnis;
}

// Server mögen HEAD nicht immer — solche Fälle einzeln mit GET nachfassen
function nachfassen($url, $UA)
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 5,
        CURLOPT_TIMEOUT => 20, CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_USERAGENT => $UA, CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_RETURNTRANSFER => true,
    ]);
    curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $fehler = curl_error($ch);
    curl_close($ch);
    return ['code' => $code, 'fehler' => $fehler];
}

$tot = [];
$unklar = [];
$ok = [];
$uebersprungen = [];

foreach (array_chunk($eintraege, 12, true) as $stapel) {
    $pruefbar = [];
    foreach ($stapel as $i => $e) {
        if ($e['url'] === '' || intern($e['url'])) {
            $uebersprungen[] = $e;
        } else {
            $pruefbar[$i] = $e;
        }
    }
    if (!$pruefbar) continue;

    foreach (pruefeStapel($pruefbar, $UA) as $i => $r) {
        $e = $pruefbar[$i];
        if (in_array($r['code'], [403, 405, 501], true) || $r['code'] === 0) {
            $r = nachfassen($e['url'], $UA);   // HEAD abgelehnt oder gescheitert
        }
        $e['code'] = $r['code'];
        $e['fehler'] = $r['fehler'];

        if ($r['code'] >= 200 && $r['code'] < 400) {
            $ok[] = $e;
        } elseif (in_array($r['code'], [404, 410], true)
            || ($r['code'] === 0 && preg_match('/resolve|refused|not connect|timed out/i', $r['fehler']))) {
            $tot[] = $e;
        } else {
            $unklar[] = $e;   // 401, 403, 429, 5xx: Bot-Sperren und Serverlaunen
        }
    }
}

if ($schreiben) {
    foreach ($daten as $si => $sec) {
        foreach (($sec['links'] ?? []) as $li => $link) {
            unset($daten[$si]['links'][$li]['tot']);
        }
    }
    foreach ($tot as $e) {
        $daten[$e['si']]['links'][$e['li']]['tot'] = true;
    }
    copy($datei, __DIR__ . '/links.bak.json');
    $json = json_encode($daten, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (file_put_contents($datei, $json . "\n") === false) {
        http_response_code(500);
        exit('Schreiben fehlgeschlagen');
    }
}

function zeile($e)
{
    return '<tr><td>' . htmlspecialchars($e['sec']) . '</td><td>'
        . htmlspecialchars($e['name']) . '</td><td>'
        . ($e['code'] ?: htmlspecialchars(substr($e['fehler'] ?? '', 0, 60)))
        . '</td><td><a href="' . htmlspecialchars($e['url']) . '">'
        . htmlspecialchars($e['url']) . '</a></td></tr>';
}

echo '<!doctype html><meta charset="utf-8"><title>URL-Prüfung</title>';
echo '<style>body{font:14px/1.5 system-ui,sans-serif;margin:2em;max-width:60em}'
    . 'table{border-collapse:collapse;width:100%;margin:.5em 0 2em}'
    . 'td,th{border-bottom:1px solid #ddd;padding:4px 8px;text-align:left;'
    . 'vertical-align:top;font-size:13px}a{word-break:break-all}'
    . 'h2{margin-top:1.5em}.tot{color:#c00}</style>';

echo '<h1>URL-Prüfung</h1><p>Geprüft: ' . count($eintraege) . ' · erreichbar: '
    . count($ok) . ' · <span class="tot">tot: ' . count($tot) . '</span> · unklar: '
    . count($unklar) . ' · übersprungen: ' . count($uebersprungen) . '</p>';

echo $schreiben
    ? '<p><b>Geschrieben.</b> Die vorige Fassung steht in links.bak.json.</p>'
    : '<p>Nur berichtet, nichts geändert. Zum Übernehmen: '
      . '<a href="?schreiben=1">?schreiben=1</a></p>';

echo '<h2 class="tot">Tot (' . count($tot) . ')</h2><table>'
    . '<tr><th>Section<th>Name<th>Status<th>URL';
foreach ($tot as $e) echo zeile($e);
echo '</table>';

echo '<h2>Unklar – nicht markiert (' . count($unklar) . ')</h2>'
    . '<p>Bot-Sperren und Serverlaunen: 401, 403, 429, 5xx.</p><table>'
    . '<tr><th>Section<th>Name<th>Status<th>URL';
foreach ($unklar as $e) echo zeile($e);
echo '</table>';

echo '<h2>Übersprungen – eigenes Netz (' . count($uebersprungen) . ')</h2><table>'
    . '<tr><th>Section<th>Name<th>Status<th>URL';
foreach ($uebersprungen as $e) echo zeile($e);
echo '</table>';
