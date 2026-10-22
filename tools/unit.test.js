// Unit tests for the pure logic in js/ (no layout needed). Run: npm install --no-save jsdom && node --test
// The scripts are classic scripts with shared globals, so they are loaded into jsdom as in the page (tools/page-env.js).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { w } = require('./page-env.js')();
const plain = o => JSON.parse(JSON.stringify(o));   // objects from the jsdom window have another Array/Object prototype than Node's

test('isNeverDead: IPv4 and IPv6 addresses never count as dead while allIpAddresses is on', () => {
    w.neverDead.allIpAddresses = true;
    assert.equal(w.isNeverDead('http://10.0.10.1/'), true);
    assert.equal(w.isNeverDead('http://172.23.29.110:8080/x'), true);
    assert.equal(w.isNeverDead('http://[::1]/'), true);
});

test('isNeverDead: IP addresses count normally when allIpAddresses is off', () => {
    w.neverDead.allIpAddresses = false;
    assert.equal(w.isNeverDead('http://10.0.10.1/'), false);
    w.neverDead.allIpAddresses = true;
});

test('isNeverDead: listed host names are exempt, regardless of the case in the URL', () => {
    w.neverDead.hosts = ['kitchen.toolbox-bodensee.de', 'orderbox'];
    assert.equal(w.isNeverDead('https://Kitchen.Toolbox-Bodensee.de/page'), true);
    assert.equal(w.isNeverDead('http://orderbox/'), true);
    w.neverDead.hosts = [];
});

test('isNeverDead: other hosts and unparseable URLs are not exempt', () => {
    w.neverDead.hosts = ['orderbox'];
    assert.equal(w.isNeverDead('https://example.com/'), false);
    assert.equal(w.isNeverDead('not a url'), false);
    assert.equal(w.isNeverDead(''), false);
    w.neverDead.hosts = [];
});

