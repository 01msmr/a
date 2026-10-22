// Owns: the section strip in the bottom bar of narrow touch devices (aiming like msmr.dev: numbers beside a window that shows the title)
// Defines globals: stripDrag, stripSections, stripWidths, stripVis, stripUnders, stripWinW, stripMode, STRIP_MS, STRIP_EASE, STRIP_REACH, STRIP_UNDER_ICON, STRIP_SUCK_MS, STRIP_SUCK_EASE, stripSlots, stripReach, stripSuckFrom, stripPushTo, stripAimF, stripWinAt, stripItems, stripItemW, stripOn, stripShow, stripMeasure, stripSuck, stripPlace, stripLefts, stripFollow, stripSync, stripChoose, buildStrip
// Uses: state, render
// Pressing the strip aims from the active item; the finger moves f (a fraction of the item index) one to one. The numbers follow the finger and hold at the window's edge;
// when the number is a fixed depth under the edge (half the width of a "0"; in icon mode a quarter of the icon), it steps into the window as its title and the outgoing title steps out as a number at the same depth, at that very moment.
// on: the strip is pressed (aiming); idx: item in the window; f0/f: aim at the start / now; x0: finger start; touched: item under the finger; end: time of the last release
var stripDrag = { on: false, idx: -1, suck: null, f: 0, f0: 0, x0: 0, pid: null, dragged: false, touched: null, end: -1e9 };
var stripSections = [];
var stripWidths = [];   // window width per item (its title, or the icon)
var stripVis = [];      // visible width per item (its number or icon, without the invisible padding of the item)
var stripUnders = [];   // per item: how far its number may be under the window's edge before it steps in: half the width of a "0" in the strip's font (text) or a quarter of the icon's width (icons)
var stripWinW = 0;      // width of the window now
var stripMode = null;   // watches the Navigation setting (class nav-icons on the body)
// At rest the numbers show up to three whole items beyond the window's edge, fewer where the strip is narrow (half an item of whitespace stays at its edge); they are cut off there,
// glide in and out through that edge while the strip moves, and all show while aiming (CSS: .is-aiming)
var STRIP_REACH = 3;   // most items beyond the window's edge at rest
var STRIP_MS = 450, STRIP_EASE = 'cubic-bezier(.33,1,.68,1)';   // the pace of msmr.dev's narrow nav (--nav-t, --nav-ease)
var STRIP_UNDER_ICON = 0.25;   // icon mode: the depth under the window's edge is this fraction of the icon's width
var STRIP_SUCK_MS = 150, STRIP_SUCK_EASE = 'cubic-bezier(.5,0,1,1)';   // a number stepping into the window is sucked in: ease-in, short enough to keep up with a finger

// Centre of every item relative to the strip centre for the aim f. The item nearest to f (k) stands in the window; the others follow the finger one to one and hold
// at the window's edge, their visible part (vis, default: the item's width) the fixed depth `under` under it, until they step in; the outgoing item appears at the same
// depth. under is one length for all or one per item. Items are gap wide. msmr.dev has the same rule
function stripSlots(f, count, winW, gap, vis, under) {
    var k = count ? Math.max(0, Math.min(count - 1, Math.round(f))) : 0, x = [];
    for (var j = 0; j < count; j++) {
        var d = j - f, s = Math.sign(d), v = (vis && vis[j]) || gap;
        x.push(j === k ? 0 : s * (winW / 2 + v / 2 - ((Array.isArray(under) ? under[j] : under) || 0)) + (d - s / 2) * gap);
    }
    return { k: k, x: x };
}

// How far from the strip centre the numbers show at rest: the whole items (up to STRIP_REACH) that fit beyond the window with half an item of whitespace left at the strip's edge (half: its half width), and a quarter more so that the cut falls in the gap
function stripReach(winW, gap, half) {
    var n = Math.max(0, Math.min(STRIP_REACH, Math.floor((half - winW / 2 - gap / 2) / gap)));
    return winW / 2 + (n + 0.25) * gap;
}

// Where the incoming title starts, relative to the window centre: fully outside the edge its number was at (dir 1: from the right, -1: from the left)
function stripSuckFrom(dir, winW, titleW) { return dir * (winW / 2 + titleW / 2); }

// Where the outgoing title ends, relative to the window centre: fully outside the edge opposite to the one the incoming title comes from
function stripPushTo(dir, winW, titleW) { return -stripSuckFrom(dir, winW, titleW); }

