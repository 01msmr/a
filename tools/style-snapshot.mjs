// Safety net for CSS refactors: the computed style of every element (and its ::before/::after) in 24 combinations of screen, color scheme and setting
// (phones, iPad, desktop; light/dark; icon mode, grid, centered, edit mode, medium zoom). Only layout and looks, no timing.
//   node tools/style-snapshot.mjs save FILE.json.gz    take the snapshot before the change
//   node tools/style-snapshot.mjs check FILE.json.gz   take a new one and list every difference (exit 1 if there is any)
// Keep FILE outside the repo (about 3 MB). Needs Chrome (CHROME_PATH) and puppeteer-core like tools/browser-checks.mjs; data: links.default.json.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import puppeteer, { KnownDevices } from 'puppeteer-core';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [mode, file] = process.argv.slice(2);
if (!['save', 'check'].includes(mode) || !file) { console.error('usage: node tools/style-snapshot.mjs save|check FILE.json.gz'); process.exit(2); }
const wait = ms => new Promise(r => setTimeout(r, ms));

function findChrome() {
    if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
    const mac = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    if (fs.existsSync(mac)) return mac;
    const cache = path.join(os.homedir(), '.cache/puppeteer/chrome');
    if (fs.existsSync(cache)) for (const v of fs.readdirSync(cache).sort().reverse()) {
        const dir = path.join(cache, v);
        const hit = fs.readdirSync(dir).map(d => path.join(dir, d, 'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')).find(fs.existsSync);
        if (hit) return hit;
    }
    throw new Error('no Chrome found: set CHROME_PATH');
}

async function serve() {
    for (let i = 0; i < 20; i++) {
        const port = 20000 + Math.floor(Math.random() * 20000);
        const child = spawn('php', ['-S', '127.0.0.1:' + port, 'tools/dev-router.php'], { cwd: root, stdio: 'ignore' });
        for (let t = 0; t < 30; t++) {
            await wait(100);
            try { if ((await fetch('http://127.0.0.1:' + port + '/')).ok) return { url: 'http://127.0.0.1:' + port + '/', stop: () => child.kill() }; } catch { /* not up yet */ }
        }
        child.kill();
    }
    throw new Error('could not start php -S');
}

const body = fs.readFileSync(path.join(root, 'links.default.json'), 'utf8');
const views = [['iphone15', 'iPhone 15'], ['iphoneSE', 'iPhone SE'], ['ipadmini', 'iPad Mini'], ['desktop', null, { width: 1280, height: 800 }], ['iphone15-landscape', 'iPhone 15 landscape']];
const variants = [['text', {}, false], ['icons', { 'a.navMode': 'icons' }, false], ['grid', { 'a.view': 'grid' }, false], ['center', { 'a.align': 'center' }, false],
    ['gridcenter', { 'a.view': 'grid', 'a.align': 'center' }, false], ['edit', {}, true], ['zoomM', { 'msmr.zoom': '{"v":1,"level":"m"}' }, false]];

function collect() {   // runs in the page
    const res = {};
    const path = e => { const parts = []; for (let n = e; n && n.nodeType === 1 && n !== document.documentElement; n = n.parentElement) { const sib = n.parentElement ? [...n.parentElement.children].indexOf(n) : 0; parts.unshift(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + ':' + sib); } return parts.join('>'); };
    for (const pseudo of [null, '::before', '::after']) for (const e of document.querySelectorAll('body, body *')) {
        if (e.closest('svg')) continue;
        const cs = getComputedStyle(e, pseudo);
        if (pseudo && (cs.content === 'none' || cs.content === 'normal')) continue;
        const o = {};
        for (let i = 0; i < cs.length; i++) { const k = cs[i]; if (!/^(-webkit-|animation|transition|view-transition|scroll-timeline|timeline)/.test(k) && k !== 'caret-color') o[k] = cs.getPropertyValue(k).split(location.origin).join(''); }   // no port in urls
        res[path(e) + (pseudo || '')] = o;
    }
    return res;
}

async function snapshot() {
    const server = await serve();
    const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: ['--no-sandbox'] });
    const out = {};
    try {
        for (const [name, device, vp] of views) for (const scheme of ['light', 'dark']) for (const [vid, prefs, edit] of variants) {
            const full = ['iphone15', 'desktop', 'ipadmini'].includes(name) && scheme === 'light';
            if (vid !== 'text' && !full) continue;
            if (vid === 'zoomM' && name !== 'desktop') continue;
            if (vid === 'icons' && name !== 'iphone15') continue;
            const page = await browser.newPage();
            if (device) await page.emulate(KnownDevices[device]);
            else {   // the layout queries use device-width: the screen size has to follow the window
                await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
                const c = await page.createCDPSession();
                await c.send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: false, screenWidth: vp.width, screenHeight: vp.height });
            }
            await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
            await page.evaluateOnNewDocument(p => { try { for (const k in p) localStorage.setItem(k, p[k]); } catch { /* no storage */ } }, prefs);
            await page.setRequestInterception(true);
            page.on('request', r => /\/links\.php/.test(r.url()) ? r.respond({ status: 200, contentType: 'application/json', body }) : r.continue());
            await page.goto(server.url, { waitUntil: 'networkidle0' });
            await page.addStyleTag({ content: '*,*::before,*::after{transition:none !important;animation:none !important}' });
            if (edit) await page.evaluate(() => document.body.classList.add('edit-mode'));
            await wait(1500);
            out[`${name}|${scheme}|${vid}`] = await page.evaluate(collect);
            await page.close();
        }
    } finally { await browser.close(); server.stop(); }
    return out;
}

const now = await snapshot();
if (mode === 'save') {
    fs.writeFileSync(file, zlib.gzipSync(JSON.stringify(now)));
    console.log('saved', Object.keys(now).length, 'views to', file);
} else {
    const before = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString().replace(/http:\/\/127\.0\.0\.1:\d+/g, ''));
    let total = 0;
    for (const v of new Set([...Object.keys(before), ...Object.keys(now)])) {
        const A = before[v] || {}, B = now[v] || {}, diffs = [];
        for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) {
            if (!A[k] || !B[k]) { diffs.push((A[k] ? 'removed ' : 'added ') + k); continue; }
            for (const p of new Set([...Object.keys(A[k]), ...Object.keys(B[k])])) if (A[k][p] !== B[k][p]) diffs.push(`${k} { ${p}: ${A[k][p]} -> ${B[k][p]} }`);
        }
        total += diffs.length;
        if (diffs.length) console.log(`== ${v}: ${diffs.length} differences\n` + diffs.slice(0, 15).join('\n'));
    }
    console.log(total ? `${total} differences` : 'no differences in ' + Object.keys(now).length + ' views');
    process.exit(total ? 1 : 0);
}