test('withApp: a missing APP section is added as the 3rd section, empty, with the fa-square icon', () => {
    const data = w.withApp([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    assert.equal(data.length, 4);
    assert.deepEqual(plain(data[2]), { id: 'app', title: 'app', icon: 'fa-square', links: [] });
});

test('withApp: with fewer than two sections the APP section goes to the end', () => {
    const data = w.withApp([{ id: 'a' }]);
    assert.deepEqual(data.map(s => s.id), ['a', 'app']);
});

test('withApp: an existing APP section is kept (one only) and a capital title becomes lowercase', () => {
    const data = w.withApp([{ id: 'a' }, { id: 'app', title: 'APP', icon: 'fa-square', links: [{ name: 'x', url: 'u' }] }]);
    assert.equal(data.filter(s => s.id === 'app').length, 1);
    assert.equal(data[1].title, 'app');
    assert.equal(data[1].links.length, 1);
});

test('sectionColor: the palette wraps around and the intensity ends up in the color', () => {
    const palette = w.SEC_COLORS.length;
    assert.equal(w.sectionColor(0), w.sectionColor(palette));
    assert.notEqual(w.sectionColor(0), w.sectionColor(1));
    assert.match(w.sectionColor(2), new RegExp('^oklch\\(from ' + w.SEC_COLORS[2] + ' l calc\\(c \\* var\\(--color-intensity, 1\\)\\) h\\)$'));
    assert.match(w.sectionColor(2, '0.5'), /calc\(c \* 0\.5\)/);
});

test('getPref / setPref: defaults, stored values and a stored value surviving a re-read', () => {
    w.localStorage.clear();
    assert.equal(w.getPref('view'), 'chips');
    assert.equal(w.getPref('navMode'), 'short');
    w.setPref('view', 'grid');
    assert.equal(w.getPref('view'), 'grid');
    assert.equal(w.localStorage.getItem('a.view'), 'grid');
    w.localStorage.clear();
    assert.equal(w.getPref('view'), 'chips');
});

test('state.js: the shared state objects exist with their initial values', () => {
    assert.deepEqual(plain(w.lock), { sec: null, x: 0, y: 0, kind: '' });
    assert.equal(w.light.mode, 'off');
    assert.equal(typeof w.syncActive, 'function');
    assert.equal(w.jumpTarget, null);
});

const stripData = [{ id: 'one', title: 'Alpha', icon: 'fa-house' }, { id: 'two', title: 'Beta.li', icon: 'fa-star' }, { id: 'three', title: 'Gamma', icon: 'fa-gear' }];

test('stripSlots: the item nearest to f stands in the window, the others sit beside it, a fixed depth under its edge at the step', () => {
    const r = w.stripSlots(2, 6, 100, 40, null, 10);
    assert.equal(r.k, 2);
    assert.equal(r.x[2], 0);
    assert.deepEqual([r.x[3], r.x[1], r.x[4], r.x[0]].map(Math.round), [80, -80, 120, -120]);   // hold 50 + 20 - 10, then one item pitch (40) apart, half a pitch before the step
});

test('stripReach: at rest three items and a quarter beyond the window edge, however wide the strip is (aiming shows all)', () => {
    assert.equal(w.stripReach(70, 38), 35 + 3.25 * 38);
    assert.equal(w.stripReach(0, 40), 3.25 * 40);
    assert.equal(w.stripReach(70, 38, 454), 35 + 3.25 * 38);
});

test('stripSlots: f is clamped to the items; no items gives an empty list', () => {
    assert.equal(w.stripSlots(-3, 6, 100, 40, null, 10).k, 0);
    assert.equal(w.stripSlots(99, 6, 100, 40, null, 10).k, 5);
    assert.deepEqual(plain(w.stripSlots(0, 0, 100, 40, null, 10).x), []);
});

test('stripSlots: at the step the incoming number is the fixed depth under the window edge and turns into the title, the outgoing one appears at the same depth', () => {
    const r = w.stripSlots(2.5, 6, 100, 40, null, 6);   // k becomes 3: item 3 steps into the window, item 2 steps out
    assert.equal(r.k, 3);
    assert.equal(r.x[3], 0);
    assert.equal(r.x[2], -(100 / 2 + 40 / 2 - 6));
    const before = w.stripSlots(2.4999, 6, 100, 40, null, 6);   // just before: item 3 was the number at the right window edge
    assert.ok(Math.abs(before.x[3] - (100 / 2 + 40 / 2 - 6)) < 0.01);
});

test('stripSlots: the depth counts from the visible part of an item (number or icon), not from its box with the invisible padding', () => {
    const vis = [40, 40, 40, 16, 40, 40];   // item 3 shows only 16 px of its 40 px box
    const before = w.stripSlots(2.4999, 6, 100, 40, vis, 6);
    assert.ok(Math.abs(before.x[3] - (100 / 2 + 16 / 2 - 6)) < 0.01);   // its inner edge is 6 px under the window edge
    const outgoing = w.stripSlots(3.5001, 6, 100, 40, vis, 6);   // k is 4 now, item 3 steps out
    assert.ok(Math.abs(outgoing.x[3] - -(100 / 2 + 16 / 2 - 6)) < 0.01);   // the same depth on the other side
});

test('stripSlots: a number reaches at most the fixed depth into the window, for any f and any window width', () => {
    const vis = [40, 14, 26, 14, 40, 26];
    for (const W of [40, 100, 230]) for (let f = 0; f <= 5; f += 0.05) {
        const r = w.stripSlots(f, 6, W, 40, vis, 6);
        r.x.forEach((x, j) => { if (j !== r.k) assert.ok(Math.abs(x) - vis[j] / 2 >= W / 2 - 6 - 1e-9, 'W ' + W + ' f ' + f + ' item ' + j); });
    }
});

test('stripSlots: the numbers follow the finger one to one (a drag of one item pitch moves them by one pitch)', () => {
    const a = w.stripSlots(1.1, 8, 100, 40, null, 6), b = w.stripSlots(2.1, 8, 100, 40, null, 6);
    for (const j of [4, 5, 6]) assert.ok(Math.abs((a.x[j] - b.x[j]) - 40) < 1e-9);
});

test('stripAimF: dragging left moves f forward by the drag in item pitches, clamped to the items', () => {
    assert.equal(w.stripAimF(2, -40, 40, 6), 3);
    assert.equal(w.stripAimF(2, 20, 40, 6), 1.5);
    assert.equal(w.stripAimF(0, 400, 40, 6), 0);
    assert.equal(w.stripAimF(5, -400, 40, 6), 5);
});

test('stripWinAt: the window follows f between the widths of two items and is never narrower than the title it shows', () => {
    const widths = [40, 100, 60];
    assert.equal(w.stripWinAt(0, widths), 40);
    assert.equal(w.stripWinAt(1, widths), 100);
    assert.equal(w.stripWinAt(2, widths), 60);
    assert.equal(w.stripWinAt(0.25, widths), 70);   // on the way to the wider neighbour it grows to the wider of the two at the step
    assert.equal(w.stripWinAt(1.75, widths), 80);   // and shrinks again towards the narrower one after it
    assert.equal(w.stripWinAt(9, widths), 60);
    assert.equal(w.stripWinAt(0, []), 0);
    for (const ws of [[40, 100, 60, 90, 30], [120, 40, 40, 200, 80]]) for (let f = 0; f <= ws.length - 1; f += 0.01) {
        assert.ok(w.stripWinAt(f, ws) >= ws[Math.max(0, Math.min(ws.length - 1, Math.round(f)))] - 1e-9, 'f ' + f);
    }
});

test('stripWinAt: the width is continuous, also at the step between two items', () => {
    const ws = [40, 200, 40, 120];
    let prev = w.stripWinAt(0, ws);
    for (let f = 0.01; f <= 3; f += 0.01) { const now = w.stripWinAt(f, ws); assert.ok(Math.abs(now - prev) <= 160 * 0.02 + 1e-6, 'f ' + f); prev = now; }
});

test('buildStrip: one item per section with number and icon, no "a." item (the home link stays at the left of the bar); the window starts on the first section', () => {
    w.buildStrip(stripData);
    const items = [...w.document.querySelectorAll('#strip .strip-item')];
    assert.deepEqual(items.map(a => a.getAttribute('href')), ['#one', '#two', '#three']);
    assert.deepEqual(items.map(a => a.querySelector('.strip-no').textContent), ['1', '2', '3']);
    assert.ok(items[1].querySelector('i.fa-star'));
    assert.equal(items[2].style.getPropertyValue('--c'), w.sectionColor(2));
    assert.ok(w.document.querySelector('#strip-window .strip-title'));
    assert.ok(w.document.querySelector('#strip-window i.secicon'));
    assert.equal(w.document.querySelector('#strip-window .strip-title').textContent, 'Alpha');
    assert.deepEqual(items.map(a => a.classList.contains('active')), [true, false, false]);
});

test('stripShow: the window shows title (full, with suffix), icon and color of the item; that item is the active one', () => {
    w.buildStrip(stripData);
    w.stripShow(1);
    const win = w.document.getElementById('strip-window');
    assert.equal(win.querySelector('.strip-title').textContent, 'Beta.li');
    assert.ok(win.querySelector('i.fa-star'));
    assert.equal(win.style.getPropertyValue('--c'), w.sectionColor(1));
    const active = [...w.document.querySelectorAll('.strip-item.active')];
    assert.deepEqual(active.map(a => a.getAttribute('href')), ['#two']);
    w.stripShow(2);
    assert.deepEqual([...w.document.querySelectorAll('.strip-item.active')].map(a => a.getAttribute('href')), ['#three']);
});

test('buildStrip: building twice leaves one strip, placed in the bar before the nav row (the gear stays last)', () => {
    w.buildStrip(stripData);
    w.buildStrip(stripData);
    assert.equal(w.document.querySelectorAll('#strip').length, 1);
    assert.equal(w.document.querySelector('#strip').nextElementSibling.id, 'section-nav-list');
});

test('stripSync: the section hash picks the item; an unknown hash or a strip being dragged changes nothing', () => {
    w.buildStrip(stripData);
    w.stripSync('#three');
    assert.equal(w.document.querySelector('#strip-window .strip-title').textContent, 'Gamma');
    w.stripSync('#nowhere');
    assert.equal(w.document.querySelector('#strip-window .strip-title').textContent, 'Gamma');
    w.stripSync('#');
    assert.equal(w.document.querySelector('#strip-window .strip-title').textContent, 'Gamma');
    w.stripDrag.on = true;
    w.stripSync('#one');
    assert.equal(w.document.querySelector('#strip-window .strip-title').textContent, 'Gamma');
    w.stripDrag.on = false;
});

test('stripSuckFrom: the incoming title starts fully outside the window edge it comes from, the outgoing one leaves towards the other', () => {
    assert.equal(w.stripSuckFrom(1, 100, 60), 50 + 30);     // next item: comes from the right
    assert.equal(w.stripSuckFrom(-1, 100, 60), -(50 + 30)); // previous item: comes from the left
    assert.equal(w.stripSuckFrom(1, 40, 14), 20 + 7);
});

test('stripSlots: the depth can be given per item (icon mode: a quarter of the width of each icon)', () => {
    const vis = [40, 40, 40, 20, 24, 40], under = vis.map(v => v / 4);   // icons of different widths
    const incoming = w.stripSlots(2.4999, 6, 100, 40, vis, under);
    assert.ok(Math.abs(incoming.x[3] - (100 / 2 + 20 / 2 - 20 / 4)) < 0.01);   // the 20 px icon is 5 px under the edge
    const outgoing = w.stripSlots(4.5001, 6, 100, 40, vis, under);   // item 4 (24 px) steps out
    assert.ok(Math.abs(outgoing.x[4] - -(100 / 2 + 24 / 2 - 24 / 4)) < 0.01);   // 6 px under, the same depth as on the way in
});

test('stripPushTo: the outgoing title leaves fully outside the window on the side it came from, opposite to the incoming one', () => {
    assert.equal(w.stripPushTo(1, 100, 60), -(50 + 30));    // next item came from the right: the old one leaves to the left
    assert.equal(w.stripPushTo(-1, 100, 60), 50 + 30);
    assert.equal(w.stripPushTo(1, 100, 60), -w.stripSuckFrom(1, 100, 60));   // as far as the incoming one starts away: both travel the same way
});

test('isAppMode: only the query key "app" switches the web app setup on', () => {
    assert.equal(w.isAppMode('?app'), true);
    assert.equal(w.isAppMode('?app=1'), true);
    assert.equal(w.isAppMode('?x=1&app'), true);
    assert.equal(w.isAppMode(''), false);
    assert.equal(w.isAppMode('?application'), false);
    assert.equal(w.isAppMode('?xapp'), false);
    assert.equal(w.isAppMode('#app'), false);
});

test('applyAppMode: in app mode the manifest becomes the standalone one and the iOS web app tags are set; otherwise nothing changes', () => {
    const fresh = () => { const d = w.document.implementation.createHTMLDocument('x'); d.head.innerHTML = '<link rel="manifest" href="./favicon/manifest.json">'; return d; };
    const off = fresh();
    w.applyAppMode(off, false);
    assert.equal(off.querySelector('link[rel="manifest"]').getAttribute('href'), './favicon/manifest.json');
    assert.equal(off.querySelectorAll('meta').length, 0);
    const on = fresh();
    w.applyAppMode(on, true);
    assert.equal(on.querySelector('link[rel="manifest"]').getAttribute('href'), './favicon/manifest-app.json');
    assert.equal(on.querySelector('meta[name="apple-mobile-web-app-capable"]').getAttribute('content'), 'yes');
    assert.equal(on.querySelector('meta[name="apple-mobile-web-app-title"]').getAttribute('content'), 'a.');
    w.applyAppMode(on, true);   // twice: no duplicate tags
    assert.equal(on.querySelectorAll('meta[name="apple-mobile-web-app-capable"]').length, 1);
    assert.equal(on.querySelectorAll('link[rel="manifest"]').length, 1);
});

test('applyAppMode: without a manifest link in the page one is added', () => {
    const d = w.document.implementation.createHTMLDocument('x');
    w.applyAppMode(d, true);
    assert.equal(d.querySelectorAll('link[rel="manifest"]').length, 1);
});

test('navPos: no class without a stored value; setPref sets nav-top / nav-bottom; the value survives a re-read', () => {
    w.localStorage.clear();
    w.applyPrefs();
    assert.equal(w.getPref('navPos'), 'auto');
    assert.equal(w.document.documentElement.classList.contains('nav-top'), false);
    assert.equal(w.document.documentElement.classList.contains('nav-bottom'), false);
    w.setPref('navPos', 'top');
    assert.equal(w.document.documentElement.classList.contains('nav-top'), true);
    assert.equal(w.document.documentElement.classList.contains('nav-bottom'), false);
    w.setPref('navPos', 'bottom');
    assert.equal(w.document.documentElement.classList.contains('nav-top'), false);
    assert.equal(w.document.documentElement.classList.contains('nav-bottom'), true);
    assert.equal(w.localStorage.getItem('a.navPos'), 'bottom');
    w.localStorage.clear();
    w.applyPrefs();
    assert.equal(w.document.documentElement.classList.contains('nav-bottom'), false);
});

test('effectiveNavPos: the stored value, else bottom on the compact bar and top otherwise', () => {
    const real = w.matchMedia;
    const compact = on => { w.matchMedia = q => ({ matches: q === w.COMPACT_QUERY ? on : real(q).matches, addEventListener() { }, addListener() { } }); };
    w.localStorage.clear();
    compact(true);
    assert.equal(w.effectiveNavPos(), 'bottom');
    compact(false);
    assert.equal(w.effectiveNavPos(), 'top');
    w.setPref('navPos', 'bottom');
    assert.equal(w.effectiveNavPos(), 'bottom');
    compact(true);
    w.setPref('navPos', 'top');
    assert.equal(w.effectiveNavPos(), 'top');
    w.matchMedia = real;
    w.localStorage.clear();
    w.applyPrefs();
});

test('keys p and b put the bar at the top and the bottom; not with a modifier and not in a field', () => {
    const key = (k, init = {}, target = w.document.body) => target.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, ...init }));
    const html = w.document.documentElement.classList;
    w.localStorage.clear();
    key('p');
    assert.equal(html.contains('nav-top'), true);
    assert.equal(w.getPref('navPos'), 'top');
    key('b');
    assert.equal(html.contains('nav-bottom'), true);
    assert.equal(w.getPref('navPos'), 'bottom');
    key('P');
    assert.equal(w.getPref('navPos'), 'top');
    key('b', { metaKey: true });
    assert.equal(w.getPref('navPos'), 'top');
    const field = w.document.createElement('input');
    w.document.body.appendChild(field);
    key('b', {}, field);
    assert.equal(w.getPref('navPos'), 'top');
    field.remove();
    w.localStorage.clear();
    w.applyPrefs();
});

