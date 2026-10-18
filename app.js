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

// strong, saturated colors (no gray): white text (light) or dark text (dark) stays readable
var SEC_COLORS = ['#f85a5a', '#fb8f2a', '#e2a800', '#8ac430', '#2fc16c', '#22b59f', '#18b4d6',
    '#4a92f0', '#6c70f2', '#9a62f0', '#c456e8', '#ea4fa8', '#f4587a', '#f67a3a', '#2fae82'];

// Section color: same lightness and tint, saturation follows --color-intensity (styles.css, "Color" setting)
function sectionColor(idx, intensity) {
    return 'oklch(from ' + SEC_COLORS[idx % SEC_COLORS.length] + ' l calc(c * ' + (intensity || 'var(--color-intensity, 1)') + ') h)';
}

function makeIcon(icon) {
    var i = document.createElement('i');
    // APP section: Font Awesome's fa-square (closest rounded rectangle) instead of our own squircle mask
    if (icon === 'icon-squircle') icon = 'fa-square';
    i.className = 'fa-solid ' + (icon || 'fa-hashtag') + ' secicon';
    i.setAttribute('aria-hidden', 'true');
    return i;
}

// Chip, heading and list entry of a section light up together as soon as one of them is touched
function coupleHover(members) {
    members.forEach(function (el) {
        var others = members.filter(function (x) { return x !== el; });
        var mark = function (name, on) { others.forEach(function (x) { x.classList.toggle(name, on); }); };
        // Touch has no hover: emulated mouse events would swallow the first tap as a hover
        el.addEventListener('pointerenter', function (ev) { if (ev.pointerType === 'mouse') mark('with-hover', true); });
        el.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') { mark('with-hover', false); mark('with-press', false); } });
        el.addEventListener('mousedown', function () { mark('with-press', true); });
        el.addEventListener('mouseup', function () { mark('with-press', false); });
    });
}

// Button of a section (nav chip and entry of the sections list): same shape, same effects (a.sec-btn in styles.css)
function sectionButton(sec, idx, withoutSuffix) {
    var a = document.createElement('a');
    a.className = 'sec-btn';
    a.style.setProperty('--c', sectionColor(idx));
    a.href = '#' + sec.id;
    a.target = '_self';
    a.title = sec.title;
    a.appendChild(makeIcon(sec.icon));
    var t = document.createElement('span');
    t.className = 'secshort';
    t.textContent = withoutSuffix ? sec.title.replace(/\..*$/, '') : sec.title;   // "tbx.li" → "tbx": fits into the narrow list
    a.appendChild(t);
    return a;
}

// Jump to a section (dropdown list)
function jumpTo(hash) {
    selJump = hash;
    jumperValue = hash;
    // Safety net: the last section may never reach the top edge
    setTimeout(function () { selJump = null; syncActive(); }, 1500);
    var el = document.querySelector(hash);
    // Smartphone: the snap point of the page, otherwise the target snaps back to the start of the page
    var destSec = el && el.closest('section');
    if (el) (destSec ? pageStart(destSec).querySelector('.name') || el : el).scrollIntoView();
    // Mouse: the resting pointer is ignored until it moves (also when releasing over an entry, without a pointerdown on it)
    var sec = el && el.closest('section');
    if (sec && !document.body.classList.contains('keyboard') && !document.body.classList.contains('edit-mode')) {
        lockOn(sec, mousePoint ? mousePoint.x : 0, mousePoint ? mousePoint.y : 0, 'nav');
    }
    document.getElementById('section-jumper').blur();
    focusContent(el && el.closest('section'));
}

// Sections list: one entry per section (icon or name), opens instead of the native menu
function jumperList(data) {
    var pop = document.getElementById('jumper-pop'), entry = {};
    pop.innerHTML = '';
    data.forEach(function (sec, idx) {
        var a = sectionButton(sec, idx, true);
        a.addEventListener('click', function (ev) {
            ev.preventDefault();
            pop.hidePopover();
            jumpTo('#' + sec.id);
        });
        // Touch: the tap selects immediately, without waiting for the emulated mouse
        a.addEventListener('pointerup', function (ev) {
            if (ev.pointerType === 'mouse') return;
            ev.preventDefault();
            a.click();
        });
        pop.appendChild(a);
        entry[sec.id] = a;
    });
    return entry;   // section ID → entry, for the coupled highlight
}

(function () {
    var sel = document.getElementById('section-jumper');
    var pop = document.getElementById('jumper-pop');
    function isOpen() { return pop.matches(':popover-open'); }
    function openList() {
        var r = sel.getBoundingClientRect(), upper = r.top > window.innerHeight / 2;
        pop.style.width = r.width + 'px';   // flush with the field, like the settings overlay
        pop.style.setProperty('--set-height', navButtonHeight() + 'px');   // entries as tall as the settings buttons, also in the full-width grid
        pop.style.left = r.left + 'px';
        pop.style.top = upper ? 'auto' : r.bottom + 'px';
        pop.style.bottom = upper ? (window.innerHeight - r.top) + 'px' : 'auto';
        pop.style.maxHeight = (upper ? r.top : window.innerHeight - r.bottom) - 8 + 'px';
        pop.classList.toggle('upward', upper);
        pop.querySelectorAll('a').forEach(function (a) {
            a.classList.toggle('active', a.getAttribute('href') === jumperValue);
        });
        pop.showPopover();
        var ak = pop.querySelector('a.active');
        if (ak) ak.scrollIntoView({ block: 'nearest' });   // the active section is visible on opening
    }
    function entryAt(ev) {
        var el = document.elementFromPoint(ev.clientX, ev.clientY);
        return el && el.closest ? el.closest('#jumper-pop a') : null;
    }
    // press, drag onto an entry, release selects it (like the settings overlay); a simple click opens/closes
    var pressed = false, wasOpen = false;
    var lastTouch = 0;
    sel.addEventListener('mousedown', function (ev) {
        ev.preventDefault();   // no native menu
        if (Date.now() - lastTouch < 800) return;   // emulated mouse after touch: already handled
        pressed = true;
        wasOpen = isOpen();
        if (!wasOpen) openList();
    });
    document.addEventListener('mouseup', function (ev) {
        if (!pressed) return;
        pressed = false;
        var e = entryAt(ev);
        if (e) e.click();
        else if (ev.target.closest('#section-jumper')) { if (wasOpen) pop.hidePopover(); }
        else pop.hidePopover();
    });
    // Touch: tap, drag and release in one go; a simple tap opens/closes
    var dragId = null, dragOpen = false, dragEntry = null;
    function dragMark(e) {
        if (e === dragEntry) return;
        if (dragEntry) dragEntry.classList.remove('with-hover');
        dragEntry = e;
        if (e) e.classList.add('with-hover');
    }
    sel.addEventListener('pointerdown', function (ev) {
        if (ev.pointerType === 'mouse') return;
        ev.preventDefault();
        lastTouch = Date.now();
        dragId = ev.pointerId;
        dragOpen = isOpen();
        if (!dragOpen) openList();
    });
    sel.addEventListener('pointermove', function (ev) {
        if (ev.pointerId === dragId) dragMark(entryAt(ev));
    });
    sel.addEventListener('pointerup', function (ev) {
        if (ev.pointerId !== dragId) return;
        dragId = null;
        lastTouch = Date.now();
        var e = entryAt(ev);
        dragMark(null);
        if (e) e.click();
        else if (dragOpen && ev.target.closest('#section-jumper')) pop.hidePopover();
    });
    sel.addEventListener('pointercancel', function () { dragId = null; dragMark(null); });
    sel.addEventListener('keydown', function (ev) {
        if (!(ev.key === 'Enter' || ev.key === ' ' || ev.key === 'ArrowDown' || ev.key === 'ArrowUp')) return;
        ev.preventDefault();
        openList();
        var ak = pop.querySelector('a.active');
        if (ak) { ak.scrollIntoView({ block: 'nearest' }); ak.focus(); }
    });
    pop.addEventListener('keydown', function (ev) {
        var l = Array.prototype.slice.call(pop.querySelectorAll('a')), i = l.indexOf(document.activeElement);
        if (ev.key === 'ArrowDown') { ev.preventDefault(); l[Math.min(i + 1, l.length - 1)].focus(); }
        else if (ev.key === 'ArrowUp') { ev.preventDefault(); l[Math.max(i - 1, 0)].focus(); }
    });
    pop.addEventListener('toggle', function (ev) {
        sel.setAttribute('aria-expanded', ev.newState === 'open');
        // the list closes under the pointer and no mouseleave comes: undo the coupled highlight
        if (ev.newState !== 'open') document.querySelectorAll('.with-hover, .with-press').forEach(function (x) { x.classList.remove('with-hover', 'with-press'); });
    });
    document.addEventListener('pointerdown', function (ev) {
        if (isOpen() && !ev.target.closest('#jumper-pop, #section-jumper')) pop.hidePopover();
    });
    document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && isOpen()) { pop.hidePopover(); sel.focus(); }
    });
})();

function render(data) {
    var chipOf = {};
    var nav = document.getElementById('section-nav-list');
    var gear = document.getElementById('settings-btn');   // chips come before gear and dropdown
    nav.querySelectorAll('.secname').forEach(function (a) { a.remove(); });

    data.forEach(function (sec, idx) {
        var a = sectionButton(sec, idx);
        a.classList.add('secname');
        // wrapped so the event does not arrive as the focus target
        a.addEventListener('click', function () { focusContent(); });
        nav.insertBefore(a, gear);
        chipOf[sec.id] = a;
    });
    var entryOf = jumperList(data);

    var container = document.getElementById('container');
    container.tabIndex = -1;
    container.innerHTML = '';

    data.forEach(function (sec, idx) {
        var section = document.createElement('section');
        section.style.setProperty('--c', sectionColor(idx));   // inherited by heading and tiles
        section.tabIndex = -1;   // focusable, but not in the tab order

        var h3 = document.createElement('h3');
        h3.id = sec.id;
        h3.className = 'name';
        h3.dataset.color = sec.color || 'cyan';
        h3.dataset.icon = sec.icon || '';

        var titleLink = document.createElement('a');
        titleLink.href = '#' + sec.id;
        titleLink.target = '_self';
        titleLink.appendChild(makeIcon(sec.icon));
        titleLink.appendChild(document.createTextNode(sec.title));
        h3.appendChild(titleLink);
        coupleHover([chipOf[sec.id], entryOf[sec.id], h3]);
        // the mouse anywhere in the section (heading, background, tile): its chip shows the soft hover area (mouse only)
        (function (chip) {
            section.addEventListener('pointerenter', function (ev) { if (ev.pointerType === 'mouse') chip.classList.add('sec-hover'); });
            section.addEventListener('pointerleave', function () { chip.classList.remove('sec-hover'); });
        })(chipOf[sec.id]);

        var ul = document.createElement('ul');
        ul.className = 'group';
        (sec.links || []).forEach(function (link, i) {
            var li = makeLi(link.name, link.url, link.dead);
            li.dataset.name0 = link.name;   // original values for the comparison
            li.dataset.url0 = link.url;
            li.dataset.pos0 = i;
            li.dataset.sec0 = sec.id;
            ul.appendChild(li);
        });

        section.dataset.pos0 = idx;   // starting position of the section for the comparison when saving
        section.appendChild(h3);
        section.appendChild(ul);
        container.appendChild(section);
    });

    applyPrefs();
    trackActiveSection();
    gridInit();
    readMeasures();
    lightInit();
    cursorSecInit();
    glowInit();
    // Reload with #hash: the browser does not jump there on its own in content loaded later,
    // otherwise the content shows the first section while the highlight belongs to the address
    var dest = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
    if (dest) {
        dest.scrollIntoView({ behavior: 'instant' });
        syncActive();
    }
    focusContent();
}

