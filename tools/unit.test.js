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

test('stripSlots: the item nearest to f stands in the window, the others sit beside it, a quarter item away from its edge', () => {
    const r = w.stripSlots(2, 6, 100, 40);
    assert.equal(r.k, 2);
    assert.equal(r.x[2], 0);
    assert.deepEqual([r.x[3], r.x[1], r.x[4], r.x[0]].map(Math.round), [80, -80, 120, -120]);
    assert.equal(w.stripSlots(0, 3, 100, 40).x[0], 0);
});

test('stripSlots: f is clamped to the items; no items gives an empty list', () => {
    assert.equal(w.stripSlots(-3, 6, 100, 40).k, 0);
    assert.equal(w.stripSlots(99, 6, 100, 40).k, 5);
    assert.deepEqual(plain(w.stripSlots(0, 0, 100, 40).x), []);
});

test('stripSlots: at the switch the incoming number holds at the window edge and the outgoing one appears at the opposite edge', () => {
    const r = w.stripSlots(2.5, 6, 100, 40);   // k becomes 3: item 3 steps into the window, item 2 steps out
    assert.equal(r.k, 3);
    assert.equal(r.x[3], 100 / 2 + 40 / 4);   // the incoming item has just reached the window's edge, a quarter under it
    assert.equal(r.x[2], -(100 / 2 + 40 / 4));   // the outgoing item: a quarter of it is under the left window edge, the same as the incoming one at the switch
    const before = w.stripSlots(2.4999, 6, 100, 40);   // just before: item 3 was the number at the right window edge
    assert.ok(Math.abs(before.x[3] - (100 / 2 + 40 / 4)) < 0.01);
});

test('stripSlots: a number reaches at most a quarter of its width into the window, for any f and any window width', () => {
    for (const W of [40, 100, 230]) for (let f = 0; f <= 5; f += 0.05) {
        const r = w.stripSlots(f, 6, W, 40);
        r.x.forEach((x, j) => { if (j !== r.k) assert.ok(Math.abs(x) >= W / 2 + 10 - 1e-9, 'W ' + W + ' f ' + f + ' item ' + j); });
    }
});

test('stripSlots: the numbers follow the finger one to one (a drag of one item pitch moves them by one pitch)', () => {
    const a = w.stripSlots(1.1, 8, 100, 40), b = w.stripSlots(2.1, 8, 100, 40);
    for (const j of [4, 5, 6]) assert.ok(Math.abs((a.x[j] - b.x[j]) - 40) < 1e-9);
});

test('stripSlots: the item in the window crosses it faster than the finger moves (the window width plus its gap per item pitch)', () => {
    const a = w.stripSlots(2.1, 6, 100, 40), b = w.stripSlots(1.9, 6, 100, 40);
    assert.ok(Math.abs(a.x[2] - -12) < 1e-9 && Math.abs(b.x[2] - 12) < 1e-9);   // 2 * 60 * 0.1
    const speed = (w.stripSlots(2.01, 6, 100, 40).x[2] - w.stripSlots(1.99, 6, 100, 40).x[2]) / 0.02;
    assert.ok(Math.abs(speed - -120) < 1e-6);   // 120 px per item pitch inside the window, 40 outside
    const out = (w.stripSlots(0.51 + 2, 6, 100, 40).x[4] - w.stripSlots(0.49 + 2, 6, 100, 40).x[4]) / 0.02;
    assert.ok(Math.abs(out - -40) < 1e-6);
});

test('stripSlots: the path is continuous, no item jumps while f changes', () => {
    for (const W of [40, 100, 230]) {
        let prev = w.stripSlots(0, 8, W, 40).x;
        for (let f = 0.01; f <= 7; f += 0.01) {
            const now = w.stripSlots(f, 8, W, 40).x;
            now.forEach((x, j) => assert.ok(Math.abs(x - prev[j]) <= 2 * (W / 2 + 10) * 0.01 + 1e-6, 'W ' + W + ' f ' + f + ' item ' + j));
            prev = now;
        }
    }
});

test('stripTitleX: the title of the item in the window slides across it, entering and leaving at the borders', () => {
    // window 100, gap 40, title 60 wide: it enters with its inner edge a quarter item (10) outside the window edge
    assert.equal(w.stripTitleX(2, 2, 100, 40, 60), 0);
    assert.equal(w.stripTitleX(1.5, 2, 100, 40, 60), 50 + 10 + 30);
    assert.equal(w.stripTitleX(2.5, 2, 100, 40, 60), -(50 + 10 + 30));
    assert.ok(w.stripTitleX(1.9, 2, 100, 40, 60) > 0 && w.stripTitleX(2.1, 2, 100, 40, 60) < 0);
});

test('stripAimF: dragging left moves f forward by the drag in item pitches, clamped to the items', () => {
    assert.equal(w.stripAimF(2, -40, 40, 6), 3);
    assert.equal(w.stripAimF(2, 20, 40, 6), 1.5);
    assert.equal(w.stripAimF(0, 400, 40, 6), 0);
    assert.equal(w.stripAimF(5, -400, 40, 6), 5);
});

test('stripShownAtRest: up to two numbers each side of the active item, the others stay invisible', () => {
    assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(j => w.stripShownAtRest(j, 3)), [false, true, true, true, true, true, false]);
});

test('stripWinAt: the window width follows f between the widths of the two items it is between', () => {
    const widths = [40, 100, 60];
    assert.equal(w.stripWinAt(0, widths), 40);
    assert.equal(w.stripWinAt(0.5, widths), 70);
    assert.equal(w.stripWinAt(1, widths), 100);
    assert.equal(w.stripWinAt(1.5, widths), 80);
    assert.equal(w.stripWinAt(9, widths), 60);
    assert.equal(w.stripWinAt(0, []), 0);
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