const barIndex = () => w.SETTINGS.findIndex(e => e.label === 'Bar');
const barButton = () => w.document.querySelectorAll('#settings-pop .set-btn')[barIndex()];

test('hintHtml: all values in their original order, the active one marked, the key letters underlined', () => {
    const bar = w.SETTINGS[barIndex()];
    assert.equal(w.hintHtml(bar, 'bottom'), '<span>to<u>p</u></span><span class="on"><u>b</u>ottom</span>');
    assert.equal(w.hintHtml(bar, 'top'), '<span class="on">to<u>p</u></span><span><u>b</u>ottom</span>');
});

const rect = (left, top, width, height) => ({ left, top, right: left + width, bottom: top + height });

test('hintPos beside: right of the element when it fits in the window, otherwise left of it; centered vertically', () => {
    const size = { w: 80, h: 20 }, view = { w: 1000, h: 800 };
    assert.deepEqual(plain(w.hintPos(rect(100, 100, 100, 40), size, view, true)), { left: 206, top: 110, edge: 'side' });
    assert.deepEqual(plain(w.hintPos(rect(900, 100, 100, 40), size, view, true)), { left: 814, top: 110, edge: 'side' });
});

test('hintPos below: flush under the element at its left edge, above it when there is no room, kept inside the window', () => {
    const size = { w: 80, h: 20 }, view = { w: 1000, h: 800 };
    assert.deepEqual(plain(w.hintPos(rect(100, 100, 50, 40), size, view, false)), { left: 100, top: 140, edge: 'below' });
    assert.deepEqual(plain(w.hintPos(rect(100, 760, 50, 40), size, view, false)), { left: 100, top: 740, edge: 'above' });
    assert.deepEqual(plain(w.hintPos(rect(960, 100, 40, 40), size, view, false)), { left: 916, top: 140, edge: 'below' });
});

