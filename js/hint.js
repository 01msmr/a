// Owns: the hint element (a tooltip with the colors of the page inverted), placing it, setHint for elements with a hint
// Defines globals: hintPos, hintEl, hintOn, hintFor, hintHide, hintShow, setHint, hintOver, hintPoint
// Uses: (nothing)
// With a mouse only. Elements with data-hint show it on hover (below the element, beside it in the sections list; not on the texts of chips and list entries); the settings buttons call hintShow themselves (beside the button)
// Left edge and top of the hint, and the edge it touches (for the corners): beside the element (right of it when it fits in the window, otherwise left of it, centered vertically),
// or flush below it at its left edge (above it when there is no room)
function hintPos(r, size, view, beside) {
    if (beside) {
        return {
            left: r.right + 6 + size.w <= view.w ? r.right + 6 : r.left - 6 - size.w,
            top: r.top + (r.bottom - r.top) / 2 - size.h / 2,
            edge: 'side'
        };
    }
    var below = r.bottom + size.h <= view.h;
    return {
        left: Math.min(Math.max(r.left, 4), view.w - size.w - 4),
        top: below ? r.bottom : r.top - size.h,
        edge: below ? 'below' : 'above'
    };
}

var hintEl = document.createElement('div');
hintEl.id = 'hint';
hintEl.popover = 'manual';
document.body.appendChild(hintEl);
var hintOn = false;
var hintFor = null;

function hintHide() {
    hintEl.innerHTML = '';
    if (hintOn) hintEl.hidePopover();
    hintOn = false;
    hintFor = null;
}

function hintShow(el, html, beside) {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    hintEl.innerHTML = html;
    var w = el.getBoundingClientRect().width;
    hintEl.style.minWidth = beside ? '' : w + 'px';   // below an element: as wide as the element
    hintEl.style.paddingInline = '';
    hintEl.style.fontSize = '';
    if (!hintOn) hintEl.showPopover();
    hintOn = true;
    if (!beside && hintEl.offsetWidth > w) hintEl.style.paddingInline = '0';   // a little too wide: drop the side padding first
    if (!beside && hintEl.offsetWidth > w) hintEl.style.fontSize = parseFloat(getComputedStyle(hintEl).fontSize) * w / hintEl.offsetWidth + 'px';   // still too wide: shrink the font to fit
    var p = hintPos(el.getBoundingClientRect(), { w: hintEl.offsetWidth, h: hintEl.offsetHeight },
        { w: document.documentElement.clientWidth, h: document.documentElement.clientHeight }, beside);
    hintEl.style.left = p.left + 'px';
    hintEl.style.top = p.top + 'px';
    hintEl.dataset.edge = p.edge;
}

// The hint instead of the native title; the aria-label keeps the name for screen readers
function setHint(el, text) {
    el.removeAttribute('title');
    el.dataset.hint = text;
    el.setAttribute('aria-label', text);
}

function hintOver(target) {
    var el = target && target.closest && target.closest('[data-hint]');
    if (!el || el === hintFor) return;
    if (el.closest('.title, #jumper-pop') && !el.matches('#settings-btn, #section-jumper') && !document.body.classList.contains('nav-icons')) return;   // the texts of chips and list entries need no hint, only their icons; "set" and "sec" keep theirs
    hintShow(el, el.dataset.hint.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'), !!el.closest('#jumper-pop'));
    hintFor = el;
}
document.addEventListener('mouseover', function (e) { hintOver(e.target); });
// A closed dropdown leaves the pointer on its button without a new mouseover: show the hint again
var hintPoint = null;
document.addEventListener('mousemove', function (e) { hintPoint = { x: e.clientX, y: e.clientY }; }, true);
document.addEventListener('toggle', function (e) {
    if (e.newState !== 'closed' || !e.target.matches('#settings-pop, #jumper-pop') || !hintPoint) return;
    hintOver(document.elementFromPoint(hintPoint.x, hintPoint.y));
}, true);
document.addEventListener('mouseout', function (e) {
    if (hintFor && !(e.relatedTarget && hintFor.contains(e.relatedTarget))) hintHide();
});
document.addEventListener('mousedown', hintHide);
window.addEventListener('scroll', hintHide, true);
