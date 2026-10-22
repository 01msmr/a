// Owns: settings overlay and its icons
// Defines globals: SETTINGS, valueName, valueTo, drawScheme, drawIcon, settingsDisplay, navButtonHeight, settingsPlace
// Uses: state, prefs, render, touch, cursor, edit, grid
// ── Settings: gear in the bar, overlay with one button per setting ──
// One icon per setting shows the current value; each click switches to the other of two values. The API for zoom/color scheme is in the <head>.
// icon: Font Awesome class or letter (zoom); shows the current value
var SETTINGS = [
    {
        label: 'Zoom',
        values: [['s', 'S'], ['m', 'M']],
        get: function () { return window.msmrZoom.get(); },
        icon: function (w) { return { text: w.toUpperCase() }; },
        set: function (w) { window.msmrZoom.set(w); }
    },
    {
        label: 'Theme',
        values: [['auto', 'auto'], ['light', 'light'], ['dark', 'dark']],
        schema: true,
        all: true,   // the hint names all values, the current one in brackets
        get: function () { return window.msmrTheme.auto() ? 'auto' : window.msmrTheme.get(); },
        set: function (w) { if (w === 'auto') window.msmrTheme.setAuto(); else window.msmrTheme.set(w); }
    },
    {
        label: 'Color',
        values: [['vivid', 'color'], ['pale', 'pale']],
        text: { vivid: 'col', pale: 'pale' },
        // Circle in a section color: strong = vivid, almost colorless (same lightness) = pale
        circle: { vivid: '1', pale: 'var(--color-pale)' },
        get: function () { return getPref('colorMode'); },
        set: function (w) { setPref('colorMode', w); }
    },
    {
        label: 'Navigation',
        values: [['short', 'text'], ['icons', 'icons']],
        // Text mode: the word "text"; icon mode: fa-square like APP
        icons: { short: 'fa-square', icons: 'fa-square' },
        get: function () { return getPref('navMode'); },
        set: function (w) { setPref('navMode', w); }
    },
    {
        label: 'Bar',
        values: [['bottom', 'bottom'], ['top', 'top']],
        text: { bottom: 'bot', top: 'top' },
        line: { bottom: 'under', top: 'over' },   // text mode: the word is underlined or overlined
        lined: { bottom: ['fa-arrow-up', 'over'], top: ['fa-arrow-down', 'under'] },   // icon mode: an arrow with a line beside it that does not count into its size
        order: function (w) { return w === 'bottom' ? -1 : 1; },   // first in the overlay while the bar is at the bottom, last while it is at the top
        get: function () { return effectiveNavPos(); },
        set: function (w) { setPref('navPos', w); gridInit(); }   // the grid reserves room beside the bar
    },
    {
        label: 'View',
        values: [['chips', 'chips'], ['grid', 'grid']],
        text: { chips: 'chip', grid: 'grid' },
        // four tiles: rounded and separate = chips; square and joined = grid
        tiles: { chips: false, grid: true },
        get: function () { return getPref('view'); },
        set: function (w) { setPref('view', w); }
    },
    {
        label: 'Align',
        // in the grid "left" means full width
        descr: function (w) { return w === 'left' && getPref('view') === 'grid' ? 'full' : null; },
        values: [['left', 'left'], ['center', 'center']],
        text: { left: 'left', center: 'cen' },
        icons: { left: 'fa-align-left', center: 'fa-align-center' },
        get: function () { return getPref('align'); },
        set: function (w) { setPref('align', w); }
    },
    {
        label: 'Edit',
        values: [['off', 'edit'], ['on', 'done']],
        text: { off: 'edit', on: 'save' },
        // two chevrons on top of each other = off; floppy disk = being edited, a click ends it and asks about saving
        icons: { off: ['fa-chevron-up', 'fa-chevron-down'], on: 'fa-floppy-disk' },
        get: function () { return document.body.classList.contains('edit-mode') ? 'on' : 'off'; },
        set: function (w) { if (w === 'on') enterEditMode(); else finishEditing(); },
        closes: true
    }
];

function valueName(e, w) {
    return (e.descr && e.descr(w)) ||
        e.values.filter(function (p) { return p[0] === w; })[0][1];
}

function valueTo(e, w) {
    var i = 0;
    e.values.forEach(function (p, k) { if (p[0] === w) i = k; });
    return e.values[(i + 1) % e.values.length][0];
}

