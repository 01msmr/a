// Owns: grid layout, focus on content
// Defines globals: gridBase, gridInit, gridTimer, focusContent
// Uses: touch, ghost-header (and the edit-mode class on body)
// Sections occupy a whole multiple of a quarter of the content height
var gridBase = 0;

function gridInit(onlyOnChange) {
    var container = document.getElementById('container');
    if (!container) return;
    var sections = container.querySelectorAll('section');

    var on = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--grid'), 10);

    // no grid (desktop) or edit mode: release set heights and leave
    if (!on || document.body.classList.contains('edit-mode')) {
        sections.forEach(function (s) { s.style.minHeight = ''; });
        gridBase = 0;
        return;
    }

    // free space at the bottom must match the bar height exactly
    var bar = document.querySelector('.title');
    if (bar && getComputedStyle(bar).position === 'fixed') {
        container.style.paddingBottom =
            Math.ceil(bar.getBoundingClientRect().height) + 'px';
    } else {
        container.style.paddingBottom = '';
    }

    var cs = getComputedStyle(container);
    var inner = container.clientHeight
        - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (!(inner > 0)) return;

    // threshold against Safari's bar animation, which fires resize at a 17 ms rhythm
    if (onlyOnChange && Math.abs(inner - gridBase) < 8) return;
    gridBase = inner;

    // the section that is at the top right now, back there after the rebuild
    var upperEdge = container.getBoundingClientRect().top;
    var upper = null;
    sections.forEach(function (s) {
        if (!upper && s.getBoundingClientRect().bottom - upperEdge > 1) upper = s;
    });

    var quarter = inner / on;
    sections.forEach(function (s) { s.style.minHeight = ''; });

    // measure everything first, then set everything
    var places = [];
    sections.forEach(function (s) {
        // 1 px tolerance, otherwise an exactly fitting section rounds up to two
        places.push(Math.max(1, Math.ceil((s.getBoundingClientRect().height - 1) / quarter)));
    });
    sections.forEach(function (s, i) {
        s.style.minHeight = (places[i] * quarter) + 'px';
    });

    if (upper) {
        var smooth = container.style.scrollBehavior;
        container.style.scrollBehavior = 'auto';
        container.scrollTop += upper.getBoundingClientRect().top - upperEdge;
        container.style.scrollBehavior = smooth;
    }
}

// re-grid only after stillness, not at every intermediate step
var gridTimer = null;

window.addEventListener('resize', function () {
    clearTimeout(gridTimer);
    gridTimer = setTimeout(function () { gridInit(true); }, 250);
});

// the icon font changes the header height after loading
if (document.fonts) document.fonts.ready.then(function () { gridInit(); });

// focus the content after a jump, otherwise the arrow keys go nowhere
function focusContent(sec) {
    var c = document.getElementById('container');

    // target is the section that was jumped to
    var fixed = sec && sec.nodeType === 1 ? sec : null;

    // determine the target anew on every attempt — on click the hash is still old
    var assign = function () {
        var dest = fixed;
        if (!dest && location.hash.length > 1) {
            var el = document.getElementById(location.hash.slice(1));
            dest = el && el.closest('section');
        }
        // follow immediately, otherwise two areas glow until scrolling is still
        if (dest) {
            document.querySelectorAll('#container section.current')
                .forEach(function (s) { s.classList.remove('current'); });
            dest.classList.add('current');
            ghostHeaderJump(dest);
        }
        (dest || c).focus({ preventScroll: true });
    };

    // three times, because each point in time is unreliable on its own
    assign();
    if (document.readyState === 'complete') requestAnimationFrame(assign);
    else window.addEventListener('load', assign, { once: true });
    setTimeout(assign, 250);
}

// hashchange fires after the jump mark — the focus sits there reliably
window.addEventListener('hashchange', function () { focusContent(); });

