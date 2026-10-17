// Rauchtest ohne Browser: lädt index.html und app.js in jsdom, schaltet den Edit-Mode ein und simuliert Klick-Sperre.
// Friert die Seite ein (Endlosschleife), bricht der Test nach 20 s ab; meldet die Seite „Endlosschleife“, schlägt er fehl.
// Aufruf: npm install --no-save jsdom && node tools/smoke.js
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..') + path.sep;

if (process.argv[2] !== '--child') {
    const r = spawnSync(process.execPath, [__filename, '--child'], { timeout: 20000, encoding: 'utf8' });
    process.stdout.write(r.stdout || '');
    process.stderr.write(r.stderr || '');
    if (r.error || r.status !== 0) { console.error('FEHLER: hängt oder schlägt fehl'); process.exit(1); }
    console.log('OK');
    process.exit(0);
}

const { JSDOM, VirtualConsole } = require('jsdom');
const fehler = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => fehler.push(e.message));
vc.on('error', (...a) => fehler.push(a.join(' ')));

const html = fs.readFileSync(root + 'index.html', 'utf8')
    .replace(/<link[^>]*(googleapis|cdnjs)[^>]*>/g, '')
    .replace(/<script src="app.js[^>]*><\/script>/, '');
const dom = new JSDOM(html, {
    url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
        w.matchMedia = q => ({ matches: /hover: hover|pointer: fine/.test(q), addEventListener() { }, addListener() { } });
        w.ResizeObserver = class { observe() { } disconnect() { } };
        w.CSS = { supports: () => true };
        w.document.elementFromPoint = () => null;   // jsdom hat kein Layout
        w.Element.prototype.scrollIntoView = function () { };   // ebenso
        w.HTMLElement.prototype.showPopover = function () { };
        w.HTMLElement.prototype.hidePopover = function () { };
        w.fetch = async u => /links/.test(u)
            ? { ok: true, status: 200, json: async () => JSON.parse(fs.readFileSync(root + 'links.default.json', 'utf8')) }
            : { ok: true, status: 405, json: async () => ({}) };
    }
});
const w = dom.window, d = w.document;
w.eval(fs.readFileSync(root + 'app.js', 'utf8'));

const ev = (t, o) => new w.MouseEvent(t, Object.assign({ bubbles: true, cancelable: true, button: 0, clientX: 10, clientY: 10 }, o));
// jsdom kennt keine PointerEvents: MouseEvent mit pointerType (Standard: Maus)
const pev = (t, o, kind) => { const e = ev(t, o); Object.defineProperty(e, 'pointerType', { value: kind || 'mouse' }); return e; };
const prüfe = (ok, text) => { if (!ok) fehler.push(text); };
const dann = (fn, ms) => new Promise(r => setTimeout(() => { fn(); r(); }, ms));
(async () => {
    await dann(() => prüfe(d.querySelectorAll('section').length > 0, 'keine Sections gerendert'), 500);
    // Nav: Chips, Zahnrad und Dropdown stehen in einer Zeile (gleiche Flex-Regeln), das Dropdown zuletzt
    await dann(() => {
        const nav = d.getElementById('section-nav-list'), kinder = [...nav.children];
        prüfe(kinder.length > 2 && kinder[kinder.length - 1].id === 'section-jumper', 'Dropdown nicht letzter Nav-Eintrag');
        prüfe(kinder[kinder.length - 2].id === 'settings-btn', 'Zahnrad nicht vor dem Dropdown');
        prüfe(d.querySelectorAll('#jumper-pop a').length === d.querySelectorAll('a.secname').length, 'Liste und Chips unterschiedlich lang');
        prüfe(d.getElementById('section-jumper').tagName === 'BUTTON', 'Dropdown ist kein Button');
        // Hover auf einem Listeneintrag leuchtet Chip und Titel derselben Section (gekoppelte Hervorhebung)
        const entry = d.querySelectorAll('#jumper-pop a')[1], chip = d.querySelectorAll('a.secname')[1], heading = d.querySelectorAll('#container .name')[1];
        entry.dispatchEvent(pev('pointerenter'));
        prüfe(chip.classList.contains('with-hover') && heading.classList.contains('with-hover'), 'Listeneintrag koppelt Chip und Titel nicht');
        entry.dispatchEvent(pev('pointerleave'));
        prüfe(!chip.classList.contains('with-hover') && !heading.classList.contains('with-hover'), 'Kopplung wird nicht zurückgenommen');
    }, 0);
    // Edit-Mode einschalten und die Beobachter (Microtasks) laufen lassen: hier hing die Seite einmal
    await dann(() => { d.body.classList.add('edit-mode'); w.gridInit(); w.releaseLinks(); w.settingsDisplay(); }, 0);
    // Sections umsortieren: Griff am Titel, Ziehen über die zweite Section setzt die erste dahinter, der Vergleich meldet es
    await dann(() => {
        const secs = () => [...d.querySelectorAll('#container section')].map(s => s.querySelector('h3.name').id);
        const vorher = secs(), erste = d.querySelector('#container section');
        prüfe(d.querySelectorAll('.sec-handle').length === vorher.length, 'nicht in jeder Section ein Griff');
        const dt = { setData() { }, setDragImage() { } };
        const dragEv = (typ, o) => { const e = new w.Event(typ, Object.assign({ bubbles: true, cancelable: true }, o)); e.dataTransfer = dt; e.clientY = 5; return e; };
        erste.querySelector('.sec-handle').dispatchEvent(ev('mousedown'));
        prüfe(erste.draggable === true, 'Section nicht ziehbar nach Griff');
        erste.dispatchEvent(dragEv('dragstart'));
        d.querySelectorAll('#container section')[1].dispatchEvent(dragEv('dragover'));
        const nachher = secs();
        prüfe(nachher[0] === vorher[1] && nachher[1] === vorher[0], 'Reihenfolge nicht umgestellt');
        erste.dispatchEvent(dragEv('dragend'));
        prüfe(erste.draggable === false, 'Section bleibt ziehbar nach dem Zug');
        prüfe(w.changesText().includes('Reihenfolge der Sections'), 'Umstellung nicht im Änderungstext');
    }, 0);
    await dann(() => {
        d.querySelector('a.secname').dispatchEvent(pev('pointerdown'));
        prüfe(!d.body.classList.contains('locked'), 'Sperre im Edit-Mode');
        d.body.classList.remove('edit-mode');
    }, 50);
    // Klick-Sperre auf Chip, Aufheben per Mausbewegung
    await dann(() => {
        d.querySelector('a.secname').dispatchEvent(pev('pointerdown'));
        prüfe(d.body.classList.contains('locked'), 'Sperre fehlt nach Chip-Klick');
        d.dispatchEvent(ev('mousemove', { clientX: 80, clientY: 80 }));
        prüfe(!d.body.classList.contains('locked'), 'Sperre bleibt nach Mausbewegung');
        // Auswahl in der Sections-Liste sperrt ebenfalls (Loslassen über einem Eintrag klickt ihn ohne pointerdown)
        w.jumpTo(d.querySelectorAll('a.secname')[1].getAttribute('href'));
        prüfe(d.body.classList.contains('locked'), 'Sperre fehlt nach Auswahl in der Liste');
        d.dispatchEvent(ev('mousemove', { clientX: 200, clientY: 200 }));
        prüfe(!d.body.classList.contains('locked'), 'Sperre bleibt nach Mausbewegung (Liste)');
    }, 50);
    await dann(() => { }, 200);
    fehler.forEach(f => console.error(f));
    process.exit(fehler.length ? 1 : 0);
})();
