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
    if (r.error || r.status !== 0) { console.error('ERROR: hangs or fails'); process.exit(1); }
    console.log('OK');
    process.exit(0);
}

const { JSDOM, VirtualConsole } = require('jsdom');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push(e.message));
vc.on('error', (...a) => errors.push(a.join(' ')));

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
const check = (ok, text) => { if (!ok) errors.push(text); };
const afterMs = (fn, ms) => new Promise(r => setTimeout(() => { fn(); r(); }, ms));
(async () => {
    await afterMs(() => check(d.querySelectorAll('section').length > 0, 'no sections rendered'), 500);
    // Nav: Chips, Zahnrad und Dropdown stehen in einer Zeile (gleiche Flex-Regeln), das Dropdown zuletzt
    await afterMs(() => {
        const nav = d.getElementById('section-nav-list'), kids = [...nav.children];
        check(kids.length > 2 && kids[kids.length - 1].id === 'section-jumper', 'dropdown is not the last nav entry');
        check(kids[kids.length - 2].id === 'settings-btn', 'gear is not before the dropdown');
        check(d.querySelectorAll('#jumper-pop a').length === d.querySelectorAll('a.secname').length, 'list and chips differ in length');
        check(d.getElementById('section-jumper').tagName === 'BUTTON', 'dropdown is not a button');
        // Hover auf einem Listeneintrag leuchtet Chip und Titel derselben Section (gekoppelte Hervorhebung)
        const entry = d.querySelectorAll('#jumper-pop a')[1], chip = d.querySelectorAll('a.secname')[1], heading = d.querySelectorAll('#container .name')[1];
        entry.dispatchEvent(pev('pointerenter'));
        check(chip.classList.contains('with-hover') && heading.classList.contains('with-hover'), 'list entry does not couple chip and heading');
        entry.dispatchEvent(pev('pointerleave'));
        check(!chip.classList.contains('with-hover') && !heading.classList.contains('with-hover'), 'coupling is not undone');
    }, 0);
    // Edit-Mode einschalten und die Beobachter (Microtasks) laufen lassen: hier hing die Seite einmal
    await afterMs(() => { d.body.classList.add('edit-mode'); w.gridInit(); w.releaseLinks(); w.settingsDisplay(); }, 0);
    // Sections umsortieren: Griff am Titel, Ziehen über die zweite Section setzt die erste dahinter, der Vergleich meldet es
    await afterMs(() => {
        const secs = () => [...d.querySelectorAll('#container section')].map(s => s.querySelector('h3.name').id);
        const orderBefore = secs(), firstSec = d.querySelector('#container section');
        check(d.querySelectorAll('.sec-handle').length === orderBefore.length, 'not every section has a handle');
        const dt = { setData() { }, setDragImage() { } };
        const dragEv = (evType, o) => { const e = new w.Event(evType, Object.assign({ bubbles: true, cancelable: true }, o)); e.dataTransfer = dt; e.clientY = 5; return e; };
        firstSec.querySelector('.sec-handle').dispatchEvent(ev('mousedown'));
        check(firstSec.draggable === true, 'section not draggable after handle');
        firstSec.dispatchEvent(dragEv('dragstart'));
        d.querySelectorAll('#container section')[1].dispatchEvent(dragEv('dragover'));
        const orderAfter = secs();
        check(orderAfter[0] === orderBefore[1] && orderAfter[1] === orderBefore[0], 'order not changed');
        firstSec.dispatchEvent(dragEv('dragend'));
        check(firstSec.draggable === false, 'section stays draggable after the drag');
        check(w.changesText().includes('Order of sections'), 'reordering missing in the change text');
    }, 0);
    await afterMs(() => {
        d.querySelector('a.secname').dispatchEvent(pev('pointerdown'));
        check(!d.body.classList.contains('locked'), 'lock in edit mode');
        d.body.classList.remove('edit-mode');
    }, 50);
    // Klick-Sperre auf Chip, Aufheben per Mausbewegung
    await afterMs(() => {
        d.querySelector('a.secname').dispatchEvent(pev('pointerdown'));
        check(d.body.classList.contains('locked'), 'lock missing after chip click');
        d.dispatchEvent(ev('mousemove', { clientX: 80, clientY: 80 }));
        check(!d.body.classList.contains('locked'), 'lock stays after mouse movement');
        // Auswahl in der Sections-Liste sperrt ebenfalls (Loslassen über einem Eintrag klickt ihn ohne pointerdown)
        w.jumpTo(d.querySelectorAll('a.secname')[1].getAttribute('href'));
        check(d.body.classList.contains('locked'), 'lock missing after selection in the list');
        d.dispatchEvent(ev('mousemove', { clientX: 200, clientY: 200 }));
        check(!d.body.classList.contains('locked'), 'lock stays after mouse movement (list)');
    }, 50);
    await afterMs(() => { }, 200);
    errors.forEach(f => console.error(f));
    process.exit(errors.length ? 1 : 0);
})();