// Replacement for scrollend without waiting: calls fn as soon as the scroll position has been still for two frames
var stillRaf = new Map();
function whenStill(fn) {
    cancelAnimationFrame(stillRaf.get(fn));
    var c = document.getElementById('container'), pos = null, still = 0;
    (function step() {
        var p = c.scrollTop + ',' + window.scrollY;
        still = p === pos ? still + 1 : 0;
        pos = p;
        if (still >= 2) { stillRaf.delete(fn); fn(); return; }
        stillRaf.set(fn, requestAnimationFrame(step));
    })();
}

// Topmost visible section: chip inverted, dropdown kept in sync.
function trackActiveSection() {
    var container = document.getElementById('container');
    var chips = document.querySelectorAll('.secname');
    var timer = null;

    syncActive = function () {
        var top = container.getBoundingClientRect().top;
        var headings = document.querySelectorAll('section h3.name');
        var active = chips.length ? chips[0].hash : '';
        var activeEl = null;
        headings.forEach(function (h3) {
            if (h3.getBoundingClientRect().top - top <= 24) {   // active shortly before snapping
                active = '#' + h3.id;
                activeEl = h3;
            }
        });
        // The active chip only follows the scroll position, never the mouse: over a section, a heading or a tile its chip shows
        // the soft hover area (.sec-hover or .with-hover), the active chip stays unchanged
        var nav = active;
        // after a click on a heading or chip its chip stays active until the mouse or keyboard moves
        var locked = lock.sec && !document.body.classList.contains('keyboard') && lock.sec.querySelector('h3.name');
        if (locked) nav = '#' + locked.id;
        chips.forEach(function (chip) {
            chip.classList.toggle('active', chip.hash === nav);
        });
        headings.forEach(function (h3) {
            var fits = '#' + h3.id === active;
            h3.classList.toggle('active', fits);
            // mark the section — also works when scrolling by hand
            h3.closest('section').classList.toggle('current', fits);
        });
        // docked header → color the bar's border too, no light gap
        document.body.classList.toggle('docked',
            !!activeEl && activeEl.getBoundingClientRect().top - top <= 1);
        if (selJump === null || selJump === active) { selJump = null; jumperValue = active; }
        jumpTarget = null;   // scrolling has come to rest
    };

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Tab' || e.key.indexOf('Arrow') === 0) setTimeout(syncActive);
    });

    // catch up only after scrolling has settled
    // while scrolling catch up every 80 ms (even for very slow swiping), one last time at the end (scrollend or stillness)
    var last = 0;
    container.addEventListener('scroll', function () {
        clearTimeout(timer);
        var now = performance.now();
        if (now - last > 80) { last = now; syncActive(); }
        whenStill(syncActive);   // scrollend does not always come on iOS: also detect stillness ourselves
    });
    container.addEventListener('scrollend', function () { clearTimeout(timer); syncActive(); });
    syncActive();
}

// Numbers from the CSS variables (:root in styles.css), read once
var measures = {};
function readMeasures() {
    var cs = getComputedStyle(document.documentElement);
    ['glow-duration', 'glow-duration-short', 'glide-power', 'light-duration', 'light-power', 'light-edge-duration', 'light-coverage',
        'ghost-header-shadow', 'ghost-header-fade', 'ghost-header-hold', 'cursor-line-faint'].forEach(function (n) {
        measures[n] = parseFloat(cs.getPropertyValue('--' + n));
    });
}
function glide(t) { return Math.pow(t, measures['glide-power']); }
readMeasures();

// ── Glow window ───────────────────────────────────────────────────
// The glowing section (hover, nav chip, keyboard, otherwise the topmost) is a window that glides to the
// next one, growing or shrinking on the way. The color changes abruptly at the section edges:
// each section paints only its part of the window as its background. Rows (heading, group, tiles)
// get .covered as soon as their middle lies inside the window. Measures live in the content, scrolling does not change them.
var glow = {
    container: null, secs: [], rows: [], sig: '', top: 0, bot: 0, dest: null,
    from: null, to: null, t0: 0, duration: 0, raf: 0, obs: []
};

// ── Pointer kind ──────────────────────────────────────────────────
// Mouse or finger/pen, as of the last pointerdown (mouse movement resets it). Touch has no hover: the :hover that iOS
// leaves hanging does not count, which is why body.touch in styles.css switches off all hover and press effects.
var PHONE_QUERY = 'only screen and (min-device-width: 350px) and (max-device-width: 812px)';
function isPhone() { return matchMedia(PHONE_QUERY).matches; }

var pointerKind = 'mouse';
function isTouch() { return pointerKind !== 'mouse'; }
function setPointerKind(kind) {
    pointerKind = kind;
    document.body.classList.toggle('touch', kind !== 'mouse');
    // Touch has no pointer: the tile light must not stay stuck at the touch point on the screen while the content scrolls underneath
    if (kind !== 'mouse') { lightMouse = null; mousePoint = null; lightReset(); }
}

// After a click on a heading, nav chip or list entry the section scrolls to the top, and the resting pointer then lies over another one.
// Until the next real mouse movement (more than 4 px), another click or (only after a heading click) a key press, the clicked section stays the target.

// kind: 'title' (a key press releases the lock) or 'nav' (chip or list entry)
function lockOn(sec, x, y, kind) {
    lock.sec = sec;
    lock.kind = kind;
    lock.x = x; lock.y = y;
    document.body.classList.add('locked');
    lightReset();
    glowSync();
    syncActive();
}

function lockOff() {
    if (!lock.sec) return;
    lock.sec = null;
    lock.kind = '';
    document.body.classList.remove('locked');
    glowSync();
    syncActive();
    lightPlan();
}

// already on press, so the chip is active immediately (no hover/press state) and the pointer disappears when scrolling up
// Mouse: already on press. Touch: only on click, so a swipe over the chips or the heading activates nothing
function lockFromEvent(e, touch) {
    var dest = (touch || e.button === 0) && !document.body.classList.contains('edit-mode') && e.target.closest && e.target.closest('#container .name a, a.sec-btn');
    var sec = dest && (dest.matches('a.sec-btn') ? (document.querySelector(dest.getAttribute('href')) || dest).closest('section') : dest.closest('section'));
    // Touch: a tap on the background or a tile also activates the section (there is no hover)
    if (!sec && touch && !document.body.classList.contains('edit-mode') && e.target.closest) { sec = e.target.closest('#container section'); dest = null; }
    if (!sec) { lockOff(); return; }
    lockOn(sec, e.clientX, e.clientY, dest && dest.matches('a.sec-btn') ? 'nav' : 'title');
}
// Touch: a tap is a pointerdown and a pointerup close together without scrolling in between (a scroll ends the pointer with pointercancel).
// A click event is not used: iOS does not reliably fire it for non-interactive elements such as a section background.
var tapStart = null;
document.addEventListener('pointerdown', function (e) {
    setPointerKind(e.pointerType);
    tapStart = isTouch() ? { x: e.clientX, y: e.clientY, t: performance.now() } : null;
    if (!isTouch()) lockFromEvent(e, false);
}, true);
document.addEventListener('pointerup', function (e) {
    if (e.pointerType === 'mouse' || !tapStart) return;
    var moved = Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y), duration = performance.now() - tapStart.t;
    tapStart = null;
    if (moved < 10 && duration < 600) lockFromEvent(e, true);
}, true);
document.addEventListener('pointercancel', function () { tapStart = null; }, true);
// The same tap detection from touch events: while the page is scrolling (also gliding on its own) iOS may cancel the pointer events
// (pointercancel), but touchend still arrives, so a tap into a section activates it at once and the scrolling goes on untouched.
var touchTap = null;
document.addEventListener('touchstart', function (e) {
    var t = e.touches[0];
    touchTap = t ? { x: t.clientX, y: t.clientY, t: performance.now(), target: e.target } : null;
}, { passive: true, capture: true });
document.addEventListener('touchend', function (e) {
    var start = touchTap, t = e.changedTouches[0];
    touchTap = null;
    if (!start || !t) return;
    if (Math.hypot(t.clientX - start.x, t.clientY - start.y) < 10 && performance.now() - start.t < 600) {
        lockFromEvent({ target: start.target, clientX: t.clientX, clientY: t.clientY, button: 0 }, true);
    }
}, { passive: true, capture: true });
document.addEventListener('mousemove', function (e) {
    if (lock.sec && Math.hypot(e.clientX - lock.x, e.clientY - lock.y) > 4) lockOff();
}, { passive: true });
// a key press only releases the lock after a heading click, not the one after a chip click
document.addEventListener('keydown', function () { if (lock.kind === 'title') lockOff(); });

document.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'mouse' && isTouch()) setPointerKind('mouse');
}, true);

// ── Touch swiping ─────────────────────────────────────────────────
// While the content scrolls (including the coasting), the window is tied to the scroll position (glowScroll) and the chips show no hover look (html.swiping).
var swiping = false;
// Swiping only ends when the finger is up: if it pauses while dragging, scrolling rests, but it goes on right away
var fingerDown = false;
document.addEventListener('touchstart', function () { fingerDown = true; }, { passive: true, capture: true });
['touchend', 'touchcancel'].forEach(function (n) {
    document.addEventListener(n, function () { fingerDown = false; if (swiping) whenStill(swipeEnd); }, { passive: true, capture: true });
});

function swipeEnd() {
    if (fingerDown) return;
    swiping = false;
    document.documentElement.classList.remove('swiping');
    glowSync();
}
document.addEventListener('scrollend', function () { if (swiping) swipeEnd(); }, true);
// Swiping with a finger ends the click lock (the mouse does that by moving)
document.addEventListener('touchmove', function () { if (lock.sec) lockOff(); }, { passive: true });
document.addEventListener('scroll', function () {
    if (!isTouch()) return;
    swiping = true;
    // not on the body: its class change triggers a re-measure and disturbs the coasting
    document.documentElement.classList.add('swiping');
    whenStill(swipeEnd);
}, true);

function glowTarget() {
    var c = glow.container, s = null, hot = true;
    if (document.body.classList.contains('keyboard')) {
        s = c.querySelector('section:focus-visible') || c.querySelector('section:has(:focus-visible)');
    } else if (lock.sec) {
        s = lock.sec;
    } else {
        s = isTouch() ? null : c.querySelector('section:hover');
        if (!s && !isTouch()) {
            // the chip of the active section counts too: its heading shows the same hover area as any other
            var h = c.querySelector('.name.with-hover');
            s = h && h.closest('section');
        }
    }
    if (!s) { s = c.querySelector('section.current'); hot = false; }
    return s ? { sec: s, hot: hot } : null;
}

