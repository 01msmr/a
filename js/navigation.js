// Owns: jumping between sections and links (keys, mouse tile)
// Defines globals: jumpTarget, jumpBy, mouseTile, mouseMoved, mousePoint, mouseSection, tileIn, linkBy
// Uses: touch, cursor, grid
// arrow keys add up to one target instead of waiting for the animation
var jumpTarget = null;

function jumpBy(delta, wrap) {
    var sections = document.querySelectorAll('#container section');
    if (!sections.length) return;
    var base = jumpTarget;
    // mouse moved since the last key press: start from the section under the mouse
    var underMouse = mouseMoved ? mouseSection() : null;
    mouseMoved = false;
    if (underMouse) {
        base = Array.prototype.indexOf.call(sections, underMouse);
    } else if (base === null) {
        var activeEl = document.querySelector('#container section h3.name.active');
        base = 0;
        sections.forEach(function (s, i) { if (activeEl && s.contains(activeEl)) base = i; });
    }
    // Smartphone: from page to page (a pair of half-height sections is one page)
    if (isPhone() && glow.pageIdx && !document.body.classList.contains('edit-mode')) {
        var pages = glow.pageIdx, cur = 0;
        pages.forEach(function (p, k) { if (p.indexOf(base) >= 0) cur = k; });
        var next = wrap ? ((cur + delta) % pages.length + pages.length) % pages.length : Math.max(0, Math.min(pages.length - 1, cur + delta));
        jumpTarget = pages[next][0];
        sections[jumpTarget].scrollIntoView();
        focusContent(sections[jumpTarget]);
        return;
    }
    var dest = base + delta;
    jumpTarget = wrap
        // from the last to the first and back
        ? (dest % sections.length + sections.length) % sections.length
        : Math.max(0, Math.min(sections.length - 1, dest));
    sections[jumpTarget].scrollIntoView();
    focusContent(sections[jumpTarget]);
}

// Arrow left/right: from tile to tile, across section boundaries.
// Starting point: the tile last touched with the mouse if the mouse has moved since the
// last key press; otherwise the focused one; otherwise the first of the section
var mouseTile = null;
var mouseMoved = false;

var mousePoint = null;   // last mouse position in the window

function mouseSection() {
    var el = mousePoint && document.elementFromPoint(mousePoint.x, mousePoint.y);
    return el && el.closest ? el.closest('#container section') : null;
}

// first tile of a section, for arrow left (delta < 0) the last
function tileIn(section, delta) {
    var k = section.querySelectorAll('li a');
    return k.length ? k[delta < 0 ? k.length - 1 : 0] : null;
}

function linkBy(delta) {
    var links = Array.prototype.slice.call(document.querySelectorAll('#container li a'));
    if (!links.length) return;
    var i = -1, dest = null;
    if (mouseMoved) {
        var el = mousePoint && document.elementFromPoint(mousePoint.x, mousePoint.y);
        var tile = el && el.closest && el.closest('#container li a');
        if (tile) i = links.indexOf(tile);
        else {
            // mouse in a section but not on a tile: its first tile
            var below = mouseSection();
            dest = below && tileIn(below, delta);
        }
    }
    if (i === -1 && !dest) i = links.indexOf(document.activeElement);
    mouseMoved = false;
    if (dest) {
        // starting point was the section under the mouse
    } else if (i === -1) {
        var sec = document.querySelector('#container section.current') ||
            document.querySelector('#container section');
        // left: the last tile of the section, right: the first
        dest = tileIn(sec, delta) || links[0];
    } else {
        dest = links[Math.max(0, Math.min(links.length - 1, i + delta))];
    }
    dest.focus();
}

// Arrow keys: also without focus in the content (e.g. after a click in the bar) —
// in edit mode and in input fields they belong to the text cursor
document.addEventListener('keydown', function (e) {
    if (document.body.classList.contains('edit-mode')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    // Content, chips and gear of the bar; the dropdown (button) keeps its arrow keys
    if (t !== document.body && !(t.closest && t.closest('#container, .title a, .title button'))) return;
    if (t.closest && t.closest('#section-jumper')) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); jumpBy(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); jumpBy(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); linkBy(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); linkBy(-1); }
});

// Jump keys of the bottom bar
['step-prev', 'step-next'].forEach(function (id, i) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', function (e) {
        e.preventDefault();
        jumpBy(i ? 1 : -1, true);
    });
});

