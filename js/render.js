// Owns: section colors, icons, section buttons, the sections list, render(data)
// Defines globals: SEC_COLORS, sectionColor, makeIcon, coupleHover, sectionButton, jumpTo, jumperList, render
// Uses: prefs, active-section, touch, glow, light, cursor, grid, navigation, links, settings
// strong, saturated colors (no gray): white text (light) or dark text (dark) stays readable
var SEC_COLORS = ['#f85a5a', '#fb8f2a', '#e2a800', '#8ac430', '#2fc16c', '#22b59f', '#18b4d6',
    '#4a92f0', '#6c70f2', '#9a62f0', '#c456e8', '#ea4fa8', '#f4587a', '#f67a3a', '#2fae82'];

// Section color: same lightness and tint, saturation follows --color-intensity (styles.css, "Color" setting)
function sectionColor(idx, intensity) {
    return 'oklch(from ' + SEC_COLORS[idx % SEC_COLORS.length] + ' l calc(c * ' + (intensity || 'var(--color-intensity, 1)') + ') h)';
}

function makeIcon(icon) {
    var i = document.createElement('i');
    // APP section: Font Awesome's fa-square (closest rounded rectangle) instead of our own squircle mask
    if (icon === 'icon-squircle') icon = 'fa-square';
    i.className = 'fa-solid ' + (icon || 'fa-hashtag') + ' secicon';
    i.setAttribute('aria-hidden', 'true');
    return i;
}

// Chip, heading and list entry of a section light up together as soon as one of them is touched
function coupleHover(members) {
    members.forEach(function (el) {
        var others = members.filter(function (x) { return x !== el; });
        var mark = function (name, on) { others.forEach(function (x) { x.classList.toggle(name, on); }); };
        // Touch has no hover: emulated mouse events would swallow the first tap as a hover
        el.addEventListener('pointerenter', function (ev) { if (ev.pointerType === 'mouse') mark('with-hover', true); });
        el.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') { mark('with-hover', false); mark('with-press', false); } });
        el.addEventListener('mousedown', function () { mark('with-press', true); });
        el.addEventListener('mouseup', function () { mark('with-press', false); });
    });
}

// Button of a section (nav chip and entry of the sections list): same shape, same effects (a.sec-btn in styles.css)
function sectionButton(sec, idx, withoutSuffix) {
    var a = document.createElement('a');
    a.className = 'sec-btn';
    a.style.setProperty('--c', sectionColor(idx));
    a.href = '#' + sec.id;
    a.target = '_self';
    a.title = sec.title;
    a.appendChild(makeIcon(sec.icon));
    var t = document.createElement('span');
    t.className = 'secshort';
    t.textContent = withoutSuffix ? sec.title.replace(/\..*$/, '') : sec.title;   // "tbx.li" → "tbx": fits into the narrow list
    a.appendChild(t);
    return a;
}

// Jump to a section (dropdown list)
function jumpTo(hash) {
    selJump = hash;
    jumperValue = hash;
    // Safety net: the last section may never reach the top edge
    setTimeout(function () { selJump = null; syncActive(); }, 1500);
    var el = document.querySelector(hash);
    // Smartphone: the snap point of the page, otherwise the target snaps back to the start of the page
    var destSec = el && el.closest('section');
    if (el) (destSec ? pageStart(destSec).querySelector('.name') || el : el).scrollIntoView();
    // Mouse: the resting pointer is ignored until it moves (also when releasing over an entry, without a pointerdown on it)
    var sec = el && el.closest('section');
    if (sec && !document.body.classList.contains('keyboard') && !document.body.classList.contains('edit-mode')) {
        lockOn(sec, mousePoint ? mousePoint.x : 0, mousePoint ? mousePoint.y : 0, 'nav');
    }
    document.getElementById('section-jumper').blur();
    focusContent(el && el.closest('section'));
}

