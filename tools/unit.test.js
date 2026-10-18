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
