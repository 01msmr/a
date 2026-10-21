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

test('stripIndexAt: the item nearest to the window, clamped to the first and last item', () => {
    assert.equal(w.stripIndexAt(0, 40, 5), 0);
    assert.equal(w.stripIndexAt(59, 40, 5), 1);
    assert.equal(w.stripIndexAt(61, 40, 5), 2);
    assert.equal(w.stripIndexAt(-30, 40, 5), 0);
    assert.equal(w.stripIndexAt(9999, 40, 5), 4);
});

test('stripIndexAt: no items or no measured width give 0', () => {
    assert.equal(w.stripIndexAt(80, 40, 0), 0);
    assert.equal(w.stripIndexAt(80, 0, 5), 0);
    assert.equal(w.stripIndexAt(80, NaN, 5), 0);
});

test('stripLeftFor: scroll position that puts an item into the window, the inverse of stripIndexAt', () => {
    assert.equal(w.stripLeftFor(0, 40), 0);
    assert.equal(w.stripLeftFor(3, 40), 120);
    for (let i = 0; i < 5; i++) assert.equal(w.stripIndexAt(w.stripLeftFor(i, 38.5), 38.5, 5), i);
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

test('stripLens: no speed or an item exactly in the window gives no shift', () => {
    assert.ok(Math.abs(w.stripLens(60, 0, 40)) < 1e-9);
    assert.ok(Math.abs(w.stripLens(0, 30, 40)) < 1e-9);
    assert.ok(Math.abs(w.stripLens(60, 30, 0)) < 1e-9);
});

test('stripLens: items are pushed away from the window, symmetrically, in either scroll direction', () => {
    assert.ok(w.stripLens(60, 10, 40) > 0);
    assert.ok(w.stripLens(-60, 10, 40) < 0);
    assert.ok(Math.abs(w.stripLens(60, 10, 40) + w.stripLens(-60, 10, 40)) < 1e-9);
    assert.ok(Math.abs(w.stripLens(60, 10, 40) - w.stripLens(60, -10, 40)) < 1e-9);
});

test('stripLens: faster means a stronger shift up to a cap; far items hardly move', () => {
    assert.ok(w.stripLens(60, 20, 40) > w.stripLens(60, 5, 40));
    assert.ok(Math.abs(w.stripLens(60, 500, 40) - w.stripLens(60, 5000, 40)) < 1e-9);
    assert.ok(Math.abs(w.stripLens(60, 5000, 40)) < 40);
    assert.ok(Math.abs(w.stripLens(400, 5000, 40)) < 0.02 * 40);
});
