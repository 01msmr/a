// Owns: the section strip in the bottom bar of narrow touch devices (aiming like msmr.dev: numbers beside a window that shows the title)
// Defines globals: stripDrag, stripSections, stripWidths, stripSlots, stripAimF, stripWinAt, stripShownAtRest, stripOn, stripMeasure, stripShow, buildStrip, stripSync
// Uses: state, render
// Pressing the strip aims from the active item; the finger moves f (a fraction of the item index) one to one. The item nearest to f stands in the window as its title,
// the others are numbers beside it; a number holds at the window's edge and the switch moves it into the window in one step (the outgoing one steps out at the same time).
// on: the strip is pressed (aiming); idx: item in the window; f0/f: aim at the start / now; x0: finger start; touched: item under the finger; end: time of the last release
var stripDrag = { on: false, idx: -1, f: 0, f0: 0, x0: 0, pid: null, dragged: false, touched: null, end: -1e9 };
var stripSections = [];
var stripWidths = [];   // window width per item (its title, or the icon)
var stripWinW = 0;      // width of the window now
var stripMode = null;   // watches the Navigation setting (class nav-icons on the body)
var STRIP_MS = 450, STRIP_EASE = 'cubic-bezier(.33,1,.68,1)';   // the pace of msmr.dev's narrow nav (--nav-t, --nav-ease)

// A number may reach this far (a fraction of its width) under the window's edge before it steps into the window; the outgoing item appears at the same depth
var STRIP_UNDER = 0.25;

// Centre of every item relative to the strip centre for the aim f: the nearest item stands in the window (0), the others sit beside it
// at the pace of the finger; the incoming number holds a quarter of its width under the window's edge, then steps in. Items are gap wide
function stripSlots(f, count, winW, gap) {
    var k = count ? Math.max(0, Math.min(count - 1, Math.round(f))) : 0, x = [];
    for (var j = 0; j < count; j++) {
        var d = j - f, s = Math.sign(d);
        x.push(j === k ? 0 : s * (winW / 2 + gap / 2 - STRIP_UNDER * gap) + (d - s / 2) * gap);
    }
    return { k: k, x: x };
}

// The aim for a finger that moved dx (px) since it was pressed on item f0
function stripAimF(f0, dx, gap, count) { return Math.max(0, Math.min(count - 1, f0 - dx / gap)); }

// The window follows its content: between two items its width runs from one title to the other
function stripWinAt(f, widths) {
    var n = widths.length;
    if (!n) return 0;
    var g = Math.max(0, Math.min(n - 1, f)), a = Math.floor(g), b = Math.min(n - 1, a + 1);
    return widths[a] + (widths[b] - widths[a]) * (g - a);
}

// At rest up to two numbers show beside the window
function stripShownAtRest(j, k) { return Math.abs(j - k) <= 2; }

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

// Window width per item: its title (the icon only in icon mode), at most 70 % of the strip; measured again when the size or the mode changes
function stripMeasure() {
    var strip = document.getElementById('strip'), win = document.getElementById('strip-window'), itemW = stripItemW();
    if (!strip || !itemW) return;
    var title = win.querySelector('.strip-title'), keep = title.textContent, max = Math.max(itemW, strip.clientWidth * 0.7);
    var icons = document.body.classList.contains('nav-icons'), cs = getComputedStyle(win), pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    var keepW = win.style.width;
    win.style.transition = 'none'; win.style.width = 'auto';
    stripWidths = stripSections.map(function (sec) {
        if (icons) return itemW;
        title.textContent = sec.title;
        return Math.min(max, Math.max(itemW, title.offsetWidth + pad));
    });
    title.textContent = keep; win.style.width = keepW;
    void win.offsetWidth;
    win.style.transition = '';
    stripPlace(Math.max(stripDrag.idx, 0), false);
}

// Put the items and the window where the aim f wants them (aim: all numbers show, at rest only the nearest ones)
function stripPlace(f, aim) {
    var strip = document.getElementById('strip'), gap = stripItemW(), c = strip ? strip.clientWidth / 2 : 0, n = stripSections.length;
    if (!n || !gap || !c || stripWidths.length !== n) return;
    stripWinW = stripWinAt(f, stripWidths);
    var s = stripSlots(f, n, stripWinW, gap);
    if (s.k !== stripDrag.idx) stripShow(s.k);
    document.getElementById('strip-window').style.width = stripWinW + 'px';
    stripItems().forEach(function (a, j) {
        a.style.left = (c + s.x[j] - gap / 2).toFixed(1) + 'px';
        a.classList.toggle('far', !aim && !stripShownAtRest(j, s.k));
    });
}

