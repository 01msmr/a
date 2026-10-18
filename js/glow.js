// Owns: highlight glow, pages on the phone, scroll sync
// Defines globals: glowTarget, glowMeasure, glowPaint, glowFrame, glowStep, glowTo, buildPages, pageStart, glowScroll, glowSync, glowLayout, glowPlan, safeObserve, glowInit
// Uses: prefs, touch, ghost-header, light (and the edit-mode class on body)
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

// Smartphone: a click on a heading link jumps to the snap point of its page. The plain anchor jump puts the heading at the top; if the section is
// the second one of a pair (not a snap point), the snapping then pulls the page on to the next snap point, one section too far, and the tapped
// section is scrolled out of the view.
document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('#container .name a');
    if (!a || !isPhone() || document.body.classList.contains('edit-mode')) return;
    var sec = a.closest('section');
    e.preventDefault();
    pageStart(sec).scrollIntoView();
    history.replaceState(null, '', a.getAttribute('href'));
}, true);

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
        f.instant = false;   // the scroll-driven placement is the first placement; the next change glides
        return;
    }
    f.inScroll = false;   // not tied to the scroll position: start anew at the next transition
    var z = glowTarget();
    f.container.querySelectorAll('section.hot').forEach(function (s) {
        if (!z || s !== z.sec || !z.hot) s.classList.remove('hot');
    });
    if (z && z.hot) z.sec.classList.add('hot');
    if (z && z.sec === f.dest) return;
    // Always the same transition. Only the first placement and a layout change are instant (f.instant); before, an empty f.dest after the
    // scroll-driven mode made the first tap switch at once, while later taps glided.
    var first = f.instant;
    f.instant = false;
    f.dest = z && z.sec;
    glowTo(z, !first);
}

function glowLayout() {
    var f = glow;
    if (!f.container || !glowMeasure()) return;
    f.dest = null;   // determine anew and set without gliding
    f.instant = true;
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
    f.container = c; f.rows = []; f.secs = []; f.sig = ''; f.dest = null; f.instant = true; f.top = f.bot = 0;
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

