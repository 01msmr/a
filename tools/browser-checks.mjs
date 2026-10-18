// Checks that need a real browser (the jsdom smoke test has no layout): layout shift, settings word size, Apple logo font, icon glyphs.
// Usage: npm install --no-save puppeteer-core && node tools/browser-checks.mjs [url]
// Without a url it serves the project with tools/dev-router.php on a free port. CHROME_PATH names the browser
// (default: Google Chrome on macOS, else Chrome for Testing from the puppeteer cache). links.php is answered from links.default.json plus one Apple-logo link.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer, { KnownDevices } from 'puppeteer-core';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const check = (ok, text) => { console.log((ok ? 'PASS ' : 'FAIL ') + text); if (!ok) failures.push(text); };
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

// deterministic data: the seed list plus one link that starts with the Apple logo character
const data = JSON.parse(fs.readFileSync(path.join(root, 'links.default.json'), 'utf8'));
data[0].links.unshift({ name: ' world.today', url: 'https://example.com/' });
const body = JSON.stringify(data);

async function open(browser, url, device, opts = {}) {
    const page = await browser.newPage();
    if (device) await page.emulate(KnownDevices[device]); else await page.setViewport({ width: 1280, height: 800 });
    await page.setRequestInterception(true);
    page.on('request', r => /\/links\.php/.test(r.url()) ? r.respond({ status: 200, contentType: 'application/json', body }) : r.continue());
    if (opts.slow) {
        const c = await page.createCDPSession();
        await c.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
        await c.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    }
    await page.evaluateOnNewDocument(() => {
        window.__shift = 0;
        new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__shift += e.value; }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(url, { waitUntil: 'networkidle0' });
    await wait(1200);
    return page;
}

const server = process.argv[2] ? { url: process.argv[2], stop() { } } : await serve();
const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: ['--no-sandbox'] });
try {
    // 1. layout shift: the page must not move while it loads
    for (const [label, device, slow] of [['phone, slow network', 'iPhone 15', true], ['desktop', null, false]]) {
        const page = await open(browser, server.url, device, { slow });
        const shift = await page.evaluate(() => window.__shift);
        check(shift <= 0.01, `layout shift ${shift.toFixed(3)} <= 0.01 (${label})`);
        await page.close();
    }

    // 2. settings overlay: the words are as large as the word on the gear; on very narrow phones they only have to fit
    for (const device of ['iPhone 15', 'iPhone 15 Pro Max', 'Pixel 5', 'iPad Mini', 'iPhone SE']) {
        const page = await open(browser, server.url, device);
        const res = await page.evaluate(async () => {
            const out = [], w = ms => new Promise(r => setTimeout(r, ms));
            document.getElementById('settings-btn').click(); await w(500);
            const ref = parseFloat(getComputedStyle(document.querySelector('#settings-btn .secshort')).fontSize);
            for (const mode of ['auto', 'light', 'dark']) {
                if (mode === 'auto') window.msmrTheme.setAuto(); else window.msmrTheme.set(mode);
                settingsDisplay(); await w(150);
                document.querySelectorAll('#settings-pop .set-btn').forEach(btn => {
                    const ic = btn.querySelector('.set-icon');
                    [ic, ...ic.querySelectorAll('.set-letter, .set-text')].filter(e => /set-letter|set-text/.test(e.className)).forEach(e => {
                        const range = document.createRange(); range.selectNodeContents(e);
                        out.push({ text: e.textContent, size: parseFloat(getComputedStyle(e).fontSize), ref, fits: range.getBoundingClientRect().width <= btn.getBoundingClientRect().width + 0.5 });
                    });
                });
            }
            return out;
        });
        const narrow = device === 'iPhone SE';
        const bad = res.filter(r => !r.fits || (!narrow && Math.abs(r.size - r.ref) > 0.05));
        check(res.length > 0 && !bad.length, `settings words ${narrow ? 'fit the button' : 'match the size of "set"'} (${device}, ${res.length} words)` + (bad.length ? ': ' + JSON.stringify(bad[0]) : ''));
        await page.close();
    }

    // 3. Apple logo character (U+F8FF) is drawn by our own font, not by a system font that only Apple devices have
    {
        const page = await open(browser, server.url, null);
        const c = await page.createCDPSession(); await c.send('DOM.enable'); await c.send('CSS.enable');
        const doc = await c.send('DOM.getDocument', { depth: -1 });
        const all = await c.send('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'li a' });
        let fonts = null;
        for (const id of all.nodeIds) {
            const { outerHTML } = await c.send('DOM.getOuterHTML', { nodeId: id });
            if (outerHTML.includes('')) { fonts = (await c.send('CSS.getPlatformFontsForNode', { nodeId: id })).fonts; break; }
        }
        check(fonts && fonts.length > 0 && fonts.every(f => f.isCustomFont), 'Apple logo link is drawn by custom fonts only' + (fonts ? ': ' + fonts.map(f => f.familyName + (f.isCustomFont ? '' : ' (system)')).join(', ') : ' (link not found)'));
        await page.close();
    }

    // 4. every section icon gets a glyph from the Font Awesome stylesheet, and a Font Awesome face is loaded for it
    {
        const page = await open(browser, server.url, 'iPhone 15');
        const r = await page.evaluate(() => ({
            icons: [...document.querySelectorAll('#container h3.name i.secicon')].map(i => [i.className, getComputedStyle(i, '::before').content]),
            faces: [...document.fonts].filter(f => /Font Awesome/.test(f.family) && f.status === 'loaded').map(f => f.family + ' ' + f.weight)
        }));
        const empty = r.icons.filter(([, c]) => !c || c === 'none' || c === 'normal' || c === '""');
        check(r.icons.length > 0 && !empty.length && r.faces.length > 0, `all ${r.icons.length} section icons have a glyph, loaded font faces: ${r.faces.join(', ') || 'none'}` + (empty.length ? '; no glyph: ' + empty.map(e => e[0]).join(', ') : ''));
        await page.close();
    }
} finally {
    await browser.close();
    server.stop();
}
console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nOK');
process.exit(failures.length ? 1 : 0);