// Sections list: one entry per section (icon or name), opens instead of the native menu
function jumperList(data) {
    var pop = document.getElementById('jumper-pop'), entry = {};
    pop.innerHTML = '';
    data.forEach(function (sec, idx) {
        var a = sectionButton(sec, idx, true);
        a.addEventListener('click', function (ev) {
            ev.preventDefault();
            pop.hidePopover();
            jumpTo('#' + sec.id);
        });
        // Touch: the tap selects immediately, without waiting for the emulated mouse
        a.addEventListener('pointerup', function (ev) {
            if (ev.pointerType === 'mouse') return;
            ev.preventDefault();
            a.click();
        });
        pop.appendChild(a);
        entry[sec.id] = a;
    });
    return entry;   // section ID → entry, for the coupled highlight
}

(function () {
    var sel = document.getElementById('section-jumper');
    var pop = document.getElementById('jumper-pop');
    function isOpen() { return pop.matches(':popover-open'); }
    function openList() {
        var r = sel.getBoundingClientRect(), upper = r.top > window.innerHeight / 2;
        pop.style.width = r.width + 'px';   // flush with the field, like the settings overlay
        pop.style.setProperty('--set-height', navButtonHeight() + 'px');   // entries as tall as the settings buttons, also in the full-width grid
        pop.style.left = r.left + 'px';
        pop.style.top = upper ? 'auto' : r.bottom + 'px';
        pop.style.bottom = upper ? (window.innerHeight - r.top) + 'px' : 'auto';
        pop.style.maxHeight = (upper ? r.top : window.innerHeight - r.bottom) - 8 + 'px';
        pop.classList.toggle('upward', upper);
        pop.querySelectorAll('a').forEach(function (a) {
            a.classList.toggle('active', a.getAttribute('href') === jumperValue);
        });
        pop.showPopover();
        var ak = pop.querySelector('a.active');
        if (ak) ak.scrollIntoView({ block: 'nearest' });   // the active section is visible on opening
    }
    function entryAt(ev) {
        var el = document.elementFromPoint(ev.clientX, ev.clientY);
        return el && el.closest ? el.closest('#jumper-pop a') : null;
    }
    // press, drag onto an entry, release selects it (like the settings overlay); a simple click opens/closes
    var pressed = false, wasOpen = false;
    var lastTouch = 0;
    sel.addEventListener('mousedown', function (ev) {
        ev.preventDefault();   // no native menu
        if (Date.now() - lastTouch < 800) return;   // emulated mouse after touch: already handled
        pressed = true;
        wasOpen = isOpen();
        if (!wasOpen) openList();
    });
    document.addEventListener('mouseup', function (ev) {
        if (!pressed) return;
        pressed = false;
        var e = entryAt(ev);
        if (e) e.click();
        else if (ev.target.closest('#section-jumper')) { if (wasOpen) pop.hidePopover(); }
        else pop.hidePopover();
    });
    // Touch: tap, drag and release in one go; a simple tap opens/closes
    var dragId = null, dragOpen = false, dragEntry = null;
    function dragMark(e) {
        if (e === dragEntry) return;
        if (dragEntry) dragEntry.classList.remove('with-hover');
        dragEntry = e;
        if (e) e.classList.add('with-hover');
    }
    sel.addEventListener('pointerdown', function (ev) {
        if (ev.pointerType === 'mouse') return;
        ev.preventDefault();
        lastTouch = Date.now();
        dragId = ev.pointerId;
        dragOpen = isOpen();
        if (!dragOpen) openList();
    });
    sel.addEventListener('pointermove', function (ev) {
        if (ev.pointerId === dragId) dragMark(entryAt(ev));
    });
    sel.addEventListener('pointerup', function (ev) {
        if (ev.pointerId !== dragId) return;
        dragId = null;
        lastTouch = Date.now();
        var e = entryAt(ev);
        dragMark(null);
        if (e) e.click();
        else if (dragOpen && ev.target.closest('#section-jumper')) pop.hidePopover();
    });
    sel.addEventListener('pointercancel', function () { dragId = null; dragMark(null); });
    sel.addEventListener('keydown', function (ev) {
        if (!(ev.key === 'Enter' || ev.key === ' ' || ev.key === 'ArrowDown' || ev.key === 'ArrowUp')) return;
        ev.preventDefault();
        openList();
        var ak = pop.querySelector('a.active');
        if (ak) { ak.scrollIntoView({ block: 'nearest' }); ak.focus(); }
    });
    pop.addEventListener('keydown', function (ev) {
        var l = Array.prototype.slice.call(pop.querySelectorAll('a')), i = l.indexOf(document.activeElement);
        if (ev.key === 'ArrowDown') { ev.preventDefault(); l[Math.min(i + 1, l.length - 1)].focus(); }
        else if (ev.key === 'ArrowUp') { ev.preventDefault(); l[Math.max(i - 1, 0)].focus(); }
    });
    pop.addEventListener('toggle', function (ev) {
        sel.setAttribute('aria-expanded', ev.newState === 'open');
        // the list closes under the pointer and no mouseleave comes: undo the coupled highlight
        if (ev.newState !== 'open') document.querySelectorAll('.with-hover, .with-press').forEach(function (x) { x.classList.remove('with-hover', 'with-press'); });
    });
    document.addEventListener('pointerdown', function (ev) {
        if (isOpen() && !ev.target.closest('#jumper-pop, #section-jumper')) pop.hidePopover();
    });
    document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && isOpen()) { pop.hidePopover(); sel.focus(); }
    });
})();

