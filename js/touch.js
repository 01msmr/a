// Owns: CSS measures, pointer kind, click lock, swipe, tail snap after the glide, glow state
// Defines globals: measures, readMeasures, glide, glow, PHONE_QUERY, isPhone, pointerKind, isTouch, setPointerKind, lockOn, lockOff, lockFromEvent, tapStart, touchTap, swiping, fingerDown, swipeEnd, tailLast, tailRestore, cutTail, pendingTap, tailAnim
// Uses: prefs, active-section, glow, light, cursor, navigation (and the edit-mode class on body)
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
    container: null, secs: [], rows: [], sig: '', top: 0, bot: 0, dest: null, instant: true,
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
var touchTap = null, pendingTap = null;   // pendingTap: a touch during a scroll that may still need its activation
document.addEventListener('touchstart', function (e) {
    var t = e.touches && e.touches[0];
    if (tailAnim) tailRestore();   // a touch ends the finishing animation at once
    touchTap = t ? { x: t.clientX, y: t.clientY, t: performance.now(), target: e.target } : null;
    // While the page is still scrolling after a swipe (coasting, then settling on the snap point) a touch can only halt the scroll, be a tap,
    // or start a new swipe (which releases the lock again): activate right at the touch, otherwise several taps get lost until the scroll has ended
    if (touchTap && swiping) lockFromEvent({ target: e.target, clientX: t.clientX, clientY: t.clientY, button: 0 }, true);
    // Remember the touch as well: if iOS cancels or swallows it while the page glides (touchcancel), it is activated when the scroll has ended
    pendingTap = touchTap && swiping ? { target: e.target, x: t.clientX, y: t.clientY, t: performance.now() } : null;
}, { passive: true, capture: true });
document.addEventListener('touchend', function (e) {
    var start = touchTap, t = e.changedTouches && e.changedTouches[0];
    touchTap = null;
    pendingTap = null;   // handled here (a cancelled touch never gets here and stays pending)
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
    // A touch during the scroll that iOS swallowed or cancelled and that did not turn into a swipe: activate its section now
    var tap = pendingTap;
    pendingTap = null;
    if (tap && performance.now() - tap.t < 2500 && tap.target && tap.target.closest) {
        lockFromEvent({ target: tap.target, clientX: tap.x, clientY: tap.y, button: 0 }, true);
    }
    glowSync();
}
document.addEventListener('scrollend', function () { if (swiping) swipeEnd(); }, true);
// Swiping with a finger ends the click lock (the mouse does that by moving)
document.addEventListener('touchmove', function (e) {
    var t = e.touches && e.touches[0];
    if (touchTap && t && Math.hypot(t.clientX - touchTap.x, t.clientY - touchTap.y) < 10) return;   // finger jitter of a tap is no swipe
    pendingTap = null;   // a real swipe: no tap any more
    if (lock.sec) lockOff();
}, { passive: true });
document.addEventListener('scroll', function () {
    if (!isTouch()) return;
    swiping = true;
    // not on the body: its class change triggers a re-measure and disturbs the coasting
    document.documentElement.classList.add('swiping');
    whenStill(swipeEnd);
    cutTail();
}, true);

// iOS swallows every touch while the page glides (it only halts the scroll, the page gets no touchstart), and the slow end of the glide
// onto the snap point is long. When the finger is up, the page crawls (at most 3 px per scroll event) and is within 60 px of a snap point,
// we take over: the native scrolling is switched off for a moment (a jump during iOS' own deceleration is ignored) and the last stretch is
// animated here in 60 to 180 ms (ease-out) onto the snap point. A touch during that animation ends it at once and gives the scrolling back.
var tailLast = null, tailAnim = 0;
function tailRestore() {
    var c = glow.container;
    cancelAnimationFrame(tailAnim); tailAnim = 0;
    if (c) { c.style.overflowY = ''; c.style.scrollSnapType = ''; }
}
function cutTail() {
    var c = glow.container;
    if (tailAnim) return;   // the scroll events of our own animation
    if (!c || fingerDown || !isPhone() || document.body.classList.contains('edit-mode') || !glow.pageIdx) { tailLast = null; return; }
    var top = c.scrollTop, last = tailLast;
    tailLast = top;
    if (last === null || Math.abs(top - last) > 3) return;
    var best = null;
    glow.pageIdx.forEach(function (p) {
        var y = glow.secs[p[0]].y;
        if (best === null || Math.abs(y - top) < Math.abs(best - top)) best = y;
    });
    var max = c.scrollHeight - c.clientHeight, dist = best === null ? 0 : best - top;
    if (best === null || best > max || Math.abs(dist) > 60 || Math.abs(dist) < 0.5) return;
    var from = top, t0 = performance.now(), duration = Math.min(180, 60 + Math.abs(dist) * 2);
    c.style.overflowY = 'hidden';
    c.style.scrollSnapType = 'none';
    (function step(now) {
        var t = Math.min(1, (now - t0) / duration), e = 1 - Math.pow(1 - t, 3);
        c.scrollTo({ top: from + dist * e, behavior: 'instant' });
        if (t < 1) tailAnim = requestAnimationFrame(step);
        else { tailRestore(); tailLast = null; }
    })(t0);
}

