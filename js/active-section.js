// Owns: whenStill and trackActiveSection (which section is current)
// Defines globals: stillRaf, whenStill, trackActiveSection
// Uses: state, strip
// Replacement for scrollend without waiting: calls fn as soon as the scroll position has been still for two frames
var stillRaf = new Map();
function whenStill(fn) {
    cancelAnimationFrame(stillRaf.get(fn));
    var c = document.getElementById('container'), pos = null, still = 0;
    (function step() {
        var p = c.scrollTop + ',' + window.scrollY;
        still = p === pos ? still + 1 : 0;
        pos = p;
        if (still >= 2) { stillRaf.delete(fn); fn(); return; }
        stillRaf.set(fn, requestAnimationFrame(step));
    })();
}

// Topmost visible section: chip inverted, dropdown kept in sync.
function trackActiveSection() {
    var container = document.getElementById('container');
    var chips = document.querySelectorAll('.secname');
    var timer = null;

    syncActive = function () {
        var top = container.getBoundingClientRect().top;
        var headings = document.querySelectorAll('section h3.name');
        var active = chips.length ? chips[0].hash : '';
        var activeEl = null;
        headings.forEach(function (h3) {
            if (h3.getBoundingClientRect().top - top <= 24) {   // active shortly before snapping
                active = '#' + h3.id;
                activeEl = h3;
            }
        });
        // The active chip only follows the scroll position, never the mouse: over a section, a heading or a tile its chip shows
        // the soft hover area (.sec-hover or .with-hover), the active chip stays unchanged
        var nav = active;
        // after a click on a heading or chip its chip stays active until the mouse or keyboard moves
        var locked = lock.sec && !document.body.classList.contains('keyboard') && lock.sec.querySelector('h3.name');
        if (locked) nav = '#' + locked.id;
        stripSync(nav);
        chips.forEach(function (chip) {
            chip.classList.toggle('active', chip.hash === nav);
        });
        headings.forEach(function (h3) {
            var fits = '#' + h3.id === active;
            h3.classList.toggle('active', fits);
            // mark the section — also works when scrolling by hand
            h3.closest('section').classList.toggle('current', fits);
        });
        // docked header → color the bar's border too, no light gap
        document.body.classList.toggle('docked',
            !!activeEl && activeEl.getBoundingClientRect().top - top <= 1);
        if (selJump === null || selJump === active) { selJump = null; jumperValue = active; }
        jumpTarget = null;   // scrolling has come to rest
    };

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Tab' || e.key.indexOf('Arrow') === 0) setTimeout(syncActive);
    });

    // catch up only after scrolling has settled
    // while scrolling catch up every 80 ms (even for very slow swiping), one last time at the end (scrollend or stillness)
    var last = 0;
    container.addEventListener('scroll', function () {
        clearTimeout(timer);
        var now = performance.now();
        if (now - last > 80) { last = now; syncActive(); }
        whenStill(syncActive);   // scrollend does not always come on iOS: also detect stillness ourselves
    });
    container.addEventListener('scrollend', function () { clearTimeout(timer); syncActive(); });
    syncActive();
}