// measures all section and row midpoints in the content; true if something has moved
function glowMeasure() {
    var c = glow.container, cr = c.getBoundingClientRect(), st = c.scrollTop;
    var secs = [], rows = [], sig = [];
    var y = function (r) { return Math.round(r.top - cr.top + st); };
    c.querySelectorAll('section').forEach(function (el) {
        var r = el.getBoundingClientRect();
        var name = el.querySelector('.name'), group = el.querySelector('.group');
        var rn = name && name.getBoundingClientRect();
        secs.push({ el: el, y: y(r), h: Math.round(r.height), on: null });
        if (rn) rows.push({ el: el, y: y(rn) + Math.round(rn.height / 2), on: null });
        if (rn) rows.push({ el: name, y: y(rn) + Math.round(rn.height / 2), on: null });
        if (group) rows.push({ el: group, y: y(group.getBoundingClientRect()), on: null });
        var lis = el.querySelectorAll('li');
        lis.forEach(function (li, i) {
            var rl = li.getBoundingClientRect();
            // the last tile tells its group whether the last row is covered (empty grid cells)
            rows.push({ el: li, y: y(rl) + Math.round(rl.height / 2), on: null, end: i === lis.length - 1 ? group : null });
            // the bottom grid line switches at the bottom edge of the row, not in its middle
            rows.push({ el: li, y: y(rl) + Math.round(rl.height) - 1, on: null, cls: 'covered-bottom' });
        });
        // empty cells of the last grid row (columns minus remainder), for ::after of the group
        if (group) {
            var columns = getComputedStyle(group).gridTemplateColumns.split(' ').length;
            var empty = lis.length ? (columns - lis.length % columns) % columns : columns;
            group.style.setProperty('--empty', empty);
            group.classList.toggle('full', empty === 0 || getComputedStyle(group).display !== 'grid');
        }
    });
    if (buildPages(c, secs)) return glowMeasure();   // filler changed: measure the position of the following sections again
    secs.forEach(function (s) { sig.push(s.y, s.h); });
    rows.forEach(function (z) { sig.push(z.y); });
    sig = sig.join(',');
    // carry over the state of the old rows so nothing flickers
    // (a row can have two states: middle .covered, bottom edge .covered-bottom)
    var old = new Map();
    glow.rows.forEach(function (z) {
        var m = old.get(z.el) || {};
        m[z.cls || ''] = z.on;
        old.set(z.el, m);
    });
    rows.forEach(function (z) {
        var m = old.get(z.el), k = z.cls || '';
        z.on = m && k in m ? m[k] : null;
    });
    var modified = sig !== glow.sig;
    glow.secs = secs; glow.rows = rows; glow.sig = sig;
    return modified;
}

function glowPaint(top, bot) {
    glow.top = top; glow.bot = bot;
    glow.secs.forEach(function (s) {
        var lo = Math.max(top, s.y) - s.y, hi = Math.min(bot, s.y + s.h) - s.y;
        // covered up to the bottom edge of the section: paint 1 px beyond (the rest is clipped), otherwise a stripe remains at fractional heights
        if (bot >= s.y + s.h) hi += 1;
        var image = hi > lo
            ? 'linear-gradient(to bottom, transparent ' + lo + 'px, var(--c) ' + lo + 'px, var(--c) ' + hi + 'px, transparent ' + hi + 'px)'
            : '';
        if (image !== s.on) { s.el.style.backgroundImage = image; s.on = image; }
    });
    glow.rows.forEach(function (z) {
        var on = z.y >= top && z.y < bot;
        if (on !== z.on) {
            z.el.classList.toggle(z.cls || 'covered', on);
            if (z.end) z.end.classList.toggle('end-covered', on);
            z.on = on;
        }
    });
}

function glowFrame(sec) {
    for (var i = 0; i < glow.secs.length; i++) {
        var s = glow.secs[i];
        if (s.el === sec) {
            // always exactly one section, also on the smartphone (the tapped one)
            return { top: s.y, bot: s.y + s.h };
        }
    }
    return { top: 0, bot: 0 };
}

function glowStep(now) {
    var f = glow, t = Math.min(1, (now - f.t0) / f.duration);
    // accelerates from the start and ends hard: no coasting
    var e = glide(t);
    glowPaint(f.from.top + (f.to.top - f.from.top) * e, f.from.bot + (f.to.bot - f.from.bot) * e);
    f.raf = t < 1 ? requestAnimationFrame(glowStep) : 0;
}

// straight to the target (start, layout change) or gliding
function glowTo(dest, animated) {
    var f = glow;
    cancelAnimationFrame(f.raf); f.raf = 0;
    var to = glowFrame(dest && dest.sec);
    if (!animated) { glowPaint(to.top, to.bot); return; }
    // reduced motion means shorter, not none
    var short = matchMedia('(prefers-reduced-motion: reduce)').matches;
    f.from = { top: f.top, bot: f.bot }; f.to = to;
    f.duration = short ? measures['glow-duration-short'] : measures['glow-duration'];
    f.t0 = performance.now();
    f.raf = requestAnimationFrame(glowStep);
}

// Smartphone: pages made of sections. Two consecutive half-height sections form one page (one snap point, both on the
// screen at once); a remaining half-height section stays alone (the lower half stays empty); a larger section always starts
// its own page and, if taller than the screen, scrolls freely inside it. The snap point is the first section of each page
// (.page-start, styles.css). pageIdx holds the section numbers per page. The glow window still covers only one section: the first one on screen or the tapped one.
function buildPages(c, secs) {
    var phone = isPhone() && !document.body.classList.contains('edit-mode');
    var H = c.clientHeight, pages = [], i = 0;
    var isHalf = function (s) { return s.h <= H * 0.5 + 3; };
    while (i < secs.length) {
        if (phone && isHalf(secs[i]) && i + 1 < secs.length && isHalf(secs[i + 1])) { pages.push([i, i + 1]); i += 2; }
        else { pages.push([i]); i++; }
    }
    glow.pageIdx = pages;
    var starts = {}, lone = {}, changed = false;
    pages.forEach(function (p) { starts[p[0]] = true; if (p.length === 1 && isHalf(secs[p[0]])) lone[p[0]] = true; });
    secs.forEach(function (s, k) {
        var want = phone && !!starts[k];
        if (s.el.classList.contains('page-start') !== want) s.el.classList.toggle('page-start', want);
        // a lone half-height section gets an empty half-height section behind it (filler), also as the last one:
        // so the page stays full, and a following larger section starts on its own page
        var filler = phone && lone[k] ? Math.max(0, Math.round(H - s.h)) + 'px' : '';
        if (s.el.style.marginBottom !== filler) { s.el.style.marginBottom = filler; changed = true; }
    });
    return changed;
}

// Section that forms the snap point of its page on the smartphone (otherwise the section itself): dropdown, steppers and arrows jump there
function pageStart(sec) {
    var secs = document.querySelectorAll('#container section');
    var idx = Array.prototype.indexOf.call(secs, sec);
    if (idx < 0 || !glow.pageIdx || !isPhone() || document.body.classList.contains('edit-mode')) return sec;
    for (var k = 0; k < glow.pageIdx.length; k++) {
        if (glow.pageIdx[k].indexOf(idx) >= 0) return secs[glow.pageIdx[k][0]];
    }
    return sec;
}

// Touch: while scrolling, the window is a function of the scroll position. Between two section top edges it moves from the frame of one
// to that of the next (top edge = scroll position), at the snap point it covers exactly the section. So it runs with the finger and the
// coasting, without its own time: no running ahead, lagging behind or twitching on target changes. The last section may never reach the top edge:
// its transition ends at the maximum scroll distance.
function glowScroll() {
    var f = glow, c = f.container, l = f.secs;   // always one section: the first one on screen
    if (!l.length) return;
    cancelAnimationFrame(f.raf); f.raf = 0;
    f.dest = null;   // determine anew afterwards
    var st = c.scrollTop, max = c.scrollHeight - c.clientHeight, i = 0;
    while (i + 1 < l.length && l[i + 1].y <= st + 0.5) i++;
    var a = l[i], top = a.y, bot = a.y + a.h;
    if (i + 1 < l.length) {
        var b = l[i + 1], end = Math.min(b.y, max), p = end > a.y ? Math.max(0, Math.min(1, (st - a.y) / (end - a.y))) : 0;
        top = a.y + (b.y - a.y) * p;
        bot = a.y + a.h + (b.y + b.h - a.y - a.h) * p;
    }
    // Transition from the tap target (or an animation) into the coupling: the distance to the scroll position's frame fades out over 280 ms (smoothstep),
    // instead of the window jumping there (that made the bottom edge stutter after tapping and scrolling)
    var now = performance.now();
    if (!f.inScroll) { f.inScroll = true; f.offset = { top: f.top - top, bot: f.bot - bot, t0: now }; }
    var v = f.offset, t = v ? Math.min(1, (now - v.t0) / 280) : 1, k = v ? 1 - t * t * (3 - 2 * t) : 0;   // smoothstep: no jerk at the start and at the end
    if (v && t >= 1) { f.offset = v = null; k = 0; }
    glowPaint(top + (v ? v.top * k : 0), bot + (v ? v.bot * k : 0));
    if (v) f.raf = requestAnimationFrame(glowScroll);   // keep fading, even if scrolling pauses briefly
}

function glowSync() {
    var f = glow;
    if (!f.container) return;
    ghostHeaderRender();
    // While scrolling the window follows the scroll position, except after a tap into a section (lock kind 'title'): that tap activates the
    // section at once, also while the page is still coasting. A jump via chip or list (kind 'nav') still follows the scroll.
    if (isTouch() && !document.body.classList.contains('keyboard') && (!lock.sec || (swiping && lock.kind !== 'title'))) {
        f.container.querySelectorAll('section.hot').forEach(function (s) { s.classList.remove('hot'); });
        glowScroll();
        return;
    }
    f.inScroll = false;   // not tied to the scroll position: start anew at the next transition
    var z = glowTarget();
    f.container.querySelectorAll('section.hot').forEach(function (s) {
        if (!z || s !== z.sec || !z.hot) s.classList.remove('hot');
    });
    if (z && z.hot) z.sec.classList.add('hot');
    if (z && z.sec === f.dest) return;
    var first = !f.dest;
    f.dest = z && z.sec;
    glowTo(z, !first);
}

function glowLayout() {
    var f = glow;
    if (!f.container || !glowMeasure()) return;
    f.dest = null;   // determine anew and set without gliding
    glowSync();
}

function glowPlan(fn) {
    var id = 0;
    return function () {
        cancelAnimationFrame(id);
        id = requestAnimationFrame(fn);
    };
}

// Observer with an emergency brake: if a call changes the observed thing again (e.g. a classList.remove without effect counts as a change),
// it calls itself endlessly in the same task and freezes the page. After 500 calls without a break it is disconnected.
function safeObserve(dest, options, fn) {
    var n = 0, reset = 0;
    var obs = new MutationObserver(function (ms) {
        if (++n > 500) {
            obs.disconnect();
            console.error('MutationObserver aborted: infinite loop');
            return;
        }
        if (!reset) reset = setTimeout(function () { n = 0; reset = 0; }, 0);
        fn(ms);
    });
    obs.observe(dest, options);
    return obs;
}

