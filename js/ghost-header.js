// Owns: copies of the section heading at the edges (ghost headers)
// Defines globals: ghostHeader, ghostHeaderOffscreen, ghostHeaderDuration, GHOST_HEADER_EASE, ghostHeaderCurve, ghostHeaderLayer, ghostHeaderJump, ghostHeaderSection, ghostHeaderRemove, ghostHeaderRender, ghostHeaderEdge, ghostHeaderRank, ghostHeaderMake, ghostHeaderIndex, ghostHeaderReset
// Uses: state, touch (and the edit-mode class on body)
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

// The glide of a copy: in with an ease-out curve (fast at the start, slow at the end); out with its exact time reverse (the control points mirrored), over the same time
var GHOST_HEADER_EASE = [.215, .61, .355, 1];
function ghostHeaderCurve(ms, out) {
    var e = GHOST_HEADER_EASE;
    var p = out ? [1 - e[2], 1 - e[3], 1 - e[0], 1 - e[1]] : e;
    return 'transform ' + ms + 'ms cubic-bezier(' + p.map(function (v) { return String(+v.toFixed(3)).replace(/^0\./, '.'); }).join(', ') + ')';
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
    // glide in: ease-out (fast at the start, slow at the end); glide out: its time reverse
    var curve = ghostHeaderCurve(ghostHeaderDuration(), false), curveOut = ghostHeaderCurve(ghostHeaderDuration(), true);
    function slideOut(g) {   // glides out including shadow and line and is removed afterwards
        g.el.style.transition = curveOut;
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

