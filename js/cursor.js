// Owns: line pointer
// Defines globals: cursor, cursorTarget, chipDirection, cursorSet, cursorSecInit, cursorPlan
// Uses: prefs, touch, light
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

