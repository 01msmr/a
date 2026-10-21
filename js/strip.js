// Owns: the section strip in the bottom bar of narrow touch devices (aiming like msmr.dev: numbers beside a window that shows the title)
// Defines globals: stripDrag, stripSections, stripWidths, stripSlots, stripTitleX, stripAimF, stripWinAt, stripOn, stripMeasure, stripShow, buildStrip, stripSync
// Uses: state, render
// Pressing the strip aims from the active item; the finger moves f (a fraction of the item index) one to one. Outside the window the numbers follow the finger; the item
// nearest to f crosses the window faster (the window width per item pitch) as its title: it turns from number to title at one border and back to a number at the other,
// and the next item enters at that very moment.
// on: the strip is pressed (aiming); idx: item in the window; f0/f: aim at the start / now; x0: finger start; touched: item under the finger; end: time of the last release
var stripDrag = { on: false, idx: -1, tx: 0, f: 0, f0: 0, x0: 0, pid: null, dragged: false, touched: null, end: -1e9 };
var stripSections = [];
var stripWidths = [];   // window width per item (its title, or the icon)
var stripTitleWs = [];  // width of the title (or icon) itself per item
var stripWinW = 0;      // width of the window now
var stripMode = null;   // watches the Navigation setting (class nav-icons on the body)
// At rest the numbers show two items beyond the window's edge (cut off there, they glide in and out through that edge while the strip moves)
var STRIP_MS = 450, STRIP_EASE = 'cubic-bezier(.33,1,.68,1)';   // the pace of msmr.dev's narrow nav (--nav-t, --nav-ease)

// A number may reach this far (a fraction of its width) under the window's edge before it turns into the title; the outgoing item turns back into a number at the same depth
var STRIP_UNDER = 0.25;

// Centre of every item relative to the strip centre for the aim f. Outside the window the items sit at the pace of the finger; the item nearest to f (k) crosses the
// window faster: from one border, where it is a number a quarter of its width under the window's edge, to the other in the pace of one item pitch. Items are gap wide
function stripSlots(f, count, winW, gap) {
    var k = count ? Math.max(0, Math.min(count - 1, Math.round(f))) : 0, x = [], xb = winW / 2 + gap * (0.5 - STRIP_UNDER);
    for (var j = 0; j < count; j++) {
        var d = j - f, s = Math.sign(d);
        x.push(j === k ? 2 * xb * d : s * xb + (d - s / 2) * gap);
    }
    return { k: k, x: x };
}

// Centre of the title of item k (w wide) relative to the window centre: it slides in from outside one border (its inner edge at the border) to the other
function stripTitleX(f, k, winW, gap, w) { return (k - f) * (winW + gap * (1 - 2 * STRIP_UNDER) + w); }

// The aim for a finger that moved dx (px) since it was pressed on item f0
function stripAimF(f0, dx, gap, count) { return Math.max(0, Math.min(count - 1, f0 - dx / gap)); }

// The window follows its content: between two items its width runs from one title to the other
function stripWinAt(f, widths) {
    var n = widths.length;
    if (!n) return 0;
    var g = Math.max(0, Math.min(n - 1, f)), a = Math.floor(g), b = Math.min(n - 1, a + 1);
    return widths[a] + (widths[b] - widths[a]) * (g - a);
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
    stripTitleWs = stripSections.map(function (sec) {
        if (icons) return itemW;
        title.textContent = sec.title;
        return title.offsetWidth;
    });
    title.textContent = keep;
    stripWidths = stripTitleWs.map(function (t) { return icons ? itemW : Math.min(max, Math.max(itemW, t + pad)); });
    stripPlace(stripDrag.on ? stripDrag.f : Math.max(stripDrag.idx, 0), stripDrag.on);   // a resize while the finger is down keeps the aim
}

// Put the items and the window where the aim f wants them (aim: all numbers show, at rest only the nearest ones)
function stripPlace(f, aim) {
    var strip = document.getElementById('strip'), gap = stripItemW(), c = strip ? strip.clientWidth / 2 : 0, n = stripSections.length;
    if (!n || !gap || !c || stripWidths.length !== n) return;
    stripWinW = stripWinAt(f, stripWidths);
    var s = stripSlots(f, n, stripWinW, gap);
    if (s.k !== stripDrag.idx) stripShow(s.k);
    document.getElementById('strip-window').style.width = stripWinW + 'px';
    stripDrag.tx = stripTitleX(f, s.k, stripWinW, gap, stripTitleWs[s.k] || 0);
    document.querySelector('#strip-window .strip-slide').style.left = 'calc(50% + ' + stripDrag.tx.toFixed(1) + 'px)';
    stripItems().forEach(function (a, j) { a.style.left = (c + s.x[j] - gap / 2).toFixed(1) + 'px'; });
    strip.style.setProperty('--reach', (stripWinW / 2 + 2.25 * gap).toFixed(1) + 'px');   // the numbers are cut off two items beyond the window's edge (CSS: .strip-clip)
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
    var before = stripLefts(), sec = stripSections[j], tx0 = stripDrag.tx, same = j === stripDrag.idx;
    stripDrag.on = false; stripDrag.end = performance.now();
    document.getElementById('strip').classList.remove('is-aiming');
    stripShow(j);
    stripPlace(j, false);
    stripFollow(before);
    var slide = document.querySelector('#strip-window .strip-slide');
    if (same && Math.abs(tx0) > 0.5 && slide.animate) slide.animate([{ translate: tx0 + 'px 0' }, { translate: '0px 0' }], { duration: STRIP_MS, easing: STRIP_EASE, composite: 'add' });   // the title in the window slides to the middle
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
    stripDrag.on = false; stripDrag.idx = -1; stripWidths = []; stripTitleWs = []; stripWinW = 0;
    var strip = document.createElement('div'), win = document.createElement('div'), clip = document.createElement('div');
    strip.id = 'strip'; strip.className = 'strip';
    clip.className = 'strip-clip';
    strip.appendChild(clip);
    data.forEach(function (sec, idx) {
        var a = document.createElement('a'), no = document.createElement('span');
        a.className = 'strip-item'; a.href = '#' + sec.id; a.target = '_self'; a.title = sec.title;
        a.style.setProperty('--c', sectionColor(idx));
        no.className = 'strip-no'; no.textContent = idx + 1;
        a.appendChild(no);
        a.appendChild(makeIcon(sec.icon));
        clip.appendChild(a);
    });
    win.id = 'strip-window'; win.setAttribute('aria-hidden', 'true');
    var slide = document.createElement('div'), title = document.createElement('span');
    slide.className = 'strip-slide';
    title.className = 'strip-title';
    slide.appendChild(title);
    slide.appendChild(makeIcon(''));
    win.appendChild(slide);
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
