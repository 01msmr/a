// Owns: view preferences (getPref, setPref, applyPrefs)
// Defines globals: PREF_DEFAULTS, getPref, setPref, applyPrefs, effectiveNavPos
// Uses: settings, touch
// ── View settings ─────────────────────────────────────────────────
var PREF_DEFAULTS = { navMode: 'short', align: 'left', view: 'chips', colorMode: 'vivid', navPos: 'auto' };

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
    // only a stored value sets a class (on <html>, so the head script can set it before paint); the default per layout is CSS
    document.documentElement.classList.toggle('nav-top', getPref('navPos') === 'top');
    document.documentElement.classList.toggle('nav-bottom', getPref('navPos') === 'bottom');
    document.documentElement.dataset.colorMode = getPref('colorMode');
    if (typeof settingsDisplay === 'function') settingsDisplay();
}

// Where the bar sits now: the stored value, else bottom on the compact bar and top otherwise
function effectiveNavPos() {
    var v = getPref('navPos');
    if (v === 'top' || v === 'bottom') return v;
    return matchMedia(COMPACT_QUERY).matches ? 'bottom' : 'top';
}

applyPrefs();

// ── Render ────────────────────────────────────────────────────────