// Color scheme: manual shows large light/dark; auto shows a large "auto" and a small icon of the system value.
// Text mode: words; icon mode: sun/moon, "auto" as a filled circle
function drawScheme(ic, w) {
    var icons = document.body.classList.contains('nav-icons');
    var sym = { light: 'fa-sun', dark: 'fa-moon' }, word = { auto: 'aut', light: 'light', dark: 'dark' };
    function glyph(cssClass, extra) {
        var g = document.createElement('i');
        g.className = cssClass + (extra ? ' ' + extra : '');
        return g;
    }
    function text(t, cssClass) {
        var s = document.createElement('span');
        s.className = cssClass;
        s.textContent = t;
        return s;
    }
    ic.className = 'set-icon set-scheme';
    ic.textContent = '';
    if (w === 'auto') {
        ic.appendChild(icons ? glyph('fa-solid fa-circle') : text(word.auto, 'set-letter set-text'));
        ic.appendChild(glyph('fa-solid ' + sym[window.msmrTheme.get()], 'set-corner'));
    } else {
        ic.appendChild(icons ? glyph('fa-solid ' + sym[w]) : text(word[w], 'set-letter set-text'));
    }
}

// draws the icon for the value w
function drawIcon(ic, e, w) {
    if (e.icon) {
        var d = e.icon(w);
        ic.className = 'set-icon set-letter';
        ic.textContent = d.text;
    } else if (e.schema) {
        drawScheme(ic, w);
    } else if (!document.body.classList.contains('nav-icons')) {
        ic.className = 'set-icon set-letter set-text' + (e.line ? ' set-' + e.line[w] : '');
        ic.textContent = (e.descr && e.descr(w)) || (e.text && e.text[w]) || valueName(e, w);
    } else if (e.circle) {
        ic.className = 'set-icon set-circle';
        ic.textContent = '';
        ic.style.setProperty('--k', sectionColor(6, e.circle[w]));
    } else if (e.tiles) {
        ic.className = 'set-icon set-tiles' + (e.tiles[w] ? ' square' : '');
        ic.textContent = '';
        for (var k = 0; k < 4; k++) ic.appendChild(document.createElement('i'));
    } else if (e.lined) {
        ic.className = 'set-icon fa-solid ' + e.lined[w][0] + ' set-lined set-' + e.lined[w][1];
        ic.textContent = '';
    } else if (Array.isArray(e.icons[w])) {
        // several symbols as one icon, stacked vertically
        ic.className = 'set-icon set-stack';
        ic.textContent = '';
        e.icons[w].forEach(function (k) {
            var g = document.createElement('i');
            g.className = 'fa-solid ' + k;
            ic.appendChild(g);
        });
    } else {
        ic.className = 'set-icon fa-solid ' + e.icons[w];
        ic.textContent = '';
    }
}

function settingsDisplay() {
    document.querySelectorAll('#settings-pop .set-btn').forEach(function (b, i) {
        var e = SETTINGS[i], w = e.get();
        drawIcon(b.querySelector('.set-icon'), e, w);
        if (e.order) b.style.order = e.order(w);
        b.title = e.all
            ? e.values.map(function (p) { return p[0] === w ? '[' + p[1] + ']' : p[1]; }).join(' / ')
            : valueName(e, w) + '/' + valueName(e, valueTo(e, w));   // now/next value
        b.setAttribute('aria-label', e.label + ': ' + b.title);
    });
}

// Button height of the overlays (settings and sections list) = width of the gear in the chips view.
// In the full-width grid the gear stretches: measure it briefly with the bar width of the chips
function navButtonHeight() {
    var gearEl = document.getElementById('settings-btn'), bar = document.querySelector('.title');
    var widthPx = gearEl.getBoundingClientRect().width;
    if (document.body.classList.contains('view-grid') && !document.body.classList.contains('align-center') && bar) {
        bar.style.maxWidth = 'calc(var(--column) + 0.12em)';
        widthPx = gearEl.getBoundingClientRect().width;
        bar.style.maxWidth = '';
    }
    return widthPx;
}

// flush below the gear, same width; in the bottom bar (smartphone/small view) flush above it
function settingsPlace() {
    var pop = document.getElementById('settings-pop');
    var gearEl = document.getElementById('settings-btn');
    var r = gearEl.getBoundingClientRect();
    var upper = r.top > window.innerHeight / 2;
    // In the grid the bar runs across the whole width and the gear stretches: the width stays that of the gear,
    // the button height (and with it the overlay height) the same as for chips; measure it briefly with the bar width of the chips
    pop.style.width = r.width + 'px';   // flush with the gear, even if it stretches in the grid
    pop.style.setProperty('--set-height', navButtonHeight() + 'px');   // button height as for chips
    var label = gearEl.querySelector('.secshort');
    pop.style.setProperty('--set-font', getComputedStyle(label).fontSize);   // the entries' words as large as the word on the gear
    pop.style.left = r.left + 'px';
    pop.style.right = 'auto';
    pop.style.top = upper ? 'auto' : r.bottom + 'px';
    pop.style.bottom = upper ? (window.innerHeight - r.top) + 'px' : 'auto';
    pop.classList.toggle('upward', upper);
}

