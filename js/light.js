// Owns: hover light gliding from tile to tile
// Defines globals: light, lightActive, lightFrame, lightPaint, lightRadius, lightLine, lightCoverage, lightInverted, lightCells, lightStep, lightRun, lightEdge, lightOutside, lightReset, lightTo, lightOff, lightInit, lightMouse, lightSync, lightPlan, lightPlanRaf
// Uses: prefs, touch, cursor
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

