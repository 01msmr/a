// The cache version in index.html (?v=2026-10-21l): one value for every file, raised once per session; see tools/bump-version.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { nextVersion, bump } = require('./bump-version.js');

test('nextVersion: the same day gets the next letter, a new day starts without a letter', () => {
    assert.equal(nextVersion('2026-10-21', '2026-10-21'), '2026-10-21b');
    assert.equal(nextVersion('2026-10-21b', '2026-10-21'), '2026-10-21c');
    assert.equal(nextVersion('2026-10-21l', '2026-10-21'), '2026-10-21m');
    assert.equal(nextVersion('2026-10-21l', '2026-10-22'), '2026-10-22');
});

test('nextVersion: after z it continues with aa, ab, ...', () => {
    assert.equal(nextVersion('2026-10-21z', '2026-10-21'), '2026-10-21aa');
    assert.equal(nextVersion('2026-10-21aa', '2026-10-21'), '2026-10-21ab');
});

test('nextVersion: a version in the future (a clock that went back) is not lowered', () => {
    assert.equal(nextVersion('2026-10-23', '2026-10-21'), '2026-10-23b');
});

test('bump: every ?v= value of the page changes to the same new one; other text stays', () => {
    const html = '<link href="a.css?v=2026-10-21l"><script src="js/x.js?v=2026-10-21l"></script><a href="?v=other">x</a>';
    const r = bump(html, '2026-10-22');
    assert.equal(r.from, '2026-10-21l');
    assert.equal(r.to, '2026-10-22');
    assert.equal(r.html, '<link href="a.css?v=2026-10-22"><script src="js/x.js?v=2026-10-22"></script><a href="?v=other">x</a>');
    assert.equal(r.count, 2);
});

test('bump: mixed versions in the page are refused (they must not mix)', () => {
    assert.throws(() => bump('<a href="a.js?v=2026-10-21l"><a href="b.js?v=2026-10-21k">', '2026-10-22'), /more than one/);
    assert.throws(() => bump('<p>no version</p>', '2026-10-22'), /no \?v=/);
});
