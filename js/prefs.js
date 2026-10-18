// Owns: view preferences (applyPrefs) and the shared state used across files (lock, jumperValue, selJump, syncActive)
// Defines globals: PREF_DEFAULTS, getPref, setPref, applyPrefs, syncActive, lock, jumperValue, selJump
// Uses: glow, settings
// ── View settings ─────────────────────────────────────────────────
var PREF_DEFAULTS = { navMode: 'short', align: 'left', view: 'chips', colorMode: 'vivid' };

function getPref(name) {
    try { return localStorage.getItem('a.' + name) || PREF_DEFAULTS[name]; }
    catch (e) { return PREF_DEFAULTS[name]; }
}

function setPref(name, value) {
    try { localStorage.setItem('a.' + name, value); } catch (e) { }
    applyPrefs();
}

function applyPrefs() {
    document.body.classList.toggle('nav-icons', getPref('navMode') === 'icons');
    document.body.classList.toggle('align-center', getPref('align') === 'center');
    document.body.classList.toggle('view-grid', getPref('view') === 'grid');
    document.documentElement.dataset.colorMode = getPref('colorMode');
    if (typeof settingsDisplay === 'function') settingsDisplay();
}


applyPrefs();

// ── Render ────────────────────────────────────────────────────────
var syncActive = function () { };
var lock = { sec: null, x: 0, y: 0, kind: '' };   // section locked after a click on heading, chip or list entry (see glowTarget); kind: 'title' or 'nav'
var jumperValue = '';   // hash of the active section (or of the jump target); the list marks it
var selJump = null;   // target of a jump via the dropdown: until arrival it shows this section