function render(data) {
    var chipOf = {};
    var nav = document.getElementById('section-nav-list');
    var gear = document.getElementById('settings-btn');   // chips come before gear and dropdown
    nav.querySelectorAll('.secname').forEach(function (a) { a.remove(); });

    data.forEach(function (sec, idx) {
        var a = sectionButton(sec, idx);
        a.classList.add('secname');
        // wrapped so the event does not arrive as the focus target
        a.addEventListener('click', function () { focusContent(); });
        nav.insertBefore(a, gear);
        chipOf[sec.id] = a;
    });
    var entryOf = jumperList(data);

    var container = document.getElementById('container');
    container.tabIndex = -1;
    container.innerHTML = '';

    data.forEach(function (sec, idx) {
        var section = document.createElement('section');
        section.style.setProperty('--c', sectionColor(idx));   // inherited by heading and tiles
        section.tabIndex = -1;   // focusable, but not in the tab order

        var h3 = document.createElement('h3');
        h3.id = sec.id;
        h3.className = 'name';
        h3.dataset.color = sec.color || 'cyan';
        h3.dataset.icon = sec.icon || '';

        var titleLink = document.createElement('a');
        titleLink.href = '#' + sec.id;
        titleLink.target = '_self';
        titleLink.appendChild(makeIcon(sec.icon));
        titleLink.appendChild(document.createTextNode(sec.title));
        h3.appendChild(titleLink);
        coupleHover([chipOf[sec.id], entryOf[sec.id], h3]);
        // the mouse anywhere in the section (heading, background, tile): its chip shows the soft hover area (mouse only)
        (function (chip) {
            section.addEventListener('pointerenter', function (ev) { if (ev.pointerType === 'mouse') chip.classList.add('sec-hover'); });
            section.addEventListener('pointerleave', function () { chip.classList.remove('sec-hover'); });
        })(chipOf[sec.id]);

        var ul = document.createElement('ul');
        ul.className = 'group';
        (sec.links || []).forEach(function (link, i) {
            var li = makeLi(link.name, link.url, link.dead);
            li.dataset.name0 = link.name;   // original values for the comparison
            li.dataset.url0 = link.url;
            li.dataset.pos0 = i;
            li.dataset.sec0 = sec.id;
            ul.appendChild(li);
        });

        section.dataset.pos0 = idx;   // starting position of the section for the comparison when saving
        section.appendChild(h3);
        section.appendChild(ul);
        container.appendChild(section);
    });

    applyPrefs();
    trackActiveSection();
    gridInit();
    readMeasures();
    lightInit();
    cursorSecInit();
    glowInit();
    // Reload with #hash: the browser does not jump there on its own in content loaded later,
    // otherwise the content shows the first section while the highlight belongs to the address
    var dest = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
    if (dest) {
        dest.scrollIntoView({ behavior: 'instant' });
        syncActive();
    }
    focusContent();
    document.body.classList.add('rendered');   // until now the nav row is hidden, so its late layout is not a layout shift
}