// The aim for a finger that moved dx (px) since it was pressed on item f0
function stripAimF(f0, dx, gap, count) { return Math.max(0, Math.min(count - 1, f0 - dx / gap)); }

// The window follows its content: from the width of its title, growing to the wider of the two titles at the step between two items, then on to the other title,
// so it is never narrower than the title it shows (nothing is cut off) and never jumps
function stripWinAt(f, widths) {
    var n = widths.length;
    if (!n) return 0;
    var g = Math.max(0, Math.min(n - 1, f)), a = Math.floor(g), b = Math.min(n - 1, a + 1), t = g - a, m = Math.max(widths[a], widths[b]);
    return t < 0.5 ? widths[a] + (m - widths[a]) * 2 * t : m + (widths[b] - m) * (2 * t - 1);
}

function stripItems() { return Array.prototype.slice.call(document.querySelectorAll('#strip .strip-item')); }

function stripItemW() {
    var a = document.querySelector('#strip .strip-item');
    return a ? a.getBoundingClientRect().width : 0;
}

// The strip is only visible on narrow touch devices (media query in styles.css)
function stripOn() {
    var s = document.getElementById('strip');
    return !!(s && s.offsetWidth);
}

// Window: title (text mode) or icon (icon mode) and color of item i; that item counts as active
function stripShow(i) {
    var sec = stripSections[i];
    if (!sec) return;
    var old = stripDrag.idx, items = stripItems();
    if (old >= 0 && old !== i && stripItemW()) {   // played by stripPlace: what is in the window now leaves, the new one enters
        var wn = document.getElementById('strip-window');
        stripDrag.suck = { old: old, dir: i > old ? 1 : -1, left: parseFloat(items[old].style.left) || 0, winW: stripWinW,
            title: wn.querySelector('.strip-title').textContent, icon: wn.querySelector('.secicon').className };
    }
    stripItems().forEach(function (a, k) {
        a.classList.toggle('active', k === i);
        if (k === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    var win = document.getElementById('strip-window');
    win.querySelector('.strip-title').textContent = sec.title;
    win.querySelector('.secicon').className = makeIcon(sec.icon).className;
    win.style.setProperty('--c', sectionColor(i));
    stripDrag.idx = i;
}

// Window width per item: its title (the icon only in icon mode), at most the width of the strip; visible width per item: its number or icon.
// Measured again when the size or the mode changes
function stripMeasure() {
    var strip = document.getElementById('strip'), win = document.getElementById('strip-window'), itemW = stripItemW();
    if (!strip || !itemW) return;
    var title = win.querySelector('.strip-title'), keep = title.textContent, max = Math.max(itemW, strip.clientWidth);
    var icons = document.body.classList.contains('nav-icons'), cs = getComputedStyle(win), pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    var keepW = win.style.width;
    win.style.transition = 'none'; win.style.width = 'auto';   // natural width: a narrow window would squeeze the title
    stripWidths = stripSections.map(function (sec) {
        if (icons) return itemW;
        title.textContent = sec.title;
        return Math.min(max, Math.max(itemW, title.offsetWidth + pad));
    });
    title.textContent = keep; win.style.width = keepW;
    void win.offsetWidth;
    win.style.transition = '';
    var zero = document.createElement('span');   // half the width of a "0" in the strip's font is the depth in text mode
    zero.textContent = '0'; zero.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap';
    strip.appendChild(zero);
    var halfZero = zero.getBoundingClientRect().width / 2;
    zero.remove();
    stripVis = stripItems().map(function (a) {
        var v = a.querySelector(icons ? '.secicon' : '.strip-no');
        return (v && v.getBoundingClientRect().width) || itemW;
    });
    stripUnders = stripVis.map(function (v) { return icons ? v * STRIP_UNDER_ICON : halfZero; });
    stripPlace(stripDrag.on ? stripDrag.f : Math.max(stripDrag.idx, 0), stripDrag.on);   // a resize while the finger is down keeps the aim
}

// The step into the window, "sucked in": it starts slowly and speeds up (ease-in, STRIP_SUCK_MS). The new title enters from the edge its number was at, the outgoing
// item slides from the window's middle to its place beside the window (from under the window). The other items are not touched: while the finger moves they follow it
function stripSuck() {
    var su = stripDrag.suck;
    stripDrag.suck = null;
    if (!su) return;
    var out = stripItems()[su.old], dx = out ? su.left - (parseFloat(out.style.left) || 0) : 0, opt = { duration: STRIP_SUCK_MS, easing: STRIP_SUCK_EASE };
    if (out && out.animate && Math.abs(dx) > 0.5) out.animate([{ transform: 'translateX(' + dx + 'px)' }, { transform: 'translateX(0px)' }], Object.assign({ composite: 'add' }, opt));
    var win = document.getElementById('strip-window');
    [win.querySelector('.strip-title'), win.querySelector('.secicon')].forEach(function (el) {
        if (el.animate && el.offsetWidth) el.animate([{ translate: stripSuckFrom(su.dir, stripWinW, el.offsetWidth) + 'px 0' }, { translate: '0px 0' }], opt);
    });
    // the old title (or icon) is pushed out on the opposite side in the same motion, the window clips it: always one in the window at the end
    var ghost = document.createElement('div'), t = document.createElement('span'), ic = document.createElement('i');
    ghost.className = 'strip-ghost'; t.className = 'strip-title'; t.textContent = su.title; ic.className = su.icon;
    ghost.appendChild(t); ghost.appendChild(ic); win.appendChild(ghost);
    if (!ghost.animate) { ghost.remove(); return; }
    var a = ghost.animate([{ translate: '0px 0' }, { translate: stripPushTo(su.dir, Math.max(su.winW, stripWinW), ghost.offsetWidth) + 'px 0' }], opt);
    a.onfinish = a.oncancel = function () { ghost.remove(); };
}

// Put the items and the window where the aim f wants them (aim: all numbers show, at rest only the nearest ones)
function stripPlace(f, aim) {
    var strip = document.getElementById('strip'), gap = stripItemW(), c = strip ? strip.clientWidth / 2 : 0, n = stripSections.length;
    if (!n || !gap || !c || stripWidths.length !== n) return;
    stripWinW = stripWinAt(f, stripWidths);
    var s = stripSlots(f, n, stripWinW, gap, stripVis, stripUnders);
    if (s.k !== stripDrag.idx) stripShow(s.k);
    document.getElementById('strip-window').style.width = stripWinW + 'px';
    stripItems().forEach(function (a, j) { a.style.left = (c + s.x[j] - gap / 2).toFixed(1) + 'px'; });
    stripSuck();
    strip.style.setProperty('--reach', stripReach(stripWinW, gap, c).toFixed(1) + 'px');   // the numbers are cut off beyond it (CSS: .strip-clip)
    strip.classList.add('ready');   // visible from the first placement on: before, the items sit at left 0 and would count as a layout shift
}

function stripLefts() { return stripItems().map(function (a) { return parseFloat(a.style.left) || 0; }); }

// After a change of the places (release, page scroll): nothing is cancelled or restarted. Every item gets one more glide for the difference between its
// old and its new place, added to whatever glide is still running, so a second change while the strip moves bends the movement instead of redirecting it.
// No fades: whatever is not meant to be seen is cut off at the clip edge (.strip-clip) while it glides
function stripFollow(before) {
    if (!stripItemW()) return;
    var opt = { duration: STRIP_MS, easing: STRIP_EASE, composite: 'add' };
    stripItems().forEach(function (a, j) {
        var dx = (before[j] || 0) - (parseFloat(a.style.left) || 0);
        if (Math.abs(dx) > 0.5 && a.animate) a.animate([{ transform: 'translateX(' + dx + 'px)' }, { transform: 'translateX(0px)' }], opt);
    });
}

// The active section changed (page scroll, tap, dropdown): the strip follows, unless the user is aiming
function stripSync(hash) {
    if (stripDrag.on) return;
    var i = stripSections.findIndex(function (s) { return '#' + s.id === hash; });
    if (i < 0 || i === stripDrag.idx) return;
    var before = stripLefts();
    stripShow(i);
    stripPlace(i, false);
    stripFollow(before);
}

// Leave aiming (or a tap/key): item j becomes active, the window shrinks to its title, the numbers glide to their places, the page scrolls to its page
function stripChoose(j, x, y) {
    var before = stripLefts(), sec = stripSections[j];
    stripDrag.on = false; stripDrag.end = performance.now();
    document.getElementById('strip').classList.remove('is-aiming');
    stripShow(j);
    stripPlace(j, false);
    stripFollow(before);
    if (sec && '#' + sec.id !== jumperValue) {
        glow.instant = true;   // the section highlight is placed on the target at once and then only travels with the page, without a glide of its own
        jumpTo('#' + sec.id);   // lockOn runs glowSync at once, which uses the flag
        glow.instant = false;   // (not used up if the section was already the highlighted one: it must not stay set)
        if (lock.sec) lock.kind = 'strip';   // js/glow.js: stays on the chosen section while the page scrolls there
    }
    if (lock.sec && x !== undefined) { lock.x = x; lock.y = y; }   // the lock sits where the finger was, like after a tap on a chip: the mouse events iOS adds after a tap must not release it
}

function buildStrip(data) {
    var old = document.getElementById('strip');
    if (old) old.remove();
    stripSections = data.slice();
    stripDrag.on = false; stripDrag.idx = -1; stripWidths = []; stripVis = []; stripWinW = 0;
    var strip = document.createElement('div'), win = document.createElement('div'), clip = document.createElement('div');
    strip.id = 'strip'; strip.className = 'strip';
    clip.className = 'strip-clip';
    strip.appendChild(clip);
    data.forEach(function (sec, idx) {
        var a = document.createElement('a'), no = document.createElement('span');
        a.className = 'strip-item'; a.href = '#' + sec.id; a.target = '_self'; setHint(a, sec.title);
        a.style.setProperty('--c', sectionColor(idx));
        no.className = 'strip-no'; no.textContent = idx + 1;
        a.appendChild(no);
        a.appendChild(makeIcon(sec.icon));
        clip.appendChild(a);
    });
    win.id = 'strip-window'; win.setAttribute('aria-hidden', 'true');
    var title = document.createElement('span');
    title.className = 'strip-title';
    win.appendChild(title);
    win.appendChild(makeIcon(''));
    strip.appendChild(win);
    document.querySelector('.title').insertBefore(strip, document.getElementById('section-nav-list'));
    stripShow(0);

    // Aiming: the finger anywhere on the strip starts from the active item; a tap on a neighbour chooses it
    strip.addEventListener('pointerdown', function (ev) {
        if (stripDrag.on || !stripOn()) return;
        stripDrag.on = true; stripDrag.dragged = false; stripDrag.pid = ev.pointerId;
        stripDrag.touched = ev.target.closest('.strip-item');
        stripDrag.f = stripDrag.f0 = Math.max(stripDrag.idx, 0); stripDrag.x0 = ev.clientX;
        try { strip.setPointerCapture(ev.pointerId); } catch (e) { }
        strip.classList.add('is-aiming');
        stripPlace(stripDrag.f, true);
    });
    strip.addEventListener('pointermove', function (ev) {
        if (!stripDrag.on || ev.pointerId !== stripDrag.pid) return;
        if (Math.abs(ev.clientX - stripDrag.x0) > 8) stripDrag.dragged = true;
        stripDrag.f = stripAimF(stripDrag.f0, ev.clientX - stripDrag.x0, stripItemW(), stripSections.length);
        stripPlace(stripDrag.f, true);
    });
    function release(cancel, x, y) {
        var d = stripDrag, items = stripItems();
        if (cancel) d.f = d.f0;
        var tapped = !d.dragged && d.touched ? items.indexOf(d.touched) : -1;
        stripChoose(tapped >= 0 ? tapped : Math.max(0, Math.min(items.length - 1, Math.round(d.f))), x, y);
    }
    strip.addEventListener('pointerup', function (ev) { if (stripDrag.on && ev.pointerId === stripDrag.pid) release(false, ev.clientX, ev.clientY); });
    strip.addEventListener('pointercancel', function (ev) { if (stripDrag.on && ev.pointerId === stripDrag.pid) release(true, ev.clientX, ev.clientY); });
    strip.addEventListener('contextmenu', function (e) { e.preventDefault(); });   // no long-press menu on the links
    strip.addEventListener('click', function (e) {   // the choice was made on release; a click only comes from the keyboard
        var a = e.target.closest('.strip-item');
        if (!a) return;
        e.preventDefault();
        if (performance.now() - stripDrag.end > 400) stripChoose(stripItems().indexOf(a));
    });
    new ResizeObserver(function () { stripMeasure(); }).observe(strip);   // rotation, zoom: measure again
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(stripMeasure);   // the titles are wider or narrower once the fonts are there
    if (!stripMode) {   // Navigation setting (text or icons): measure again, but only when it changes (the body class changes all the time)
        var icons = document.body.classList.contains('nav-icons');
        stripMode = new MutationObserver(function () {
            var now = document.body.classList.contains('nav-icons');
            if (now !== icons) { icons = now; stripMeasure(); }
        });
        stripMode.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
}