function glowInit() {
    var f = glow, c = document.getElementById('container');
    f.obs.forEach(function (o) { o.disconnect(); });
    f.obs = [];
    cancelAnimationFrame(f.raf); f.raf = 0;
    ghostHeaderReset();
    lock.sec = null;
    document.body.classList.toggle('locked', false);
    f.container = c; f.rows = []; f.secs = []; f.sig = ''; f.dest = null; f.top = f.bot = 0;
    glowMeasure();
    glowSync();

    var layout = glowPlan(glowLayout), sync = glowPlan(glowSync);
    var ro = new ResizeObserver(layout);
    ro.observe(c);
    c.querySelectorAll('section').forEach(function (s) { ro.observe(s); });
    // Classes (current, with-hover, keyboard) change the target; new tiles and view changes the measures
    var mo = safeObserve(c, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] }, function (ms) {
        var sizes = ms.some(function (m) { return m.type === 'childList'; });
        (sizes ? layout : sync)();
    });
    var bo = safeObserve(document.body, { attributes: true, attributeFilter: ['class'] }, function () {
        layout(); sync();
        if (document.body.classList.contains('edit-mode')) lightReset();
        lightPlan();
    });
    f.obs.push(ro, mo, bo);
}

// Events hang on the document and apply to every run of glowInit
['mouseover', 'mouseout', 'focusin', 'focusout', 'keydown'].forEach(function (n) {
    document.addEventListener(n, glowPlan(glowSync));
});
document.addEventListener('scroll', glowPlan(glowSync), true);
window.addEventListener('resize', glowPlan(glowLayout));
if (document.fonts && document.fonts.ready) document.fonts.ready.then(glowPlan(glowLayout));

// ── Ghost headers ─────────────────────────────────────────────────
// If the heading of the target section (nav chip under the mouse or jump after a click) lies outside the view,
// a copy sticks to the top or bottom edge until the real heading arrives there and moves on naturally.
// When the target changes, the new copy glides over the previous one.
// The copies stack: stack runs from bottom to top, cur is the topmost (the current target). At the top edge the copy
// of the earliest section is on top, at the bottom edge that of the latest: an earlier target lays itself over, a later one makes the copies in front
// glide out; if the target returns to a copy in the stack, those above glide out and it is free again.
var ghostHeader = { layer: null, cur: null, stack: [], leaving: [], jump: null, jumpTimer: 0, removeTimer: 0, underTimer: 0, free: 0, followTimer: 0 };

// Position outside the view: the copy, including shadow (--shadow) and line, lies completely outside
function ghostHeaderOffscreen(edge) {
    return edge === 'top' ? 'translateY(calc(-100% - var(--shadow, 1.5rem) - 2px))' : 'translateY(calc(100% + var(--shadow, 1.5rem) + 2px))';
}

function ghostHeaderDuration() {
    // 400 ms, short like the window for reduced motion
    return matchMedia('(prefers-reduced-motion: reduce)').matches ? measures['glow-duration-short'] : 400;
}

function ghostHeaderLayer() {
    if (!ghostHeader.layer) {
        ghostHeader.layer = document.createElement('div');
        ghostHeader.layer.id = 'ghost-header-layer';
        ghostHeader.layer.setAttribute('aria-hidden', 'true');
        document.body.appendChild(ghostHeader.layer);
    }
    return ghostHeader.layer;
}

// Jump (click, dropdown, arrow keys): the copy stays until the heading is in view
function ghostHeaderJump(sec) {
    ghostHeader.jump = sec;
    clearTimeout(ghostHeader.jumpTimer);
    ghostHeader.jumpTimer = setTimeout(function () { ghostHeader.jump = null; ghostHeaderRender(); }, measures['ghost-header-hold']);
    ghostHeaderRender();
}

function ghostHeaderSection() {
    var c = glow.container;
    var h = c && !document.body.classList.contains('keyboard') && c.querySelector('.name.with-hover:not(.active)');
    return (h && h.closest('section')) || ghostHeader.jump;
}

function ghostHeaderRemove(g, gliding, pale) {
    if (!g) return;
    if (pale) {   // hand-over to the real heading: fade out briefly so an offset of a few pixels does not jump
        g.el.style.transition = 'opacity 60ms linear';
        g.el.style.opacity = '0';
        setTimeout(function () { g.el.remove(); }, 70);
        return;
    }
    if (!gliding) { g.el.remove(); return; }
    g.el.style.transform = ghostHeaderOffscreen(g.edge);
    setTimeout(function () { g.el.remove(); }, ghostHeaderDuration() + 30);
}

function ghostHeaderRender() {
    var c = glow.container;
    if (!c) return;
    // Smartphone: no ghost headers, the headings stay with their section and scroll out of view with it
    var phone = isPhone();
    var sec = document.body.classList.contains('edit-mode') || phone ? null : ghostHeaderSection();
    var cr = c.getBoundingClientRect(), tall = c.clientHeight;
    var edge = null, name = sec && sec.querySelector('.name'), heightPx = 0, distance = 0, waiting = null;
    if (name) {
        var r = name.getBoundingClientRect();
        heightPx = r.height;
        if (r.top < cr.top - 0.5) { edge = 'top'; distance = cr.top - r.top; }
        else if (r.top > cr.top + tall - heightPx + 0.5) { edge = 'bottom'; distance = r.top - (cr.top + tall - heightPx); }
        else if (sec === ghostHeader.jump) {
            // arrived: the copy lies over the real heading until the window has covered it (otherwise it flashes gray)
            var upper = r.top - cr.top + c.scrollTop, f = glow;
            var covered = name.classList.contains('covered') && f.top <= upper + 0.5 && f.bot >= upper + heightPx - 0.5;   // row completely inside the window
            if (covered || !ghostHeader.cur || ghostHeader.cur.sec !== sec) ghostHeader.jump = null;
            else waiting = r.top - cr.top;
        }
    }
    var cur = ghostHeader.cur;
    if (!edge && waiting !== null) {
        cur.el.style.top = waiting + 'px';
        cur.el.style.setProperty('--strength', 0);
        return;
    }
    var now = performance.now();
    // Changes run one at a time: if one is running, the target waits for its end, and only the last one counts.
    // So hovering quickly over several chips never makes several copies glide at once like a fan.
    function waitForEnd() {
        if (now >= ghostHeader.free) return false;
        clearTimeout(ghostHeader.followTimer);
        ghostHeader.followTimer = setTimeout(ghostHeaderRender, ghostHeader.free - now + 10);
        return true;
    }
    function followStep() {   // the next step (taking the stack down or building it up piece by piece) after this change
        clearTimeout(ghostHeader.followTimer);
        ghostHeader.followTimer = setTimeout(ghostHeaderRender, ghostHeader.free - performance.now() + 10);
    }
    // glide in and out: ease-out (fast at the start, slow at the end)
    var curve = 'transform ' + ghostHeaderDuration() + 'ms cubic-bezier(.215, .61, .355, 1)';
    function slideOut(g) {   // glides out including shadow and line and is removed afterwards
        g.el.style.transition = curve;
        g.el.style.transform = ghostHeaderOffscreen(g.edge);
        g.el.classList.add('out');   // shadow and line fade out quickly at the end of gliding out (styles.css)
        g.el.style.setProperty('--fade-delay', Math.round(ghostHeaderDuration() * 0.75) + 'ms');
        g.el.style.setProperty('--fade-duration', Math.round(ghostHeaderDuration() * 0.25) + 'ms');
        ghostHeader.leaving.push(g);
    }
    function scheduleRemoval() {
        clearTimeout(ghostHeader.removeTimer);
        ghostHeader.removeTimer = setTimeout(function () {
            ghostHeader.leaving.forEach(function (g) { ghostHeaderRemove(g, false); });
            ghostHeader.leaving = [];
        }, ghostHeaderDuration() + 30);
    }
    // The copies glide out together (one change), the topmost of the rest becomes free and gets its shadow back
    function slideOutAll(list, pale) {
        list.forEach(function (g) { if (pale && g.sec === sec) ghostHeaderRemove(g, false, true); else slideOut(g); });
        ghostHeader.stack = ghostHeader.stack.filter(function (g) { return list.indexOf(g) < 0; });
        var released = ghostHeader.stack[ghostHeader.stack.length - 1] || null;
        if (released) released.el.classList.remove('under');
        ghostHeader.cur = released;
        scheduleRemoval();
    }
    if (!edge) {
        // No target, or its heading is in view: all copies glide out
        if (!ghostHeader.stack.length) return;
        if (waitForEnd()) return;
        ghostHeader.free = now + ghostHeaderDuration();
        slideOutAll(ghostHeader.stack.slice(), true);
        return;
    }
    var layer = ghostHeaderLayer();
    layer.style.left = cr.left + 'px';
    layer.style.top = cr.top + 'px';
    layer.style.width = c.clientWidth + 'px';
    layer.style.height = tall + 'px';
    var tile = c.querySelector('li');
    layer.style.setProperty('--shadow', (tile ? tile.offsetHeight : heightPx) * measures['ghost-header-shadow'] + 'px');
    // after a click the shadow fades out the closer the real heading gets to its place; there it is gone
    var strength = sec === ghostHeader.jump ? Math.min(1, distance / (measures['ghost-header-fade'] * heightPx)) : 1;
    // copies underneath whose real heading is now in view disappear
    ghostHeader.stack = ghostHeader.stack.filter(function (g) {
        if (g === cur) return true;
        if (!ghostHeaderEdge(g.sec, cr, tall)) { ghostHeaderRemove(g, false, true); return false; }
        return true;
    });
    function refresh(g) {
        g.el.classList.toggle('hot', !!g.sec.querySelector('.name.with-hover'));
        g.el.style.setProperty('--strength', strength);
    }
    if (cur && cur.sec === sec) {
        refresh(cur);
        cur.el.style.top = (edge === 'top' ? 0 : tall - heightPx) + 'px';
        return;
    }
    // Something changes
    if (waitForEnd()) return;
    ghostHeader.free = now + ghostHeaderDuration();
    // other edge: first the whole stack glides out, then the new one begins
    if (cur && cur.edge !== edge) {
        slideOutAll(ghostHeader.stack.slice(), false);
        followStep();
        return;
    }
    // the target is already in the stack: the copies above glide out together, it is free again
    var pos = ghostHeader.stack.findIndex(function (g) { return g.sec === sec; });
    if (pos >= 0) {
        slideOutAll(ghostHeader.stack.slice(pos + 1), false);
        refresh(ghostHeader.stack[pos]);
        return;
    }
    // New target: copies that lie further away than the target glide out first (step 2, gliding in, follows after this change);
    // the nearer ones stay underneath. Hovering quickly skips intermediate steps (only the last target counts).
    var targetRank = ghostHeaderRank(sec, edge);
    var further = ghostHeader.stack.filter(function (g) { return ghostHeaderRank(g.sec, edge) > targetRank; });
    if (further.length) { slideOutAll(further, false); followStep(); return; }
    // The stack contains all sections between the view and the target: those in between lie ready under the target (without shadow and line)
    // and are uncovered on the way back, without gliding down first
    function place(g) {
        var k = ghostHeader.stack.findIndex(function (x) { return ghostHeaderRank(x.sec, edge) > ghostHeaderRank(g.sec, edge); });
        if (k < 0) { layer.appendChild(g.el); ghostHeader.stack.push(g); }
        else { layer.insertBefore(g.el, ghostHeader.stack[k].el); ghostHeader.stack.splice(k, 0, g); }
    }
    Array.prototype.filter.call(c.querySelectorAll('section'), function (x) {
        return x !== sec && ghostHeaderEdge(x, cr, tall) === edge && ghostHeaderRank(x, edge) < targetRank
            && !ghostHeader.stack.some(function (g) { return g.sec === x; });
    }).sort(function (a, b) { return ghostHeaderRank(a, edge) - ghostHeaderRank(b, edge); }).forEach(function (x) {
        var g = ghostHeaderMake(x, edge, tall);
        g.el.classList.add('under');
        place(g);
    });
    // the previous topmost now lies under the target: no second shadow and no second line (otherwise it gets darker and darker); only once the target is there, so no gap appears
    var beneath = ghostHeader.stack.slice();
    clearTimeout(ghostHeader.underTimer);
    ghostHeader.underTimer = setTimeout(function () {
        beneath.forEach(function (g) { if (g !== ghostHeader.cur && ghostHeader.stack.indexOf(g) >= 0) g.el.classList.add('under'); });
    }, ghostHeaderDuration());
    var fresh = ghostHeaderMake(sec, edge, tall);
    layer.appendChild(fresh.el);
    ghostHeader.stack.push(fresh);
    fresh.el.style.setProperty('--strength', strength);
    fresh.el.classList.toggle('hot', !!sec.querySelector('.name.with-hover'));
    // the target glides in, including shadow and line
    fresh.el.style.transform = ghostHeaderOffscreen(edge);
    fresh.el.getBoundingClientRect();   // commit the starting position
    // accelerates and ends hard, like the window
    fresh.el.style.transition = curve;
    fresh.el.style.transform = 'none';
    ghostHeader.cur = fresh;
    scheduleRemoval();
}