test('setHint: data-hint and aria-label, never a native title', () => {
    const el = w.document.createElement('span');
    el.title = 'old';
    w.setHint(el, 'Delete');
    assert.equal(el.dataset.hint, 'Delete');
    assert.equal(el.getAttribute('aria-label'), 'Delete');
    assert.equal(el.hasAttribute('title'), false);
});

test('hover on an element with data-hint shows its text (escaped) in the hint element; leaving hides it', () => {
    const el = w.document.createElement('span');
    el.innerHTML = '<i>x</i>';
    w.document.body.appendChild(el);
    w.setHint(el, 'a <b> & c');
    el.firstChild.dispatchEvent(new w.MouseEvent('mouseover', { bubbles: true }));
    assert.equal(w.document.getElementById('hint').innerHTML, 'a &lt;b&gt; &amp; c');
    el.firstChild.dispatchEvent(new w.MouseEvent('mouseout', { bubbles: true, relatedTarget: w.document.body }));
    assert.equal(w.document.getElementById('hint').innerHTML, '');
    el.remove();
});

test('a hint below an element is at least as wide as the element; beside it has no minimum; entries of the sections list get it beside', () => {
    const hint = w.document.getElementById('hint');
    Object.defineProperty(w.document.documentElement, 'clientHeight', { value: 800, configurable: true });   // jsdom has no layout
    const chip = w.document.createElement('span');
    w.document.body.appendChild(chip);
    w.setHint(chip, 'srv');
    chip.getBoundingClientRect = () => ({ ...rect(10, 10, 80, 30), width: 80 });
    chip.dispatchEvent(new w.MouseEvent('mouseover', { bubbles: true }));
    assert.equal(hint.style.minWidth, '80px');
    assert.equal(hint.dataset.edge, 'below');
    chip.dispatchEvent(new w.MouseEvent('mouseout', { bubbles: true, relatedTarget: w.document.body }));
    chip.remove();
    const entry = w.document.createElement('a');
    w.document.getElementById('jumper-pop').appendChild(entry);
    w.setHint(entry, 'srv.li');
    entry.getBoundingClientRect = () => ({ ...rect(10, 10, 80, 30), width: 80 });
    w.document.body.classList.add('nav-icons');   // in text mode the entries show no hint (next test)
    entry.dispatchEvent(new w.MouseEvent('mouseover', { bubbles: true }));
    assert.equal(hint.style.minWidth, '');
    assert.equal(hint.dataset.edge, 'side');
    entry.dispatchEvent(new w.MouseEvent('mouseout', { bubbles: true, relatedTarget: w.document.body }));
    entry.remove();
    w.document.body.classList.remove('nav-icons');
    delete w.document.documentElement.clientHeight;
});

