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

test('buildStrip: one item per section with number and icon, the window with title and icon, both in the section color', () => {
    w.buildStrip(stripData);
    const items = [...w.document.querySelectorAll('#strip .strip-item')];
    assert.deepEqual(items.map(a => a.getAttribute('href')), ['#one', '#two', '#three']);
    assert.deepEqual(items.map(a => a.querySelector('.strip-no').textContent), ['1', '2', '3']);
    assert.ok(items[1].querySelector('i.fa-star'));
    assert.equal(items[2].style.getPropertyValue('--c'), w.sectionColor(2));
    assert.ok(w.document.querySelector('#strip-window .strip-title'));
    assert.ok(w.document.querySelector('#strip-window i.secicon'));
});

test('buildStrip: building twice leaves one strip, placed in the bar before the nav row (the gear stays last)', () => {
    w.buildStrip(stripData);
    w.buildStrip(stripData);
    assert.equal(w.document.querySelectorAll('#strip').length, 1);
    assert.equal(w.document.querySelector('#strip').nextElementSibling.id, 'section-nav-list');
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

test('stripSync: the section hash picks the item; an unknown hash or a strip being dragged changes nothing', () => {
    w.buildStrip(stripData);
    w.stripSync('#three');
    assert.equal(w.document.querySelector('#strip-window .strip-title').textContent, 'Gamma');
    w.stripSync('#nowhere');
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