// Edge at which the heading of a section lies outside the view ('top', 'bottom'); null if it is in view
function ghostHeaderEdge(sec, cr, tall) {
    var r = sec.querySelector('.name').getBoundingClientRect();
    if (r.top < cr.top - 0.5) return 'top';
    if (r.top > cr.top + tall - r.height + 0.5) return 'bottom';
    return null;
}

// Distance from the view: larger means further away (at the top the earlier sections, at the bottom the later ones)
function ghostHeaderRank(sec, edge) {
    return edge === 'top' ? -ghostHeaderIndex(sec) : ghostHeaderIndex(sec);
}

// A copy of the heading, aligned to the edge (starting position: at its place)
function ghostHeaderMake(sec, edge, tall) {
    var name = sec.querySelector('.name'), el = document.createElement('div');
    el.className = 'ghost-header ' + edge;
    el.style.setProperty('--c', sec.style.getPropertyValue('--c'));
    var clone = name.cloneNode(true);
    clone.removeAttribute('id');
    clone.className = 'name';
    clone.querySelectorAll('a').forEach(function (a) { a.tabIndex = -1; });
    el.appendChild(clone);
    el.style.top = (edge === 'top' ? 0 : tall - name.getBoundingClientRect().height) + 'px';
    return { sec: sec, el: el, edge: edge };
}

// Position of a section in the content (order of the headings)
function ghostHeaderIndex(sec) {
    return Array.prototype.indexOf.call(glow.container.querySelectorAll('section'), sec);
}

function ghostHeaderReset() {
    clearTimeout(ghostHeader.removeTimer); clearTimeout(ghostHeader.jumpTimer); clearTimeout(ghostHeader.underTimer); clearTimeout(ghostHeader.followTimer); ghostHeader.free = 0;
    if (ghostHeader.layer) ghostHeader.layer.innerHTML = '';
    ghostHeader.cur = null; ghostHeader.stack = []; ghostHeader.leaving = []; ghostHeader.jump = null;
}

// ── Tile light (chips and grid) ───────────────────────────────────
// The hover area of the tile is a single element that glides from tile to tile
// (accelerating, ends hard). Out of nowhere it comes in full size from outside into the tile
// and leaves it the same way, clipped to the tile; nothing scales. It lies in the content and scrolls with it.
// mode: 'off' (invisible), 'on' (on a tile or on the way there), 'out' (leaves the tile).
var light = { el: null, mode: 'off', tile: null, old: null, inverted: new Set(), cur: null, from: null, to: null,
    clip: null, radius: 0, t0: 0, duration: 0, linear: false, raf: 0, end: null, cursor: null };

function lightActive() {
    return !document.body.classList.contains('edit-mode');
}

function lightFrame(a) {
    var c = glow.container, cr = c.getBoundingClientRect(), r = a.getBoundingClientRect();
    return { x: r.left - cr.left + c.scrollLeft, y: r.top - cr.top + c.scrollTop, w: r.width, h: r.height };
}

function lightPaint(r) {
    if (!(r.w >= 0 && r.h >= 0 && isFinite(r.x) && isFinite(r.y))) return;
    light.cur = r;
    var s = light.el.style, k = light.clip;
    s.left = r.x + 'px'; s.top = r.y + 'px'; s.width = r.w + 'px'; s.height = r.h + 'px';
    // clipped to the tile's rectangle (without rounding) as a fixed window in space: only the part of the light inside it shows
    s.clipPath = k
        ? 'xywh(' + (k.x - r.x) + 'px ' + (k.y - r.y) + 'px ' + k.w + 'px ' + k.h + 'px)'
        : '';
}

// Rounding of the tile surface (a::before), so light and clip are rounded exactly like the tile
function lightRadius(a) {
    light.radius = parseFloat(getComputedStyle(a, '::before').borderTopLeftRadius) || 0;
    light.el.style.borderRadius = light.radius + 'px';
}

// The line cursor sits in the light and glides along: position relative to the light = pointer relative to the target tile; color of the section
function lightLine(li, mouseX) {
    var sec = li.closest('section');
    light.el.style.setProperty('--sc', sec ? sec.style.getPropertyValue('--c') : '');
    if (mouseX == null) return;
    light.cursor.style.left = (mouseX - li.querySelector('a').getBoundingClientRect().left) + 'px';
}

// Share of the tile that the light covers
function lightCoverage(r, k) {
    if (!r || !k || !k.w || !k.h) return 0;
    var w = Math.max(0, Math.min(r.x + r.w, k.x + k.w) - Math.max(r.x, k.x));
    var h = Math.max(0, Math.min(r.y + r.h, k.y + k.h) - Math.max(r.y, k.y));
    return (w * h) / (k.w * k.h);
}

// The text of a tile inverts (.inverted) as long as the light covers at least 95 % of it.
// Only the target tile, the one just left and all previously inverted ones are checked: so none stays stuck.
function lightInverted() {
    var candidates = new Set(light.inverted);
    if (light.tile) candidates.add(light.tile);
    if (light.old) candidates.add(light.old);
    candidates.forEach(function (li) {
        var a = li.querySelector('a');
        var on = !!a && light.mode !== 'off' && lightCoverage(light.cur, lightFrame(a)) >= measures['light-coverage'];
        li.classList.toggle('inverted', on);
        if (on) light.inverted.add(li); else light.inverted.delete(li);
    });
    if (light.old && !light.inverted.has(light.old)) light.old = null;
    lightCells();
}

// The cell under the light (and the one just left) carries the section color immediately, without waiting for the window.
// Two areas in the content under the light; so they safely lie behind the bright tile surface.
function lightCells() {
    var list = light.cells || [];
    var candidates = light.mode === 'off' ? [] : [light.tile, light.old].filter(Boolean);
    list.forEach(function (z, i) {
        var li = candidates[i], a = li && li.querySelector('a');
        if (!a) { z.style.display = 'none'; return; }
        var r = lightFrame(li), sec = li.closest('section');
        z.style.display = 'block';
        z.style.left = r.x + 'px'; z.style.top = r.y + 'px'; z.style.width = r.w + 'px'; z.style.height = r.h + 'px';
        z.style.backgroundColor = sec ? sec.style.getPropertyValue('--c') : '';
    });
}

function lightStep(now) {
    var t = Math.max(0, Math.min(1, (now - light.t0) / light.duration)), v = light.from, n = light.to;
    var e = light.linear ? t : Math.pow(t, measures['light-power']);
    lightPaint({ x: v.x + (n.x - v.x) * e, y: v.y + (n.y - v.y) * e, w: v.w + (n.w - v.w) * e, h: v.h + (n.h - v.h) * e });
    lightInverted();
    if (t < 1) { light.raf = requestAnimationFrame(lightStep); return; }
    light.raf = 0;
    var end = light.end;
    light.end = null;
    if (end) end();
}

function lightRun(from, to, duration, linear, end) {
    cancelAnimationFrame(light.raf);
    light.from = from; light.to = to; light.duration = duration; light.linear = linear; light.end = end || null;
    light.t0 = performance.now();
    light.raf = requestAnimationFrame(lightStep);
}

// Edge of the tile that the pointer is closest to (without pointer: left)
function lightEdge(a, pos) {
    if (!pos) return 'l';
    var r = a.getBoundingClientRect();
    var d = { l: Math.abs(pos.x - r.left), r: Math.abs(r.right - pos.x), t: Math.abs(pos.y - r.top), b: Math.abs(r.bottom - pos.y) };
    var m = Math.min(d.l, d.r, d.t, d.b);
    return m === d.l ? 'l' : m === d.r ? 'r' : m === d.t ? 't' : 'b';
}

// the tile shifted by its own size beyond the edge: the light "outside"
function lightOutside(n, rim) {
    var o = { x: n.x, y: n.y, w: n.w, h: n.h };
    if (rim === 'l') o.x = n.x - n.w;
    else if (rim === 'r') o.x = n.x + n.w;
    else if (rim === 't') o.y = n.y - n.h;
    else o.y = n.y + n.h;
    return o;
}

// gone at once, without movement
function lightReset() {
    cancelAnimationFrame(light.raf); light.raf = 0; light.end = null;
    light.mode = 'off'; light.tile = null; light.old = null; light.clip = null;
    light.inverted.forEach(function (li) { li.classList.remove('inverted'); });
    light.inverted.clear();
    lightCells();
    if (!light.el) return;
    light.el.style.opacity = '0';
    light.el.style.clipPath = '';
    // only if set: classList.remove triggers the body observer even without a change (infinite loop in edit mode)
    if (document.body.classList.contains('tile-light')) document.body.classList.remove('tile-light');
}