test('chips of the bar show no hint in text mode (it would repeat their label), but in icon mode; the gear and the dropdown always do', () => {
    const hint = w.document.getElementById('hint');
    const chip = w.document.createElement('span');
    w.document.querySelector('.title').appendChild(chip);
    w.setHint(chip, 'srv');
    const over = () => chip.dispatchEvent(new w.MouseEvent('mouseover', { bubbles: true }));
    const out = () => chip.dispatchEvent(new w.MouseEvent('mouseout', { bubbles: true, relatedTarget: w.document.body }));
    w.document.body.classList.remove('nav-icons');
    over();
    assert.equal(hint.innerHTML, '');
    out();
    w.document.body.classList.add('nav-icons');
    over();
    assert.equal(hint.innerHTML, 'srv');
    out();
    w.document.body.classList.remove('nav-icons');
    chip.remove();
    for (const [id, text] of [['settings-btn', 'Settings'], ['section-jumper', 'Sections']]) {   // "set" and "sec" are abbreviations: they keep the hint
        const el = w.document.getElementById(id);
        el.dispatchEvent(new w.MouseEvent('mouseover', { bubbles: true }));
        assert.equal(hint.innerHTML, text);
        el.dispatchEvent(new w.MouseEvent('mouseout', { bubbles: true, relatedTarget: w.document.body }));
    }
});

