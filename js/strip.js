// Owns: the section strip in the bottom bar of touch phones (numbers scroll under a fixed window that shows the title)
// Defines globals: stripDrag, stripIndexAt, stripLeftFor, stripLens, stripMeasure, stripReach, stripItemVisible, stripPick, stripOn, buildStrip, stripShow, stripSync
// Uses: state, render
// on: the user moves the strip (finger down or coasting); finger: still touching; idx: item in the window; timer: waits for the strip to come to rest; dir: last direction of the scrolling; left: its last position
var stripDrag = { on: false, finger: false, idx: -1, timer: 0, dir: 0, left: 0 };
var stripSections = [];
var stripMode = null;   // watches the Navigation setting (class nav-icons on the body)
var stripWidths = [];   // window width per item (its title, or the icon)
var stripWinW = 0;      // width of the window now

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

// Distance from the window centre under which an item counts as covered: more than 25 % of it is under the window
function stripReach(winW, itemW) { return winW / 2 + itemW * 0.25; }

// An item sliding under the window shows only while at least 75 % of it is outside, and only the next two items beyond the window's edge show; d = distance from the window centre
function stripItemVisible(d, winW, itemW) {
    var edge = Math.abs(d) - winW / 2;
    return edge >= itemW * 0.25 && edge <= itemW * 2;
}

// Item in the window: the one that has just vanished at the window's edge on the side the strip moves towards (dir 1: right, -1: left), so
// the title and the number leaving the view switch at the same moment; each item is tested against a window of its own width.
// Without a direction it is the item at the centre. widths: window width per item
function stripPick(left, itemW, widths, dir) {
    var n = widths.length, i;
    if (!n || !(itemW > 0)) return 0;
    if (dir > 0) { for (i = n - 1; i > 0; i--) if (i * itemW - left < stripReach(widths[i], itemW)) break; }
    else if (dir < 0) { for (i = 0; i < n - 1; i++) if (left - i * itemW < stripReach(widths[i], itemW)) break; }
    else i = Math.max(0, Math.min(n - 1, Math.round(left / itemW)));
    return i;
}

function stripLensApply(left, speed) {
    var itemW = stripItemW();
    var winW = stripWinW;
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

// Window width per item: its title (the icon only in icon mode), at most 70 % of the strip; measured again when the size or the mode changes
function stripMeasure() {
    var win = document.getElementById('strip-window'), track = document.getElementById('strip-track'), itemW = stripItemW();
    if (!win || !itemW) return;
    var title = win.querySelector('.strip-title'), keep = title.textContent, max = Math.max(itemW, track.clientWidth * 0.7);
    var icons = document.body.classList.contains('nav-icons'), cs = getComputedStyle(win), pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    var keepW = win.style.width, keepT = win.style.transition;
    win.style.transition = 'none'; win.style.width = 'auto';
    stripWidths = stripSections.map(function (sec) {
        if (icons) return itemW;
        title.textContent = sec.title;
        return Math.min(max, Math.max(itemW, title.offsetWidth + pad));
    });
    title.textContent = keep; win.style.width = keepW; win.style.transition = keepT;
    stripShow(Math.max(stripDrag.idx, 0));
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
    stripWinW = stripWidths[i] || 0;
    if (stripWinW) win.style.width = stripWinW + 'px';
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
    stripDrag.on = false; stripDrag.dir = 0;
    var sec = stripSections[stripDrag.idx];
    if (sec && '#' + sec.id !== jumperValue) jumpTo('#' + sec.id);
    stripScrollTo(stripDrag.idx);   // the shown item glides into the window
}

function stripArm() {
    clearTimeout(stripDrag.timer);
    stripDrag.timer = setTimeout(stripSettle, 140);
}

function buildStrip(data) {
    var old = document.getElementById('strip');
    if (old) old.remove();
    stripSections = data.slice();
    stripDrag.on = false; stripDrag.finger = false; stripDrag.idx = -1; stripWidths = []; stripWinW = 0;
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

    track.addEventListener('touchstart', function () {
        if (!stripDrag.on) stripDrag.dir = 0;   // touching a strip at rest starts without a direction
        stripDrag.on = true; stripDrag.finger = true; stripDrag.left = track.scrollLeft; clearTimeout(stripDrag.timer);
    }, { passive: true });
    track.addEventListener('touchend', function () { stripDrag.finger = false; stripArm(); }, { passive: true });
    track.addEventListener('touchcancel', function () { stripDrag.finger = false; stripArm(); }, { passive: true });
    track.addEventListener('scroll', function () {
        if (!stripDrag.on) return;   // scrolling that we started ourselves (stripScrollTo) changes nothing
        var left = track.scrollLeft;
        if (left !== stripDrag.left) { stripDrag.dir = left > stripDrag.left ? 1 : -1; stripDrag.left = left; }
        var i = stripPick(left, stripItemW(), stripWidths, stripDrag.dir);
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
    new ResizeObserver(function () { stripMeasure(); stripScrollTo(Math.max(stripDrag.idx, 0), true); }).observe(track);   // rotation, zoom: measure again and put the item back into the window
    if (!stripMode) {   // Navigation setting (text or icons): measure again, but only when it changes (the body class changes all the time)
        var icons = document.body.classList.contains('nav-icons');
        stripMode = new MutationObserver(function () {
            var now = document.body.classList.contains('nav-icons');
            if (now !== icons) { icons = now; stripMeasure(); }
        });
        stripMode.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
    stripShow(0);
}
