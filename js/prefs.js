// Owns: view preferences (getPref, setPref, applyPrefs)
// Defines globals: PREF_DEFAULTS, getPref, setPref, applyPrefs
// Uses: settings
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