test('entries of the sections list show no hint in text mode, but in icon mode', () => {
    const hint = w.document.getElementById('hint');
    const entry = w.document.createElement('a');
    w.document.getElementById('jumper-pop').appendChild(entry);
    w.setHint(entry, 'srv.li');
    const over = () => entry.dispatchEvent(new w.MouseEvent('mouseover', { bubbles: true }));
    const out = () => entry.dispatchEvent(new w.MouseEvent('mouseout', { bubbles: true, relatedTarget: w.document.body }));
    over();
    assert.equal(hint.innerHTML, '');
    out();
    w.document.body.classList.add('nav-icons');
    over();
    assert.equal(hint.innerHTML, 'srv.li');
    out();
    w.document.body.classList.remove('nav-icons');
    entry.remove();
});

test('no element of the page has a native title attribute; the gear and the dropdown have a hint', () => {
    assert.equal(w.document.querySelectorAll('[title]').length, 0);
    assert.equal(w.document.getElementById('settings-btn').dataset.hint, 'Settings');
    assert.equal(w.document.getElementById('section-jumper').dataset.hint, 'Sections');
});

test('no settings button has a native title; the hint element replaces them', () => {
    w.document.querySelectorAll('#settings-pop .set-btn').forEach(b => assert.equal(b.hasAttribute('title'), false));
});

