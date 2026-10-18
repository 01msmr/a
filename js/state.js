// Owns: the mutable state that several files share (each variable has one owner file for writing, the others read it)
// Defines globals: syncActive, lock, jumperValue, selJump, measures, glow, swiping, light, lightMouse, cursor, jumpTarget, mouseTile, mouseMoved, mousePoint, neverDead, dragged
// Uses: none
// Loaded first: every initial value is a plain literal, so nothing here depends on another file.

// from prefs.js
var syncActive = function () { };

// from prefs.js
var lock = { sec: null, x: 0, y: 0, kind: '' };   // section locked after a click on heading, chip or list entry (see glowTarget); kind: 'title' or 'nav'

// from prefs.js
var jumperValue = '';   // hash of the active section (or of the jump target); the list marks it

// from prefs.js
var selJump = null;   // target of a jump via the dropdown: until arrival it shows this section

// from touch.js
var measures = {};

// from touch.js
var glow = {
    container: null, secs: [], rows: [], sig: '', top: 0, bot: 0, dest: null, instant: true,
    from: null, to: null, t0: 0, duration: 0, raf: 0, obs: []
};

// from touch.js
var swiping = false;

// from light.js
var light = { el: null, mode: 'off', tile: null, old: null, inverted: new Set(), cur: null, from: null, to: null,
    clip: null, radius: 0, t0: 0, duration: 0, linear: false, raf: 0, end: null, cursor: null };

// from light.js
var lightMouse = null;

// from cursor.js
var cursor = { el: null, secEl: null, x: 0, y: 0, dest: null, raf: 0, on: false };

// from navigation.js
var jumpTarget = null;

// from navigation.js
var mouseTile = null;

// from navigation.js
var mouseMoved = false;

// from navigation.js
var mousePoint = null;   // last mouse position in the window

// from links.js
var neverDead = { allIpAddresses: true, hosts: [] };

// from edit.js
var dragged = null;      // tile that is being dragged