function lightTo(li, mouseX, mouseY) {
    if (!light.el || !glow.container) return;
    var a = li && li.querySelector('a');
    if (!a || !lightActive() || lock.sec) { lightReset(); return; }   // locked: scrolling tiles under the resting pointer do not light up
    if (li === light.tile && light.mode === 'on') return;
    var to = lightFrame(a);
    lightRadius(a);
    lightLine(li, mouseX);
    var before = light.tile;
    if (light.mode === 'off') {
        // out of nowhere: from outside over the entry edge into the tile, clipped to it
        light.mode = 'on'; light.tile = li; light.old = null; light.clip = to;
        light.el.style.opacity = '1';
        document.body.classList.add('tile-light');
        var from = lightOutside(to, lightEdge(a, mouseX == null ? null : { x: mouseX, y: mouseY }));
        lightPaint(from);
        lightCells();
        lightRun(from, to, measures['light-edge-duration'], true, function () { light.clip = null; lightPaint(light.cur); });
        return;
    }
    // visible (on a tile or when leaving): glides from here to the new tile
    if (before && before !== li) light.old = before;
    light.mode = 'on'; light.tile = li; light.clip = null;
    lightCells();
    lightRun(light.cur, to, measures['light-duration'], false, null);
}

// with pointer position: the light leaves the tile over the edge the pointer crossed (counterpart to the entry)
function lightOff(pos) {
    if (!light.el || light.mode !== 'on') return;
    var li = light.tile, a = li && li.querySelector('a');
    if (!a || !light.cur || !lightActive()) { lightReset(); return; }
    var n = lightFrame(a);
    lightRadius(a);
    light.mode = 'out'; light.old = li; light.tile = null; light.clip = n;
    lightRun(light.cur, lightOutside(n, lightEdge(a, pos)), measures['light-edge-duration'], true, lightReset);
}

function lightInit() {
    var c = document.getElementById('container');
    lightReset();
    light.el = document.createElement('div');
    light.el.id = 'tile-light';
    light.el.setAttribute('aria-hidden', 'true');
    c.insertBefore(light.el, c.firstChild);
    light.cursor = document.createElement('div');
    light.cursor.className = 'tile-light-line';
    light.el.appendChild(light.cursor);
    light.cells = [0, 1].map(function () {
        var z = document.createElement('div');
        z.className = 'tile-cell';
        z.setAttribute('aria-hidden', 'true');
        c.insertBefore(z, light.el);
        return z;
    });
    light.cur = null;
}

document.addEventListener('mouseover', function (e) {
    if (document.body.classList.contains('keyboard') || isTouch()) return;   // Touch: mouse events pushed in by iOS do not count
    var li = e.target.closest && e.target.closest('#container li');
    if (li) lightTo(li, e.clientX, e.clientY); else lightOff({ x: e.clientX, y: e.clientY });
});
document.documentElement.addEventListener('mouseleave', function (e) {
    lightMouse = null;
    lightOff({ x: e.clientX, y: e.clientY });
});

// Safety net: the light always follows the tile under the pointer, even if no mouseover came
// (scrolling under a resting pointer, switch from keyboard to mouse, layout change)
var lightMouse = null, lightPlanRaf = 0;
function lightSync() {
    lightPlanRaf = 0;
    if (!lightMouse || document.body.classList.contains('keyboard') || isTouch()) return;
    if (lock.sec) { lightReset(); return; }
    var t = document.elementFromPoint(lightMouse.x, lightMouse.y);
    var li = t && t.closest && t.closest('#container li');
    if (li) lightTo(li, lightMouse.x, lightMouse.y); else lightOff(lightMouse);
}
function lightPlan() { if (!lightPlanRaf) lightPlanRaf = requestAnimationFrame(lightSync); }
document.addEventListener('mousemove', function (e) {
    if (isTouch()) return;
    lightMouse = { x: e.clientX, y: e.clientY };
    if (light.mode === 'on' && light.tile) lightLine(light.tile, e.clientX);
    lightPlan();
}, { passive: true });
document.addEventListener('scroll', lightPlan, true);
document.addEventListener('focusin', function (e) {
    if (!document.body.classList.contains('keyboard')) return;
    var li = e.target.closest && e.target.closest('#container li');
    if (li && e.target.matches(':focus-visible')) lightTo(li); else lightOff();
});
window.addEventListener('resize', function () {
    var a = light.tile && light.tile.querySelector('a');
    if (!a || light.mode !== 'on') return;
    cancelAnimationFrame(light.raf); light.raf = 0; light.clip = null;
    lightPaint(lightFrame(a));
    lightInverted();
});

// ── Line pointer ──────────────────────────────────────────────────
// The vertical line replaces the dot: height of the row under the pointer (heading, nav chip),
// in the section outside heading and tile its height at 33 % opacity. On tiles the tile draws it itself.
var cursor = { el: null, secEl: null, x: 0, y: 0, dest: null, raf: 0, on: false };

function cursorTarget(t) {
    if (!t || !t.closest || document.body.classList.contains('edit-mode') || document.body.classList.contains('keyboard')) return null;   // keyboard: a resting pointer does not count
    var z = { sec: t.closest('#container section'), fixed: null, hide: false, head: !!t.closest('#container .name') };
    // locked: on nav chips and outside the clicked section the normal dot pointer, until the mouse moves
    if (lock.sec && (t.closest('a.secname') || z.sec !== lock.sec)) return { sec: null, fixed: null, hide: false, head: false, std: true };
    // Entry of the sections list: the same chevron as on the nav chip (direction of the click), without line
    var entry = t.closest('#jumper-pop a');
    if (entry) return { sec: null, fixed: null, hide: false, head: false, chip: entry, list: true };
    if (t.closest('li a')) { z.hide = true; z.sec = null; }   // tile: only its own line
    else {
        // Tile edge (no background detected) or nav chip: line at the height of the row
        var el = t.closest('#container li') || t.closest('a.secname');
        if (el) { z.fixed = el; z.sec = null; z.chip = el.matches('a.secname') ? el : null; }
    }
    return z.sec || z.fixed || z.hide ? z : null;
}

// Direction in which a click on the nav chip scrolls (null: the section is already at the top)
function chipDirection(chip) {
    var sec = chip && document.querySelector(chip.getAttribute('href'));
    if (!sec) return null;
    var d = sec.getBoundingClientRect().top - document.getElementById('container').getBoundingClientRect().top;
    return d < -2 ? 'up' : d > 2 ? 'down' : null;
}

function cursorSet() {
    cursor.raf = 0;
    var s = cursor.el, b = cursor.secEl, z = cursor.dest;
    if (!z) {
        s.style.opacity = '0';
        document.documentElement.removeAttribute('data-arrow');
        if (b) b.style.opacity = '0';
        document.documentElement.classList.remove('cursor-on');
        return;
    }
    document.documentElement.classList.add('cursor-on');
    // in the section (not on chip or tile) the small square shows the pointer position, also in the heading that is at the very top
    var headerAtTop = z.head && z.sec && Math.abs(z.sec.getBoundingClientRect().top - document.getElementById('container').getBoundingClientRect().top) <= 2;
    document.documentElement.classList.toggle('cursor-dot', !!z.sec && (!z.head || headerAtTop));
    // in the heading a chevron pointing up shows the pointer position, on a nav chip up or down, where the click scrolls
    var direction = z.head ? (headerAtTop ? null : 'up') : chipDirection(z.chip);
    // normal dot pointer: during the lock, and in the list if the section is already at the top (no chevron)
    document.documentElement.classList.toggle('cursor-std', !!z.std || (!!z.list && !direction));
    if (direction) document.documentElement.setAttribute('data-arrow', direction);
    else document.documentElement.removeAttribute('data-arrow');
    // row under the pointer (tile edge, nav chip): fixed line at full opacity
    if (z.fixed && !(z.chip && direction)) {
        var r = z.fixed.getBoundingClientRect();
        s.style.left = cursor.x + 'px';
        s.style.top = r.top + 'px';
        s.style.height = r.height + 'px';
        s.style.opacity = '1';
    } else s.style.opacity = '0';
    // whole section (background, heading, behind the tiles): in the content, faint, scrolls with it
    if (b) {
        if (z.sec && (!z.head || headerAtTop)) {   // in the heading only the chevron, no line; in the topmost (active) heading dot and line
            var c = document.getElementById('container'), cr = c.getBoundingClientRect(), sr = z.sec.getBoundingClientRect();
            var upper = Math.max(sr.top, cr.top), lower = Math.min(sr.bottom, cr.bottom);
            b.style.left = (cursor.x - cr.left + c.scrollLeft) + 'px';
            b.style.top = (upper - cr.top + c.scrollTop) + 'px';
            b.style.height = Math.max(0, lower - upper) + 'px';
            b.style.opacity = String(measures['cursor-line-faint']);
        } else b.style.opacity = '0';
    }
}

// The section line lies in the content under tiles and light (first child)
function cursorSecInit() {
    var c = document.getElementById('container');
    cursor.secEl = document.createElement('div');
    cursor.secEl.id = 'cursor-sec';
    cursor.secEl.setAttribute('aria-hidden', 'true');
    c.insertBefore(cursor.secEl, c.firstChild);
}

function cursorPlan(e) {
    if (e) { cursor.x = e.clientX; cursor.y = e.clientY; cursor.dest = cursorTarget(e.target); }
    else cursor.dest = cursorTarget(document.elementFromPoint(cursor.x, cursor.y));
    if (!cursor.raf) cursor.raf = requestAnimationFrame(cursorSet);
}

(function () {
    if (!matchMedia('(hover: hover)').matches) return;
    cursor.el = document.createElement('div');
    cursor.el.id = 'cursor';
    cursor.el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cursor.el);
    document.addEventListener('mousemove', cursorPlan, { passive: true });
    document.addEventListener('mouseover', cursorPlan, { passive: true });
    document.documentElement.addEventListener('mouseleave', function () {
        cursor.dest = null;
        if (!cursor.raf) cursor.raf = requestAnimationFrame(cursorSet);
    });
    document.addEventListener('scroll', function () { if (cursor.dest) cursorPlan(); }, true);
})();

// Sections occupy a whole multiple of a quarter of the content height
var gridBase = 0;

function gridInit(onlyOnChange) {
    var container = document.getElementById('container');
    if (!container) return;
    var sections = container.querySelectorAll('section');

    var on = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--grid'), 10);

    // no grid (desktop) or edit mode: release set heights and leave
    if (!on || document.body.classList.contains('edit-mode')) {
        sections.forEach(function (s) { s.style.minHeight = ''; });
        gridBase = 0;
        return;
    }

    // free space at the bottom must match the bar height exactly
    var bar = document.querySelector('.title');
    if (bar && getComputedStyle(bar).position === 'fixed') {
        container.style.paddingBottom =
            Math.ceil(bar.getBoundingClientRect().height) + 'px';
    } else {
        container.style.paddingBottom = '';
    }

    var cs = getComputedStyle(container);
    var inner = container.clientHeight
        - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (!(inner > 0)) return;

    // threshold against Safari's bar animation, which fires resize at a 17 ms rhythm
    if (onlyOnChange && Math.abs(inner - gridBase) < 8) return;
    gridBase = inner;

    // the section that is at the top right now, back there after the rebuild
    var upperEdge = container.getBoundingClientRect().top;
    var upper = null;
    sections.forEach(function (s) {
        if (!upper && s.getBoundingClientRect().bottom - upperEdge > 1) upper = s;
    });

    var quarter = inner / on;
    sections.forEach(function (s) { s.style.minHeight = ''; });

    // measure everything first, then set everything
    var places = [];
    sections.forEach(function (s) {
        // 1 px tolerance, otherwise an exactly fitting section rounds up to two
        places.push(Math.max(1, Math.ceil((s.getBoundingClientRect().height - 1) / quarter)));
    });
    sections.forEach(function (s, i) {
        s.style.minHeight = (places[i] * quarter) + 'px';
    });

    if (upper) {
        var smooth = container.style.scrollBehavior;
        container.style.scrollBehavior = 'auto';
        container.scrollTop += upper.getBoundingClientRect().top - upperEdge;
        container.style.scrollBehavior = smooth;
    }
}

