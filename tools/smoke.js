// Smoke test without a browser: loads index.html and its js/ scripts in jsdom, switches edit mode on and simulates the click lock.
// If the page freezes (infinite loop), the test aborts after 20 s; if the page reports an "infinite loop", it fails.
// Usage: npm install --no-save jsdom && node tools/smoke.js   (the jsdom setup is in tools/page-env.js)
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

const { w, d, errors, rawHtml } = require('./page-env.js')();

const ev = (t, o) => new w.MouseEvent(t, Object.assign({ bubbles: true, cancelable: true, button: 0, clientX: 10, clientY: 10 }, o));
// jsdom has no PointerEvents: MouseEvent with pointerType (default: mouse)
const pev = (t, o, kind) => { const e = ev(t, o); Object.defineProperty(e, 'pointerType', { value: kind || 'mouse' }); return e; };
const check = (ok, text) => { if (!ok) errors.push(text); };
const afterMs = (fn, ms) => new Promise(r => setTimeout(() => { fn(); r(); }, ms));
(async () => {
    // Assets stay out of index.html; the icon script (favicon/touch-icon-inline.js) sets a data: URI link
    check(!rawHtml.includes('data:image'), 'index.html embeds a data: URI');
    // every local file that styles.css and index.html point to must exist (a missing font fails silently in the browser)
    const refs = [...fs.readFileSync(root + 'styles.css', 'utf8').matchAll(/url\(\s*['"]?(?!data:|https?:|#)([^'")?]+)/g)].map(m => m[1])
        .concat([...rawHtml.matchAll(/(?:href|src)="(?!data:|https?:|#)([^"?]+)/g)].map(m => m[1]));
    refs.filter(f => f !== './' && !fs.existsSync(root + f.replace(/^\.\//, ''))).forEach(f => check(false, 'referenced file is missing: ' + f));
    check(new Set(rawHtml.match(/\?v=[^"]*/g)).size === 1, 'index.html has more than one ?v= value');   // old and new files must not mix
    check(/href="vendor\/fontawesome-\d[^"]*\/css\//.test(rawHtml), 'Font Awesome path has no version (its fonts are cached for a year)');
    check(!/googleapis|gstatic|cdnjs/.test(rawHtml), 'index.html loads fonts or CSS from a third-party host');
    const touch = d.querySelectorAll('link[rel="apple-touch-icon"]');
    check(touch.length === 1 && touch[0].href.startsWith('data:image/png;base64,'), 'apple-touch-icon is not a single data: URI link after the icon script');
    await afterMs(() => {
        check(d.querySelectorAll('section').length > 0, 'no sections rendered');
        check(d.body.classList.contains('rendered'), 'body has no rendered class after render (the nav row stays hidden)');
    }, 500);
    // Nav: chips, gear and dropdown are in one row (same flex rules), the dropdown last
    await afterMs(() => {
        const nav = d.getElementById('section-nav-list'), kids = [...nav.children];
        check(kids.length > 2 && kids[kids.length - 1].id === 'section-jumper', 'dropdown is not the last nav entry');
        check(kids[kids.length - 2].id === 'settings-btn', 'gear is not before the dropdown');
        check(d.querySelectorAll('#jumper-pop a').length === d.querySelectorAll('a.secname').length, 'list and chips differ in length');
        check(d.getElementById('section-jumper').tagName === 'BUTTON', 'dropdown is not a button');
        // Hover on a list entry lights chip and heading of the same section (coupled highlight)
        const entry = d.querySelectorAll('#jumper-pop a')[1], chip = d.querySelectorAll('a.secname')[1], heading = d.querySelectorAll('#container .name')[1];
        entry.dispatchEvent(pev('pointerenter'));
        check(chip.classList.contains('with-hover') && heading.classList.contains('with-hover'), 'list entry does not couple chip and heading');
        entry.dispatchEvent(pev('pointerleave'));
        check(!chip.classList.contains('with-hover') && !heading.classList.contains('with-hover'), 'coupling is not undone');
    }, 0);
    // Icon mode: no custom squircle anywhere, the APP section and the Navigation entry use Font Awesome's fa-square
    await afterMs(() => {
        d.body.classList.add('nav-icons'); w.settingsDisplay();
        check(!d.querySelector('.icon-squircle'), 'a custom icon-squircle element is still used');
        check(d.querySelector('#settings-pop .fa-square') !== null, 'the Navigation entry does not show fa-square in icon mode');
        check(d.querySelector('a.secname .fa-square') !== null, 'the APP section does not show fa-square');
        d.body.classList.remove('nav-icons'); w.settingsDisplay();
    }, 0);
    // Switch edit mode on and let the observers (microtasks) run: the page once hung here
    await afterMs(() => { d.body.classList.add('edit-mode'); w.gridInit(); w.releaseLinks(); w.settingsDisplay(); }, 0);
    // Re-sort sections: handle on the heading, dragging over the second section puts the first behind it, the comparison reports it
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
    // Click lock on chip, release by mouse movement
    await afterMs(() => {
        d.querySelector('a.secname').dispatchEvent(pev('pointerdown'));
        check(d.body.classList.contains('locked'), 'lock missing after chip click');
        d.dispatchEvent(ev('mousemove', { clientX: 80, clientY: 80 }));
        check(!d.body.classList.contains('locked'), 'lock stays after mouse movement');
        // Selection in the sections list locks as well (releasing over an entry clicks it without a pointerdown)
        w.jumpTo(d.querySelectorAll('a.secname')[1].getAttribute('href'));
        check(d.body.classList.contains('locked'), 'lock missing after selection in the list');
        d.dispatchEvent(ev('mousemove', { clientX: 200, clientY: 200 }));
        check(!d.body.classList.contains('locked'), 'lock stays after mouse movement (list)');
    }, 50);
    await afterMs(() => {
        const n = re => w.fetchLog.filter(u => re.test(u)).length;
        check(n(/^links\.php/) === 1, 'links.php is not fetched exactly once (' + n(/^links\.php/) + ')');
        check(n(/^never-dead\.json/) === 1, 'never-dead.json is not fetched exactly once (' + n(/^never-dead\.json/) + ')');
        check(w.msmrLinks && typeof w.msmrLinks.then === 'function', 'links.php is not started from the head (window.msmrLinks)');
    }, 200);
    errors.forEach(f => console.error(f));
    process.exit(errors.length ? 1 : 0);
})();