function stripSpots() {   // where every item is on the screen now, and its state
    return stripItems().map(function (a) {
        var r = a.getBoundingClientRect();
        return { x: r.left + r.width / 2, shown: !a.classList.contains('far'), inWin: a.classList.contains('active') };
    });
}

// After a switch (release, page scroll): the new item stands in the window at once, the previous one starts at the window's old edge and slides out,
// the others glide from their old places to the new ones; whoever disappears fades first, whoever appears fades in afterwards, never two on top of each other
function stripFollow(before, wOld) {
    var gap = stripItemW(), strip = document.getElementById('strip');
    if (!gap || !before || !strip.getBoundingClientRect().width) return;
    var items = stripItems();
    items.forEach(function (a) { a.getAnimations().forEach(function (x) { x.cancel(); }); });
    var now = stripSpots(), r = strip.getBoundingClientRect(), mid = r.left + r.width / 2, k = stripDrag.idx;
    var opt = { duration: STRIP_MS, easing: STRIP_EASE }, move = function (dx) { return 'translateX(' + dx + 'px)'; };
    items.forEach(function (a, j) {
        if (j === k) return;
        var o = before[j], n = now[j], dx = o.x - n.x;
        if (o.inWin) dx = mid + (Math.sign(n.x - mid) || 1) * (wOld / 2 + gap / 2) - n.x;
        if (!n.shown) {
            if (o.shown) a.animate([{ transform: move(dx), opacity: 1 }, { opacity: 0, offset: 0.4 }, { transform: move(dx - Math.sign(dx) * gap), opacity: 0 }], opt);
        } else if (!o.shown) a.animate([{ transform: move(Math.sign(dx) * gap), opacity: 0 }, { opacity: 0, offset: 0.4 }, { transform: 'none', opacity: 1 }], opt);
        else if (Math.abs(dx) > 0.5) a.animate([{ transform: move(dx) }, { transform: 'none' }], opt);
    });
}

// The active section changed (page scroll, tap, dropdown): the strip follows, unless the user is aiming
function stripSync(hash) {
    if (stripDrag.on) return;
    var i = stripSections.findIndex(function (s) { return '#' + s.id === hash; });
    if (i < 0 || i === stripDrag.idx) return;
    var before = stripSpots(), wOld = stripWinW;
    stripShow(i);
    stripPlace(i, false);
    stripFollow(before, wOld);
}

// Leave aiming (or a tap/key): item j becomes active, the window shrinks to its title, the numbers glide to their places, the page scrolls to its page
function stripChoose(j, x, y) {
    var before = stripSpots(), wOld = stripWinW, sec = stripSections[j];
    stripDrag.on = false; stripDrag.end = performance.now();
    document.getElementById('strip').classList.remove('is-aiming');
    stripShow(j);
    stripPlace(j, false);
    stripFollow(before, wOld);
    if (sec && '#' + sec.id !== jumperValue) jumpTo('#' + sec.id);
    if (lock.sec && x !== undefined) { lock.x = x; lock.y = y; }   // the lock sits where the finger was, like after a tap on a chip: the mouse events iOS adds after a tap must not release it
}

function buildStrip(data) {
    var old = document.getElementById('strip');
    if (old) old.remove();
    stripSections = data.slice();
    stripDrag.on = false; stripDrag.idx = -1; stripWidths = []; stripWinW = 0;
    var strip = document.createElement('div'), win = document.createElement('div');
    strip.id = 'strip'; strip.className = 'strip';
    data.forEach(function (sec, idx) {
        var a = document.createElement('a'), no = document.createElement('span');
        a.className = 'strip-item'; a.href = '#' + sec.id; a.target = '_self'; a.title = sec.title;
        a.style.setProperty('--c', sectionColor(idx));
        no.className = 'strip-no'; no.textContent = idx + 1;
        a.appendChild(no);
        a.appendChild(makeIcon(sec.icon));
        strip.appendChild(a);
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
    if (!stripMode) {   // Navigation setting (text or icons): measure again, but only when it changes (the body class changes all the time)
        var icons = document.body.classList.contains('nav-icons');
        stripMode = new MutationObserver(function () {
            var now = document.body.classList.contains('nav-icons');
            if (now !== icons) { icons = now; stripMeasure(); }
        });
        stripMode.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
}
