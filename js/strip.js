// Owns: the section strip in the bottom bar of touch phones (numbers scroll under a fixed window that shows the title)
// Defines globals: stripDrag, stripIndexAt, stripLeftFor, stripLens, stripItemVisible, stripOn, buildStrip, stripShow, stripSync
// Uses: state, render
// on: the user moves the strip (finger down or coasting); finger: still touching; idx: item in the window; timer: waits for the strip to come to rest
var stripDrag = { on: false, finger: false, idx: -1, timer: 0 };
var stripSections = [];

// Item in the window for a scroll position; the items have equal width and the first one is in the window at 0
function stripIndexAt(left, itemW, count) {
    if (!count || !(itemW > 0)) return 0;
    return Math.max(0, Math.min(count - 1, Math.round(left / itemW)));
}

function stripLeftFor(index, itemW) { return index * itemW; }

// Lens: while the strip moves, the items around the window are pushed away from it; d = item distance from the window (px), speed in px per frame
function stripLens(d, speed, itemW) {
    if (!(itemW > 0)) return 0;
    var x = d / (itemW * 2.5), power = Math.min(1, Math.abs(speed) / (itemW * 0.5));
    return itemW * 0.8 * power * x * Math.exp(0.5 - x * x);
}

// An item sliding under the window shows only while at least 75 % of it is outside, and only the next two items beyond the window's edge show; d = distance from the window centre
function stripItemVisible(d, winW, itemW) {
    var edge = Math.abs(d) - winW / 2;
    return edge >= itemW * 0.25 && edge <= itemW * 2;
}

function stripLensApply(left, speed) {
    var itemW = stripItemW();
    var winW = document.getElementById('strip-window').offsetWidth;
    stripItems().forEach(function (a, i) {
        if (winW) a.classList.toggle('gone', !stripItemVisible(i * itemW - left, winW, itemW));
        a.style.transform = speed ? 'translateX(' + stripLens(i * itemW - left, speed, itemW).toFixed(1) + 'px)' : '';
    });
}

function stripItems() { return document.querySelectorAll('#strip .strip-item'); }

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
    stripItems().forEach(function (a, k) { a.classList.toggle('active', k === i); });
    var win = document.getElementById('strip-window');
    win.querySelector('.strip-title').textContent = sec.title;
    win.querySelector('.secicon').className = makeIcon(sec.icon).className;
    win.style.setProperty('--c', sectionColor(i));
    stripDrag.idx = i;
    var track = document.getElementById('strip-track');
    if (track) stripLensApply(track.scrollLeft, 0);   // the window width changed: items under its edge hide or show again
}

function stripScrollTo(i, instant) {
    var track = document.getElementById('strip-track'), itemW = stripItemW();
    if (!track || !itemW) return;
    var left = stripLeftFor(i, itemW);
    if (Math.abs(track.scrollLeft - left) < 1) return;
    track.scrollTo({ left: left, behavior: instant ? 'instant' : 'smooth' });
}

// The active section changed (page scroll, tap, dropdown): the strip follows, unless the user is moving it
function stripSync(hash) {
    if (stripDrag.on) return;
    var i = stripSections.findIndex(function (s) { return '#' + s.id === hash; });
    if (i < 0) return;
    stripShow(i);
    stripScrollTo(i);
}

// The strip came to rest: the section in the window becomes active, the page scrolls to its page (jumpTo)
function stripSettle() {
    if (stripDrag.finger) return;
    stripDrag.on = false;
    var sec = stripSections[stripDrag.idx];
    if (sec && '#' + sec.id !== jumperValue) jumpTo('#' + sec.id);
    else stripScrollTo(stripDrag.idx);
}

function stripArm() {
    clearTimeout(stripDrag.timer);
    stripDrag.timer = setTimeout(stripSettle, 140);
}

function buildStrip(data) {
    var old = document.getElementById('strip');
    if (old) old.remove();
    stripSections = data.slice();
    stripDrag.on = false; stripDrag.finger = false; stripDrag.idx = -1;
    var strip = document.createElement('div'), track = document.createElement('div'), win = document.createElement('div');
    strip.id = 'strip'; strip.className = 'strip';
    track.id = 'strip-track';
    data.forEach(function (sec, idx) {
        var a = document.createElement('a'), no = document.createElement('span');
        a.className = 'strip-item'; a.href = '#' + sec.id; a.target = '_self'; a.title = sec.title;
        a.style.setProperty('--c', sectionColor(idx));
        no.className = 'strip-no'; no.textContent = idx + 1;
        a.appendChild(no);
        a.appendChild(makeIcon(sec.icon));
        track.appendChild(a);
    });
    win.id = 'strip-window'; win.setAttribute('aria-hidden', 'true');
    var title = document.createElement('span');
    title.className = 'strip-title';
    win.appendChild(title);
    win.appendChild(makeIcon(''));
    strip.appendChild(track);
    strip.appendChild(win);
    document.querySelector('.title').insertBefore(strip, document.getElementById('section-nav-list'));

    track.addEventListener('touchstart', function () { stripDrag.on = true; stripDrag.finger = true; clearTimeout(stripDrag.timer); }, { passive: true });
    track.addEventListener('touchend', function () { stripDrag.finger = false; stripArm(); }, { passive: true });
    track.addEventListener('touchcancel', function () { stripDrag.finger = false; stripArm(); }, { passive: true });
    track.addEventListener('scroll', function () {
        if (!stripDrag.on) return;   // scrolling that we started ourselves (stripScrollTo) changes nothing
        var i = stripIndexAt(track.scrollLeft, stripItemW(), stripSections.length);
        if (i !== stripDrag.idx) stripShow(i);
        if (!stripDrag.finger) stripArm();
    }, { passive: true });
    track.addEventListener('contextmenu', function (e) { e.preventDefault(); });   // no long-press menu on the links
    var last = { left: 0, t: 0, timer: 0 };
    track.addEventListener('scroll', function () {   // every scroll counts, also our own: the lens only depends on speed and position
        var now = performance.now(), left = track.scrollLeft;
        stripLensApply(left, (left - last.left) / Math.max(1, now - last.t) * 16);
        last.left = left; last.t = now;
        clearTimeout(last.timer);
        last.timer = setTimeout(function () { stripLensApply(track.scrollLeft, 0); }, 90);
    }, { passive: true });
    track.addEventListener('click', function (e) {
        var a = e.target.closest('.strip-item');
        if (!a) return;
        e.preventDefault();
        clearTimeout(stripDrag.timer);
        stripDrag.on = false; stripDrag.finger = false;
        var i = Array.prototype.indexOf.call(stripItems(), a);
        stripShow(i);
        stripScrollTo(i);
        jumpTo(a.getAttribute('href'));
    });
    new ResizeObserver(function () { stripScrollTo(Math.max(stripDrag.idx, 0), true); }).observe(track);   // rotation, zoom: put the item back into the window
    stripShow(0);
}
