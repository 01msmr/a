// Owns: the hint element (a tooltip with the colors of the page inverted), placing it, setHint for elements with a hint
// Defines globals: hintPos, hintEl, hintOn, hintFor, hintHide, hintShow, setHint
// Uses: (nothing)
// With a mouse only. Elements with data-hint show it on hover (below the element); the settings buttons call hintShow themselves (beside the button)
// Left edge and top of the hint: beside the element (right of it when it fits in the window, otherwise left of it, centered vertically) or below it (above when there is no room)
function hintPos(r, size, view, beside) {
    if (beside) {
        return {
            left: r.right + 6 + size.w <= view.w ? r.right + 6 : r.left - 6 - size.w,
            top: r.top + (r.bottom - r.top) / 2 - size.h / 2
        };
    }
    return {
        left: Math.min(Math.max(r.left, 4), view.w - size.w - 4),
        top: r.bottom + 6 + size.h <= view.h ? r.bottom + 6 : r.top - 6 - size.h
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
    if (!hintOn) hintEl.showPopover();
    hintOn = true;
    var p = hintPos(el.getBoundingClientRect(), { w: hintEl.offsetWidth, h: hintEl.offsetHeight },
        { w: document.documentElement.clientWidth, h: document.documentElement.clientHeight }, beside);
    hintEl.style.left = p.left + 'px';
    hintEl.style.top = p.top + 'px';
}

// The hint instead of the native title; the aria-label keeps the name for screen readers
function setHint(el, text) {
    el.removeAttribute('title');
    el.dataset.hint = text;
    el.setAttribute('aria-label', text);
}

document.addEventListener('mouseover', function (e) {
    var el = e.target.closest && e.target.closest('[data-hint]');
    if (!el || el === hintFor) return;
    hintShow(el, el.dataset.hint.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'), false);
    hintFor = el;
});
document.addEventListener('mouseout', function (e) {
    if (hintFor && !(e.relatedTarget && hintFor.contains(e.relatedTarget))) hintHide();
});
document.addEventListener('mousedown', hintHide);
window.addEventListener('scroll', hintHide, true);