test('hover on the Zoom button shows S/M with the active one marked, in that order whichever is active', () => {
    w.msmrZoom.set('s');
    const hint = w.document.getElementById('hint');
    w.document.querySelectorAll('#settings-pop .set-btn')[0].dispatchEvent(new w.MouseEvent('mouseenter'));
    assert.equal(hint.innerHTML, '<span class="on">S</span><span>M</span>');
    w.document.querySelectorAll('#settings-pop .set-btn')[0].dispatchEvent(new w.MouseEvent('mouseleave'));
    w.msmrZoom.set('m');
    w.document.querySelectorAll('#settings-pop .set-btn')[0].dispatchEvent(new w.MouseEvent('mouseenter'));
    assert.equal(hint.innerHTML, '<span>S</span><span class="on">M</span>');
    w.msmrZoom.set('s');
    w.document.querySelectorAll('#settings-pop .set-btn')[0].dispatchEvent(new w.MouseEvent('mouseleave'));
    assert.equal(hint.innerHTML, '');
});

test('Bar button: no native title (the hint element replaces it); the aria-label names the keys in the order now/next', () => {
    w.localStorage.clear();
    w.setPref('navPos', 'bottom');
    assert.equal(barButton().hasAttribute('title'), false);
    assert.equal(barButton().getAttribute('aria-label'), 'Bar: bottom/top (b / p)');
    w.setPref('navPos', 'top');
    assert.equal(barButton().getAttribute('aria-label'), 'Bar: top/bottom (p / b)');
    w.localStorage.clear();
    w.applyPrefs();
});

test('hover on the Bar button fills the hint element; leaving empties it; a click shows the new value', () => {
    w.localStorage.clear();
    w.setPref('navPos', 'bottom');
    const hint = w.document.getElementById('hint');
    barButton().dispatchEvent(new w.MouseEvent('mouseenter'));
    assert.equal(hint.innerHTML, '<span>to<u>p</u></span><span class="on"><u>b</u>ottom</span>');
    barButton().dispatchEvent(new w.MouseEvent('mouseleave'));
    assert.equal(hint.innerHTML, '');
    barButton().dispatchEvent(new w.MouseEvent('mouseenter'));
    barButton().dispatchEvent(new w.MouseEvent('click'));
    assert.equal(hint.innerHTML, '<span class="on">to<u>p</u></span><span><u>b</u>ottom</span>');   // after a click it shows the new value
    w.localStorage.clear();
    w.applyPrefs();
});