// re-grid only after stillness, not at every intermediate step
var gridTimer = null;

window.addEventListener('resize', function () {
    clearTimeout(gridTimer);
    gridTimer = setTimeout(function () { gridInit(true); }, 250);
});

// the icon font from the CDN changes the header height after loading
if (document.fonts) document.fonts.ready.then(function () { gridInit(); });

// focus the content after a jump, otherwise the arrow keys go nowhere
function focusContent(sec) {
    var c = document.getElementById('container');

    // target is the section that was jumped to
    var fixed = sec && sec.nodeType === 1 ? sec : null;

    // determine the target anew on every attempt — on click the hash is still old
    var assign = function () {
        var dest = fixed;
        if (!dest && location.hash.length > 1) {
            var el = document.getElementById(location.hash.slice(1));
            dest = el && el.closest('section');
        }
        // follow immediately, otherwise two areas glow until scrolling is still
        if (dest) {
            document.querySelectorAll('#container section.current')
                .forEach(function (s) { s.classList.remove('current'); });
            dest.classList.add('current');
            ghostHeaderJump(dest);
        }
        (dest || c).focus({ preventScroll: true });
    };

    // three times, because each point in time is unreliable on its own
    assign();
    if (document.readyState === 'complete') requestAnimationFrame(assign);
    else window.addEventListener('load', assign, { once: true });
    setTimeout(assign, 250);
}

// hashchange fires after the jump mark — the focus sits there reliably
window.addEventListener('hashchange', function () { focusContent(); });

// arrow keys add up to one target instead of waiting for the animation
var jumpTarget = null;

function jumpBy(delta, wrap) {
    var sections = document.querySelectorAll('#container section');
    if (!sections.length) return;
    var base = jumpTarget;
    // mouse moved since the last key press: start from the section under the mouse
    var underMouse = mouseMoved ? mouseSection() : null;
    mouseMoved = false;
    if (underMouse) {
        base = Array.prototype.indexOf.call(sections, underMouse);
    } else if (base === null) {
        var activeEl = document.querySelector('#container section h3.name.active');
        base = 0;
        sections.forEach(function (s, i) { if (activeEl && s.contains(activeEl)) base = i; });
    }
    // Smartphone: from page to page (a pair of half-height sections is one page)
    if (isPhone() && glow.pageIdx && !document.body.classList.contains('edit-mode')) {
        var pages = glow.pageIdx, cur = 0;
        pages.forEach(function (p, k) { if (p.indexOf(base) >= 0) cur = k; });
        var next = wrap ? ((cur + delta) % pages.length + pages.length) % pages.length : Math.max(0, Math.min(pages.length - 1, cur + delta));
        jumpTarget = pages[next][0];
        sections[jumpTarget].scrollIntoView();
        focusContent(sections[jumpTarget]);
        return;
    }
    var dest = base + delta;
    jumpTarget = wrap
        // from the last to the first and back
        ? (dest % sections.length + sections.length) % sections.length
        : Math.max(0, Math.min(sections.length - 1, dest));
    sections[jumpTarget].scrollIntoView();
    focusContent(sections[jumpTarget]);
}

// Arrow left/right: from tile to tile, across section boundaries.
// Starting point: the tile last touched with the mouse if the mouse has moved since the
// last key press; otherwise the focused one; otherwise the first of the section
var mouseTile = null;
var mouseMoved = false;

var mousePoint = null;   // last mouse position in the window

function mouseSection() {
    var el = mousePoint && document.elementFromPoint(mousePoint.x, mousePoint.y);
    return el && el.closest ? el.closest('#container section') : null;
}

// first tile of a section, for arrow left (delta < 0) the last
function tileIn(section, delta) {
    var k = section.querySelectorAll('li a');
    return k.length ? k[delta < 0 ? k.length - 1 : 0] : null;
}

function linkBy(delta) {
    var links = Array.prototype.slice.call(document.querySelectorAll('#container li a'));
    if (!links.length) return;
    var i = -1, dest = null;
    if (mouseMoved) {
        var el = mousePoint && document.elementFromPoint(mousePoint.x, mousePoint.y);
        var tile = el && el.closest && el.closest('#container li a');
        if (tile) i = links.indexOf(tile);
        else {
            // mouse in a section but not on a tile: its first tile
            var below = mouseSection();
            dest = below && tileIn(below, delta);
        }
    }
    if (i === -1 && !dest) i = links.indexOf(document.activeElement);
    mouseMoved = false;
    if (dest) {
        // starting point was the section under the mouse
    } else if (i === -1) {
        var sec = document.querySelector('#container section.current') ||
            document.querySelector('#container section');
        // left: the last tile of the section, right: the first
        dest = tileIn(sec, delta) || links[0];
    } else {
        dest = links[Math.max(0, Math.min(links.length - 1, i + delta))];
    }
    dest.focus();
}

// Arrow keys: also without focus in the content (e.g. after a click in the bar) —
// in edit mode and in input fields they belong to the text cursor
document.addEventListener('keydown', function (e) {
    if (document.body.classList.contains('edit-mode')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    // Content, chips and gear of the bar; the dropdown (button) keeps its arrow keys
    if (t !== document.body && !(t.closest && t.closest('#container, .title a, .title button'))) return;
    if (t.closest && t.closest('#section-jumper')) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); jumpBy(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); jumpBy(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); linkBy(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); linkBy(-1); }
});

// Jump keys of the bottom bar
['step-prev', 'step-next'].forEach(function (id, i) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', function (e) {
        e.preventDefault();
        jumpBy(i ? 1 : -1, true);
    });
});

// Addresses that never count as unreachable (even if the data marks them): centrally in never-dead.json
// (allIpAddresses: every IP address; hosts: host names). edit/check.php reads the same file.
var neverDead = { allIpAddresses: true, hosts: [] };

function isNeverDead(url) {
    var h;
    try { h = new URL(url).hostname; } catch (e) { return false; }
    if (neverDead.allIpAddresses && (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.charAt(0) === '[')) return true;
    return neverDead.hosts.indexOf(h.toLowerCase()) >= 0;
}

function makeLi(name, url, dead) {
    var li = document.createElement('li');
    if (dead && !isNeverDead(url)) li.classList.add('dead');   // unreachable at the last test
    var a = document.createElement('a');
    a.tabIndex = 0;
    a.href = url;
    a.textContent = name;
    li.appendChild(a);
    return li;
}