(function () {
    var pop = document.getElementById('settings-pop');
    SETTINGS.forEach(function (e) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'set-btn';
        b.innerHTML = '<span class="set-icon" aria-hidden="true"></span>';
        b.addEventListener('click', function () {
            e.set(valueTo(e, e.get()));
            settingsDisplay();
            if (e.closes) { pop.hidePopover(); return; }
            settingsPlace();   // zoom moves the gear
        });
        pop.appendChild(b);
    });
    // Gear: a click toggles the overlay; with the mouse you can also press, drag onto a button
    // and release — that only advances this button and closes the overlay (like a menu)
    var gearZone = document.getElementById('settings-btn');
    var mouse = false, wasOpen = false;
    function isOpen() { return pop.matches(':popover-open'); }
    function buttonAt(ev) {
        var el = document.elementFromPoint(ev.clientX, ev.clientY);
        return el && el.closest ? el.closest('#settings-pop .set-btn') : null;
    }
    gearZone.addEventListener('pointerdown', function (ev) {
        if (ev.pointerType !== 'mouse' || ev.button !== 0) return;
        mouse = true;
        wasOpen = isOpen();
        if (!wasOpen) pop.showPopover();
    });
    document.addEventListener('pointerup', function (ev) {
        if (!mouse) return;
        var button = buttonAt(ev);
        var onGear = ev.target.closest && ev.target.closest('#settings-btn');
        if (button) { button.click(); if (isOpen()) pop.hidePopover(); }   // dragged and released: switch, close
        else if (onGear) { if (wasOpen) pop.hidePopover(); }   // simple click: toggle
        else pop.hidePopover();   // released elsewhere
        mouse = !!onGear;   // after releasing on the gear the click still follows, which the handler below skips
    });
    // Keyboard and touch: normal click; a mouse click was already handled above
    gearZone.addEventListener('click', function () {
        if (mouse) { mouse = false; return; }
        if (isOpen()) pop.hidePopover(); else pop.showPopover();
    });
    // A click outside and Esc close (a manual popover knows neither)
    document.addEventListener('pointerdown', function (ev) {
        if (isOpen() && !ev.target.closest('#settings-pop, #settings-btn')) pop.hidePopover();
    });
    document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && isOpen()) pop.hidePopover();
    });

    pop.addEventListener('beforetoggle', function (ev) {
        if (ev.newState === 'open') settingsPlace();
    });
    window.addEventListener('resize', function () { if (pop.matches(':popover-open')) settingsPlace(); });

    // With a mouse: closes 3 s after leaving overlay and gear (touch/without pointer: never)
    // The unstored bar position follows the layout (rotation, Split View)
    matchMedia(COMPACT_QUERY).addEventListener('change', settingsDisplay);
    var pointer = matchMedia('(hover: hover) and (pointer: fine)');
    var closeTimer = null;
    function autoCloseStop() { clearTimeout(closeTimer); closeTimer = null; }
    function autoCloseStart() {
        autoCloseStop();
        if (!pointer.matches || !pop.matches(':popover-open')) return;
        closeTimer = setTimeout(function () { if (pop.matches(':popover-open')) pop.hidePopover(); }, 3000);
    }
    var gear = document.getElementById('settings-btn'), gearTo = 0;
    [pop, gear].forEach(function (el) {
        el.addEventListener('mouseenter', autoCloseStop);
        el.addEventListener('mouseleave', autoCloseStart);
    });
    // Keyboard use in the overlay keeps it open
    pop.addEventListener('focusin', autoCloseStop);
    pop.addEventListener('focusout', autoCloseStart);
    pop.addEventListener('toggle', function (ev) {
        var on = ev.newState === 'open';
        // The gear inverts as long as the overlay is open; back only once it has retracted
        clearTimeout(gearTo);
        if (on) gear.classList.add('open');
        else gearTo = setTimeout(function () { gear.classList.remove('open'); },
            parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pop-duration')) || 0);
        gear.setAttribute('aria-expanded', on);
        if (on) autoCloseStart(); else autoCloseStop();
    });
    document.addEventListener('msmrzoom', settingsDisplay);
    document.addEventListener('msmrtheme', settingsDisplay);
    settingsDisplay();
})();

document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;   // browser zoom stays untouched
    if (e.target.closest('input, select, textarea, [contenteditable]')) return;
    if (e.key === '+' || e.key === '=') window.msmrZoom.set('m');
    else if (e.key === '-' || e.key === '0') window.msmrZoom.set('s');
});

// ── Mouse or keyboard: only the most recently used device highlights a tile ──
document.addEventListener('keydown', function (e) {
    if (e.key === 'Tab' || e.key.indexOf('Arrow') === 0) {
        document.body.classList.add('keyboard');
        if (cursor.el) cursorPlan();   // hide line/chevron under the resting pointer
    }
});
document.addEventListener('mousemove', function (e) {
    if (isTouch()) return;
    document.body.classList.remove('keyboard');
    mousePoint = { x: e.clientX, y: e.clientY };
    mouseMoved = true;
});