// ── Starting point for the arrow keys (linkBy): the tile under the mouse ──
function setMouseTile(e) {
    var a = e.target.closest('li a');
    if (a) mouseTile = a;
}
document.getElementById('container').addEventListener('mouseover', setMouseTile);
document.getElementById('container').addEventListener('mousemove', setMouseTile);

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
        // Text mode: the word "text"; icon mode: squircle like APP
        squircle: true,
        get: function () { return getPref('navMode'); },
        set: function (w) { setPref('navMode', w); }
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
        ic.className = 'set-icon set-letter set-text';
        ic.textContent = (e.descr && e.descr(w)) || (e.text && e.text[w]) || valueName(e, w);
    } else if (e.circle) {
        ic.className = 'set-icon set-circle';
        ic.textContent = '';
        ic.style.setProperty('--k', sectionColor(6, e.circle[w]));
    } else if (e.squircle) {
        ic.className = 'set-icon icon-squircle';
        ic.textContent = '';
    } else if (e.tiles) {
        ic.className = 'set-icon set-tiles' + (e.tiles[w] ? ' square' : '');
        ic.textContent = '';
        for (var k = 0; k < 4; k++) ic.appendChild(document.createElement('i'));
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

// APP belongs as the 3rd section in the row; if it is missing in the saved data, it is added empty
function withApp(data) {
    var app = data.filter(function (s) { return s.id === 'app'; })[0];
    if (!app) {
        data.splice(2, 0, { id: 'app', title: 'app', icon: 'icon-squircle', links: [] });
    } else if (app.title === 'APP') {
        app.title = 'app';   // lowercase like the others; CSS makes the capitals
    }
    if (app && app.icon === 'fa-mobile-screen') {
        app.icon = 'icon-squircle';   // replace previously saved phone icon
    }
    return data;
}

// ── Load ──────────────────────────────────────────────────────────
// Exceptions first (if the file is missing, only the defaults apply), then the links
fetch('never-dead.json')
    .then(function (r) { return r.json(); })
    .then(function (d) {
        if (typeof d.allIpAddresses === 'boolean') neverDead.allIpAddresses = d.allIpAddresses;
        if (Array.isArray(d.hosts)) neverDead.hosts = d.hosts.map(function (x) { return String(x).toLowerCase(); });
    })
    .catch(function () { })
    .then(function () { return fetch('links.php?t=' + Date.now()); })
    .then(function (r) { return r.json(); })
    .then(withApp)
    .then(render)
    .catch(function (e) {
        document.getElementById('container').innerHTML =
            '<p style="color:red;padding:20px">links.json load error: ' + e + '</p>';
    });

// ── Edit Mode ─────────────────────────────────────────────────────

function preventEnter(e) { if (e.key === 'Enter') e.preventDefault(); }

// Deleting can be undone until saving
function makeDelButton(li) {
    var del = document.createElement('span');
    del.className = 'btn-del';
    del.textContent = '×';
    del.title = 'Delete';
    del.addEventListener('click', function () {
        var removed = li.classList.toggle('removed');
        del.textContent = removed ? '↺' : '×';
        del.title = removed ? 'Restore' : 'Delete';
    });
    return del;
}

// save.php answers GET with 405 without touching anything; 401 comes from the server in front
function canSave() {
    return fetch('edit/save.php')
        .then(function (r) { return r.status !== 401; })
        .catch(function () { return false; });   // when in doubt release nothing
}

// Without sign-in (401 from the server) nothing happens — edit mode stays closed
function enterEditMode() {
    canSave().then(function (may) {
        if (!may) return;
        document.body.classList.add('edit-mode');
        gridInit();   // release set grid heights, otherwise they beat the edit rules
        releaseLinks();
        settingsDisplay();
    });
}

function releaseLinks() {
    document.querySelectorAll('ul.group li:not(.btn-add)').forEach(function (li) {
        if (li.querySelector('a') && !li.querySelector('.edit-url')) createFields(li);
    });

    if (makeDraggable()) sectionsSortable();
    document.querySelectorAll('ul.group').forEach(function (ul) {
        if (makeDraggable()) sortable(ul);
        if (ul.querySelector('.btn-add')) return;
        var add = document.createElement('li');
        add.className = 'btn-add';
        add.textContent = '+';
        add.title = 'Add link';
        add.addEventListener('click', function () { addLink(ul, add); });
        ul.appendChild(add);
    });
}

// make name and URL editable, attach handle and delete button
function createFields(li) {
    var a = li.querySelector('a');
    a.contentEditable = 'true';
    a.addEventListener('keydown', preventEnter);

    var urlField = document.createElement('span');
    urlField.className = 'edit-url';
    urlField.contentEditable = 'true';
    urlField.textContent = a.getAttribute('href');
    urlField.addEventListener('keydown', preventEnter);
    li.appendChild(urlField);

    li.appendChild(makeDelButton(li));
    if (makeDraggable()) li.insertBefore(makeMoveHandle(li), a);
}

function addLink(ul, addBtn) {
    var li = makeLi('New link', 'https://');
    createFields(li);
    ul.insertBefore(li, addBtn);
    li.querySelector('a').focus();
}

// ── Sorting ───────────────────────────────────────────────────────

// Dragging needs a mouse; with a finger the handle would be ineffective
function makeDraggable() { return matchMedia('(pointer: fine)').matches; }

var dragged = null;      // tile that is being dragged
var prepared = null;  // tile whose handle is pressed
var startPlace = null;   // neighbor at the start of the drag, for the return on abort
var startList = null;   // list at the start of the drag: a tile may move into any section

// a click without a drag must fix the tile in place again
document.addEventListener('mouseup', function () {
    if (prepared) {
        prepared.draggable = false;
        prepared.classList.remove('grabbed');
        prepared = null;
    }
});

// outside any list: the tile returns to the start and shows the abort —
// what you see is always the result of the release
document.addEventListener('dragover', function (e) {
    if (!dragged) return;
    var inside = !!(e.target.closest && e.target.closest('ul.group'));
    dragged.classList.toggle('cancel', !inside);
    if (!inside && (dragged.parentNode !== startList || dragged.nextSibling !== startPlace)) {
        startList.insertBefore(dragged, startPlace);
    }
});

// set draggable only on the handle, otherwise every text selection drags the tile along
function makeMoveHandle(li) {
    var handle = document.createElement('span');
    handle.className = 'btn-move';
    handle.textContent = '⠿';
    handle.title = 'Move';
    handle.addEventListener('mousedown', function () {
        li.draggable = true;
        // now, because the drag image is a snapshot of the tile
        // at the start of the drag — only then would the background not be on it
        li.classList.add('grabbed');
        prepared = li;
    });

    li.addEventListener('dragstart', function (e) {
        dragged = li;
        startPlace = li.nextSibling;
        startList = li.parentNode;
        // only after the snapshot of the drag image, otherwise the flying
        // image carries the target highlight too
        setTimeout(function () { if (dragged === li) li.classList.add('dragging'); });
        e.dataTransfer.effectAllowed = 'move';
        // Firefox does not start a drag at all without data set
        e.dataTransfer.setData('text/plain', '');
    });
    li.addEventListener('dragend', function () {
        // release off target, without the abort handler firing any more
        if (li.classList.contains('cancel') &&
            (li.parentNode !== startList || li.nextSibling !== startPlace)) {
            startList.insertBefore(li, startPlace);
        }
        li.classList.remove('dragging', 'cancel', 'grabbed');
        li.draggable = false;
        dragged = null;
        prepared = null;
        startPlace = null;
        startList = null;
    });
    return handle;
}

function sortable(ul) {
    if (ul.dataset.sortable) return;
    ul.dataset.sortable = '1';

    ul.addEventListener('dragover', function (e) {
        if (!dragged) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        // The target is the whole tile under the pointer, no gap arithmetic:
        // it gives up its place, the drag direction decides the side.
        // Over gaps (also the own tile) the preview stays.
        var dest = e.target.closest ? e.target.closest('li') : null;
        if (!dest || dest === dragged || dest.parentNode !== ul) return;   // gaps: preview stays
        var before = dest.classList.contains('btn-add') ? dest
            // target lies before the dragged tile → before it, otherwise after it
            : (dest.compareDocumentPosition(dragged) & Node.DOCUMENT_POSITION_FOLLOWING)
                ? dest : dest.nextSibling;
        if (before !== dragged && before !== dragged.nextSibling) ul.insertBefore(dragged, before);
    });

    // the tile is already at the target; preventDefault only keeps the browser
    // from putting the drag text into the contentEditable underneath
    ul.addEventListener('drop', function (e) { e.preventDefault(); });
}

// Re-sort sections among each other (as in the view: vertically): handle on the heading, dragging over another section
// moves the dragged one before or after it, depending on the half of the pointer. The order in the DOM is saved (collectData).
var draggedSection = null;

function sectionsSortable() {
    var c = document.getElementById('container');
    if (c.dataset.secSortable) return;
    c.dataset.secSortable = '1';
    c.querySelectorAll('section').forEach(function (sec) {
        var h3 = sec.querySelector('h3.name');
        if (!h3) return;
        var handle = document.createElement('span');
        handle.className = 'sec-handle';
        handle.textContent = '⠿';
        handle.title = 'Move section';
        h3.insertBefore(handle, h3.firstChild);
        // only with the handle the section becomes draggable, otherwise every click in the content would drag it along
        handle.addEventListener('mousedown', function () { sec.draggable = true; });
        sec.addEventListener('dragstart', function (e) {
            if (e.target !== sec) return;   // tile drags only rise here
            draggedSection = sec;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', '');   // Firefox does not start a drag otherwise
            e.dataTransfer.setDragImage(h3, 16, 16);   // only the heading flies along, not the whole section
            setTimeout(function () { if (draggedSection === sec) sec.classList.add('sec-dragging'); });
        });
        sec.addEventListener('dragend', function (e) {
            if (e.target !== sec) return;
            sec.draggable = false;
            sec.classList.remove('sec-dragging');
            draggedSection = null;
        });
    });
    c.addEventListener('dragover', function (e) {
        if (!draggedSection) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        var dest = e.target.closest && e.target.closest('#container section');
        if (!dest || dest === draggedSection) return;
        var r = dest.getBoundingClientRect();
        var before = e.clientY < r.top + r.height / 2 ? dest : dest.nextElementSibling;
        if (before !== draggedSection && before !== draggedSection.nextElementSibling) c.insertBefore(draggedSection, before);
    });
    c.addEventListener('drop', function (e) { if (draggedSection) e.preventDefault(); });
}

// ── Collect & Save ────────────────────────────────────────────────
function collectData() {
    var data = [];
    document.querySelectorAll('section').forEach(function (section) {
        var h3 = section.querySelector('h3.name');
        var ul = section.querySelector('ul.group');
        if (!h3 || !ul) return;

        var links = [];
        ul.querySelectorAll('li:not(.btn-add):not(.removed)').forEach(function (li) {
            var a = li.querySelector('a');
            var urlField = li.querySelector('.edit-url');
            if (!a) return;
            var name = a.textContent.trim();
            var url = urlField ? urlField.textContent.trim() : a.getAttribute('href');
            if (!name || !url) return;
            var entry = { name: name, url: url };
            // write the dead mark along; a changed URL clears it
            if (li.classList.contains('dead') && url === li.dataset.url0) entry.dead = true;
            links.push(entry);
        });

        if (!links.length) return;

        var sec = {
            id: h3.id,
            title: (h3.querySelector('a') || {}).textContent || h3.id
        };
        if (h3.dataset.icon) sec.icon = h3.dataset.icon;
        sec.color = h3.dataset.color || 'cyan';
        sec.links = links;
        data.push(sec);
    });
    return data;
}

// Comparison against the original values stamped during rendering
function changes() {
    var deleted = [], modified = [], moved = [], fresh = 0;
    document.querySelectorAll('ul.group li:not(.btn-add)').forEach(function (li) {
        var a = li.querySelector('a');
        if (!a) return;
        if (li.dataset.url0 === undefined) { fresh++; return; }
        var urlFieldEl = li.querySelector('.edit-url');
        var name = a.textContent.trim();
        var url = urlFieldEl ? urlFieldEl.textContent.trim() : a.getAttribute('href');

        if (li.classList.contains('removed')) {
            deleted.push('· ' + li.dataset.name0 + '  ' + li.dataset.url0);
        } else if (name !== li.dataset.name0 || url !== li.dataset.url0) {
            modified.push('· ' + li.dataset.name0 + '  ' + li.dataset.url0 +
                '\n  → ' + name + '  ' + url);
        }
    });

    // Reordered means: the starting positions no longer rise
    document.querySelectorAll('#container section').forEach(function (section) {
        var ul = section.querySelector('ul.group');
        if (!ul) return;
        var secId = (section.querySelector('h3.name') || {}).id;
        var last = -1, reordered = false;
        ul.querySelectorAll('li:not(.btn-add):not(.removed)').forEach(function (li) {
            if (li.dataset.pos0 === undefined) return;   // new, has no starting position
            if (li.dataset.sec0 !== secId) reordered = true;   // dragged over from another section
            var pos = +li.dataset.pos0;
            if (pos < last) reordered = true;
            last = pos;
        });
        var heading = section.querySelector('h3.name a');
        if (reordered) moved.push('· ' + (heading ? heading.textContent : ''));
    });

    // Order of the sections themselves: the starting positions no longer rise
    var lastSec = -1, secReordered = false;
    document.querySelectorAll('#container section').forEach(function (section) {
        if (section.dataset.pos0 === undefined) return;
        if (+section.dataset.pos0 < lastSec) secReordered = true;
        lastSec = +section.dataset.pos0;
    });
    if (secReordered) moved.push('· Order of sections');

    return { deleted: deleted, modified: modified, moved: moved, fresh: fresh };
}

// Text of the changes for the confirmation; empty if there is nothing to save
function changesText() {
    var d = changes();
    if (!d.modified.length && !d.deleted.length && !d.moved.length) {
        return d.fresh ? 'Save new entries?' : '';
    }
    var text = 'Save changes?\n';
    if (d.modified.length) {
        text += '\nChanged (' + d.modified.length + '):\n' + d.modified.join('\n') + '\n';
    }
    if (d.moved.length) {
        text += '\nOrder changed (' + d.moved.length + '):\n' +
            d.moved.join('\n') + '\n';
    }
    if (d.deleted.length) {
        text += '\nDeleted (' + d.deleted.length + '):\n' + d.deleted.join('\n') + '\n';
    }
    return text;
}

// Finish editing: nothing changed → simply close; otherwise ask whether to save,
// on "No" whether to discard; on another "No" edit mode stays open
function finishEditing() {
    var text = changesText();
    if (!text) { location.reload(); return; }
    if (confirm(text)) save();
    else if (confirm('Discard changes?')) location.reload();
}

function save() {
    var json = JSON.stringify(collectData(), null, 2);
    fetch('edit/save.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: json
    })
    .then(function (r) {
        if (r.status === 401) {
            throw new Error('Not signed in — open /edit/ once directly in the browser and sign in.');
        }
        if (!r.ok) throw new Error('HTTP ' + r.status);
        document.querySelector('.titledomain').textContent = '✓';
        setTimeout(function () { location.reload(); }, 800);
    })
    .catch(function (err) { alert('Error: ' + err.message); });
}
