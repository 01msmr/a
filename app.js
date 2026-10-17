// ── Ansichts-Einstellungen ────────────────────────────────────────
var PREF_DEFAULTS = { navMode: 'short', align: 'left', view: 'chips', colorMode: 'vivid' };

function getPref(name) {
    try { return localStorage.getItem('a.' + name) || PREF_DEFAULTS[name]; }
    catch (e) { return PREF_DEFAULTS[name]; }
}

function setPref(name, value) {
    try { localStorage.setItem('a.' + name, value); } catch (e) { }
    applyPrefs();
}

function applyPrefs() {
    document.body.classList.toggle('nav-icons', getPref('navMode') === 'icons');
    document.body.classList.toggle('align-center', getPref('align') === 'center');
    document.body.classList.toggle('view-grid', getPref('view') === 'grid');
    document.documentElement.dataset.colorMode = getPref('colorMode');
    if (typeof settingsDisplay === 'function') settingsDisplay();
}


applyPrefs();

// ── Render ────────────────────────────────────────────────────────
var syncActive = function () { };
var lock = { sec: null, x: 0, y: 0, kind: '' };   // nach Klick auf Titel, Chip oder Listeneintrag gesperrte Section (s. fensterZiel); art: 'titel' oder 'nav'
var jumperValue = '';   // Hash der aktiven Section (oder des Sprungziels); die Liste markiert ihn
var selJump = null;   // Ziel eines Sprungs über das Dropdown: es zeigt bis zur Ankunft diese Section

// kräftige, gesättigte Farben (ohne Grauanteil): weiße Schrift (hell) bzw. dunkle Schrift (dunkel) bleibt lesbar
var SEC_COLORS = ['#f85a5a', '#fb8f2a', '#e2a800', '#8ac430', '#2fc16c', '#22b59f', '#18b4d6',
    '#4a92f0', '#6c70f2', '#9a62f0', '#c456e8', '#ea4fa8', '#f4587a', '#f67a3a', '#2fae82'];

// Section-Farbe: gleiche Helligkeit und Tönung, die Sättigung folgt --farb-int (styles.css, Einstellung „Farbe“)
function sectionColor(idx, intensity) {
    return 'oklch(from ' + SEC_COLORS[idx % SEC_COLORS.length] + ' l calc(c * ' + (intensity || 'var(--color-intensity, 1)') + ') h)';
}

function makeIcon(icon) {
    var i = document.createElement('i');
    // APP-Section: Font Awesomes fa-square (nächstes Rundrechteck) statt der eigenen Squircle-Maske
    if (icon === 'icon-squircle') icon = 'fa-square';
    i.className = 'fa-solid ' + (icon || 'fa-hashtag') + ' secicon';
    i.setAttribute('aria-hidden', 'true');
    return i;
}

// Chip, Titel und Listeneintrag einer Section leuchten gemeinsam, sobald einer davon berührt wird
function coupleHover(members) {
    members.forEach(function (el) {
        var others = members.filter(function (x) { return x !== el; });
        var mark = function (name, on) { others.forEach(function (x) { x.classList.toggle(name, on); }); };
        // Touch hat kein Hover: emulierte Maus-Events würden den ersten Tap als Hover verschlucken
        el.addEventListener('pointerenter', function (ev) { if (ev.pointerType === 'mouse') mark('with-hover', true); });
        el.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') { mark('with-hover', false); mark('with-press', false); } });
        el.addEventListener('mousedown', function () { mark('with-press', true); });
        el.addEventListener('mouseup', function () { mark('with-press', false); });
    });
}

// Knopf einer Section (Nav-Chip und Eintrag der Sections-Liste): gleiche Gestalt, gleiche Effekte (a.sec-btn in styles.css)
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
    t.textContent = withoutSuffix ? sec.title.replace(/\..*$/, '') : sec.title;   // „tbx.li“ → „tbx“: passt in die schmale Liste
    a.appendChild(t);
    return a;
}

// Sprung zu einer Section (Dropdown-Liste)
function jumpTo(hash) {
    selJump = hash;
    jumperValue = hash;
    // Auffangnetz: die letzte Section erreicht den oberen Rand evtl. nie
    setTimeout(function () { selJump = null; syncActive(); }, 1500);
    var el = document.querySelector(hash);
    // Smartphone: der Einrastpunkt der Seite, sonst rastet das Ziel auf den Anfang der Seite zurück
    var destSec = el && el.closest('section');
    if (el) (destSec ? pageStart(destSec).querySelector('.name') || el : el).scrollIntoView();
    // Maus: der ruhende Zeiger wird ignoriert, bis er bewegt wird (auch beim Loslassen über einem Eintrag, ohne pointerdown darauf)
    var sec = el && el.closest('section');
    if (sec && !document.body.classList.contains('keyboard') && !document.body.classList.contains('edit-mode')) {
        lockOn(sec, mousePoint ? mousePoint.x : 0, mousePoint ? mousePoint.y : 0, 'nav');
    }
    document.getElementById('section-jumper').blur();
    focusContent(el && el.closest('section'));
}

// Sections-Liste: ein Eintrag je Section (Icon oder Name), öffnet statt des nativen Menüs
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
        // Touch: der Tap wählt sofort, ohne auf die emulierte Maus zu warten
        a.addEventListener('pointerup', function (ev) {
            if (ev.pointerType === 'mouse') return;
            ev.preventDefault();
            a.click();
        });
        pop.appendChild(a);
        entry[sec.id] = a;
    });
    return entry;   // Section-ID → Eintrag, für die gekoppelte Hervorhebung
}

(function () {
    var sel = document.getElementById('section-jumper');
    var pop = document.getElementById('jumper-pop');
    function isOpen() { return pop.matches(':popover-open'); }
    function openList() {
        var r = sel.getBoundingClientRect(), upper = r.top > window.innerHeight / 2;
        pop.style.width = r.width + 'px';   // bündig mit dem Feld, wie das Einstellungs-Overlay
        pop.style.setProperty('--set-height', navButtonHeight() + 'px');   // Einträge so hoch wie die Einstellungs-Knöpfe, auch im Raster mit voller Breite
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
        if (ak) ak.scrollIntoView({ block: 'nearest' });   // die aktive Section ist beim Öffnen sichtbar
    }
    function entryAt(ev) {
        var el = document.elementFromPoint(ev.clientX, ev.clientY);
        return el && el.closest ? el.closest('#jumper-pop a') : null;
    }
    // drücken, auf einen Eintrag ziehen, loslassen wählt ihn (wie beim Einstellungs-Overlay); ein einfacher Klick öffnet/schließt
    var pressed = false, wasOpen = false;
    var lastTouch = 0;
    sel.addEventListener('mousedown', function (ev) {
        ev.preventDefault();   // kein natives Menü
        if (Date.now() - lastTouch < 800) return;   // emulierte Maus nach Touch: schon behandelt
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
    // Touch: antippen, ziehen und loslassen in einem Zug; ein einfacher Tap öffnet/schließt
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
        // schließt die Liste unter dem Zeiger, kommt kein mouseleave: die gekoppelte Hervorhebung zurücknehmen
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
    var gear = document.getElementById('settings-btn');   // Chips stehen vor Zahnrad und Dropdown
    nav.querySelectorAll('.secname').forEach(function (a) { a.remove(); });

    data.forEach(function (sec, idx) {
        var a = sectionButton(sec, idx);
        a.classList.add('secname');
        // gewickelt, damit nicht das Event als Fokusziel ankommt
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
        section.style.setProperty('--c', sectionColor(idx));   // erbt an Titel und Kacheln
        section.tabIndex = -1;   // fokussierbar, aber nicht in der Tab-Reihenfolge

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
        // die Maus irgendwo in der Section (Titel, Hintergrund, Kachel): ihr Chip zeigt die weiche Hover-Fläche (nur Maus)
        (function (chip) {
            section.addEventListener('pointerenter', function (ev) { if (ev.pointerType === 'mouse') chip.classList.add('sec-hover'); });
            section.addEventListener('pointerleave', function () { chip.classList.remove('sec-hover'); });
        })(chipOf[sec.id]);

        var ul = document.createElement('ul');
        ul.className = 'group';
        (sec.links || []).forEach(function (link, i) {
            var li = makeLi(link.name, link.url, link.dead);
            li.dataset.name0 = link.name;   // Ursprungswerte für den Vergleich
            li.dataset.url0 = link.url;
            li.dataset.pos0 = i;
            li.dataset.sec0 = sec.id;
            ul.appendChild(li);
        });

        section.dataset.pos0 = idx;   // Ausgangsposition der Section für den Vergleich beim Speichern
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
    // Reload mit #hash: der Browser springt in nachgeladenem Inhalt nicht selbst dorthin,
    // sonst zeigt der Inhalt die erste Section, während die Markierung zur Adresse gehört
    var dest = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
    if (dest) {
        dest.scrollIntoView({ behavior: 'instant' });
        syncActive();
    }
    focusContent();
}

// Ersatz für scrollend ohne Wartezeit: ruft fn, sobald die Scrollposition zwei Frames lang stillsteht
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

// Oberste sichtbare Section: Chip invertiert, Dropdown nachgeführt.
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
            if (h3.getBoundingClientRect().top - top <= 24) {   // schon kurz vor dem Einrasten aktiv
                active = '#' + h3.id;
                activeEl = h3;
            }
        });
        // Der aktive Chip folgt nur der Scrollposition, nie der Maus: über einer Section, einem Titel oder einer Kachel zeigt ihr Chip
        // die weiche Hover-Fläche (.sec-hover bzw. .mit-hover), der aktive Chip bleibt unverändert
        var nav = active;
        // nach dem Klick auf Titel oder Chip bleibt dessen Chip aktiv, bis Maus oder Tastatur sich rühren
        var locked = lock.sec && !document.body.classList.contains('keyboard') && lock.sec.querySelector('h3.name');
        if (locked) nav = '#' + locked.id;
        chips.forEach(function (chip) {
            chip.classList.toggle('active', chip.hash === nav);
        });
        headings.forEach(function (h3) {
            var fits = '#' + h3.id === active;
            h3.classList.toggle('active', fits);
            // Section markieren — greift auch beim Scrollen von Hand
            h3.closest('section').classList.toggle('current', fits);
        });
        // angedockter Header → Rahmen der Leiste mitfärben, kein heller Spalt
        document.body.classList.toggle('docked',
            !!activeEl && activeEl.getBoundingClientRect().top - top <= 1);
        if (selJump === null || selJump === active) { selJump = null; jumperValue = active; }
        jumpTarget = null;   // Scrollen zur Ruhe gekommen
    };

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Tab' || e.key.indexOf('Arrow') === 0) setTimeout(syncActive);
    });

    // erst nach Scroll-Ruhe nachziehen
    // während des Scrollens alle 80 ms nachziehen (auch bei sehr langsamem Wischen), am Ende (scrollend oder Ruhe) ein letztes Mal
    var last = 0;
    container.addEventListener('scroll', function () {
        clearTimeout(timer);
        var now = performance.now();
        if (now - last > 80) { last = now; syncActive(); }
        whenStill(syncActive);   // scrollend kommt auf iOS nicht immer: Ruhe zusätzlich selbst erkennen
    });
    container.addEventListener('scrollend', function () { clearTimeout(timer); syncActive(); });
    syncActive();
}

// Zahlen aus den CSS-Variablen (:root in styles.css), einmal gelesen
var measures = {};
function readMeasures() {
    var cs = getComputedStyle(document.documentElement);
    ['glow-duration', 'glow-duration-short', 'glide-power', 'light-duration', 'light-power', 'light-edge-duration', 'light-coverage',
        'ghost-header-shadow', 'ghost-header-fade', 'ghost-header-hold', 'cursor-line-faint'].forEach(function (n) {
        measures[n] = parseFloat(cs.getPropertyValue('--' + n));
    });
}
function glide(t) { return Math.pow(t, measures['glide-power']); }
readMeasures();

// ── Leuchtfenster ─────────────────────────────────────────────────
// Die leuchtende Section (Hover, Nav-Chip, Tastatur, sonst die oberste) ist ein Fenster, das zur
// nächsten gleitet und dabei wächst bzw. schrumpft. Die Farbe wechselt hart an den Section-Kanten:
// jede Section malt nur ihren Teil des Fensters als Hintergrund. Zeilen (Titel, Gruppe, Kacheln)
// bekommen .gedeckt, sobald ihre Mitte im Fenster liegt. Maße liegen im Inhalt, Scrollen ändert sie nicht.
var glow = {
    container: null, secs: [], rows: [], sig: '', top: 0, bot: 0, dest: null,
    from: null, to: null, t0: 0, duration: 0, raf: 0, obs: []
};

// ── Zeigerart ─────────────────────────────────────────────────────
// Maus oder Finger/Stift, wie beim letzten pointerdown (Mausbewegung stellt zurück). Touch hat kein Hover: das von iOS
// hängengelassene :hover zählt nicht, deshalb schaltet body.touch in styles.css alle Hover- und Druckeffekte ab.
var PHONE_QUERY = 'only screen and (min-device-width: 350px) and (max-device-width: 812px)';
function isPhone() { return matchMedia(PHONE_QUERY).matches; }

var pointerKind = 'mouse';
function isTouch() { return pointerKind !== 'mouse'; }
function setPointerKind(kind) {
    pointerKind = kind;
    document.body.classList.toggle('touch', kind !== 'mouse');
    // Touch hat keinen Zeiger: das Kachel-Licht darf nicht an der Berührungsstelle auf dem Bildschirm hängenbleiben, während darunter gescrollt wird
    if (kind !== 'mouse') { lightMouse = null; mousePoint = null; lightReset(); }
}

// Nach dem Klick auf einen Titel, Nav-Chip oder Listeneintrag scrollt die Section nach oben, und der ruhende Zeiger liegt danach über einer anderen.
// Bis zur nächsten echten Mausbewegung (mehr als 4 px), einem anderen Klick oder (nur nach einem Titelklick) einem Tastendruck bleibt die angeklickte Section das Ziel.

// art: 'titel' (ein Tastendruck löst die Sperre) oder 'nav' (Chip oder Listeneintrag)
function lockOn(sec, x, y, kind) {
    lock.sec = sec;
    lock.kind = kind;
    lock.x = x; lock.y = y;
    document.body.classList.add('locked');
    lightReset();
    glowSync();
    syncActive();
}

function lockOff() {
    if (!lock.sec) return;
    lock.sec = null;
    lock.kind = '';
    document.body.classList.remove('locked');
    glowSync();
    syncActive();
    lightPlan();
}

// schon beim Drücken, damit der Chip sofort aktiv ist (kein Hover-/Druck-Zustand) und der Zeiger beim Hochscrollen verschwindet
// Maus: schon beim Drücken. Touch: erst beim Klick, damit ein Wisch über die Chips oder den Titel nichts aktiviert
function lockFromEvent(e, touch) {
    var dest = (touch || e.button === 0) && !document.body.classList.contains('edit-mode') && e.target.closest && e.target.closest('#container .name a, a.sec-btn');
    var sec = dest && (dest.matches('a.sec-btn') ? (document.querySelector(dest.getAttribute('href')) || dest).closest('section') : dest.closest('section'));
    // Touch: auch ein Tap auf Hintergrund oder Kachel aktiviert die Section (es gibt kein Hover)
    if (!sec && touch && !document.body.classList.contains('edit-mode') && e.target.closest) { sec = e.target.closest('#container section'); dest = null; }
    if (!sec) { lockOff(); return; }
    lockOn(sec, e.clientX, e.clientY, dest && dest.matches('a.sec-btn') ? 'nav' : 'title');
}
document.addEventListener('pointerdown', function (e) {
    setPointerKind(e.pointerType);
    if (!isTouch()) lockFromEvent(e, false);
}, true);
document.addEventListener('click', function (e) {
    if (isTouch() && e.detail !== undefined) lockFromEvent(e, true);
}, true);
document.addEventListener('mousemove', function (e) {
    if (lock.sec && Math.hypot(e.clientX - lock.x, e.clientY - lock.y) > 4) lockOff();
}, { passive: true });
// ein Tastendruck hebt nur die Sperre nach einem Titelklick auf, nicht die nach einem Chipklick
document.addEventListener('keydown', function () { if (lock.kind === 'title') lockOff(); });

document.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'mouse' && isTouch()) setPointerKind('mouse');
}, true);

// ── Touch-Wischen ─────────────────────────────────────────────────
// Solange der Inhalt scrollt (samt Auslauf), ist das Fenster an die Scrollposition gekoppelt (fensterScroll) und die Chips zeigen keine Hover-Optik (html.swiping).
var swiping = false;
// Das Wischen endet erst, wenn der Finger oben ist: hält er beim Ziehen kurz still, ruht zwar das Scrollen, es geht aber gleich weiter
var fingerDown = false;
document.addEventListener('touchstart', function () { fingerDown = true; }, { passive: true, capture: true });
['touchend', 'touchcancel'].forEach(function (n) {
    document.addEventListener(n, function () { fingerDown = false; if (swiping) whenStill(swipeEnd); }, { passive: true, capture: true });
});

function swipeEnd() {
    if (fingerDown) return;
    swiping = false;
    document.documentElement.classList.remove('swiping');
    glowSync();
}
document.addEventListener('scrollend', function () { if (swiping) swipeEnd(); }, true);
// Wischen mit dem Finger beendet die Klick-Sperre (die Maus tut das per Bewegung)
document.addEventListener('touchmove', function () { if (lock.sec) lockOff(); }, { passive: true });
document.addEventListener('scroll', function () {
    if (!isTouch()) return;
    swiping = true;
    // nicht am body: dessen Klassenwechsel löst eine Neuvermessung aus und stört den Auslauf
    document.documentElement.classList.add('swiping');
    whenStill(swipeEnd);
}, true);

function glowTarget() {
    var c = glow.container, s = null, hot = true;
    if (document.body.classList.contains('keyboard')) {
        s = c.querySelector('section:focus-visible') || c.querySelector('section:has(:focus-visible)');
    } else if (lock.sec) {
        s = lock.sec;
    } else {
        s = isTouch() ? null : c.querySelector('section:hover');
        if (!s && !isTouch()) {
            // auch der Chip der aktiven Section zählt: ihr Titel zeigt dieselbe Hover-Fläche wie jeder andere
            var h = c.querySelector('.name.with-hover');
            s = h && h.closest('section');
        }
    }
    if (!s) { s = c.querySelector('section.current'); hot = false; }
    return s ? { sec: s, hot: hot } : null;
}

// misst alle Section- und Zeilenmitten im Inhalt; true, wenn sich etwas verschoben hat
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
            // die letzte Kachel meldet ihrer Gruppe, ob die letzte Zeile gedeckt ist (leere Rasterfelder)
            rows.push({ el: li, y: y(rl) + Math.round(rl.height / 2), on: null, end: i === lis.length - 1 ? group : null });
            // die untere Rasterlinie schaltet an der Unterkante der Zeile, nicht in ihrer Mitte
            rows.push({ el: li, y: y(rl) + Math.round(rl.height) - 1, on: null, cls: 'covered-bottom' });
        });
        // leere Felder der letzten Rasterzeile (Spalten minus Rest), für ::after der Gruppe
        if (group) {
            var columns = getComputedStyle(group).gridTemplateColumns.split(' ').length;
            var empty = lis.length ? (columns - lis.length % columns) % columns : columns;
            group.style.setProperty('--empty', empty);
            group.classList.toggle('full', empty === 0 || getComputedStyle(group).display !== 'grid');
        }
    });
    if (buildPages(c, secs)) return glowMeasure();   // Füllraum geändert: die Lage der folgenden Sections neu messen
    secs.forEach(function (s) { sig.push(s.y, s.h); });
    rows.forEach(function (z) { sig.push(z.y); });
    sig = sig.join(',');
    // Zustand der alten Zeilen mitnehmen, damit nichts flackert
    // (eine Zeile kann zwei Zustände haben: Mitte .gedeckt, Unterkante .gedeckt-u)
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
        // bis zur Unterkante der Section gedeckt: 1 px darüber hinaus malen (der Rest wird beschnitten), sonst bleibt bei gebrochener Höhe ein Streifen
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
            // Smartphone: das Fenster deckt die ganze Seite (beide Sections eines Paares)
            var p = isPhone() && glow.pageIdx && glow.pageIdx.filter(function (q) { return q.indexOf(i) >= 0; })[0];
            if (p && p.length > 1) {
                var a = glow.secs[p[0]], b = glow.secs[p[p.length - 1]];
                return { top: a.y, bot: b.y + b.h };
            }
            return { top: s.y, bot: s.y + s.h };
        }
    }
    return { top: 0, bot: 0 };
}

function glowStep(now) {
    var f = glow, t = Math.min(1, (now - f.t0) / f.duration);
    // beschleunigt von Anfang an und endet hart: kein Auslaufen
    var e = glide(t);
    glowPaint(f.from.top + (f.to.top - f.from.top) * e, f.from.bot + (f.to.bot - f.from.bot) * e);
    f.raf = t < 1 ? requestAnimationFrame(glowStep) : 0;
}

// sofort ans Ziel (Start, Layoutwechsel) oder gleitend
function glowTo(dest, animated) {
    var f = glow;
    cancelAnimationFrame(f.raf); f.raf = 0;
    var to = glowFrame(dest && dest.sec);
    if (!animated) { glowPaint(to.top, to.bot); return; }
    // reduzierte Bewegung heißt kürzer, nicht keine
    var short = matchMedia('(prefers-reduced-motion: reduce)').matches;
    f.from = { top: f.top, bot: f.bot }; f.to = to;
    f.duration = short ? measures['glow-duration-short'] : measures['glow-duration'];
    f.t0 = performance.now();
    f.raf = requestAnimationFrame(glowStep);
}

// Smartphone: Seiten aus Sections. Zwei aufeinanderfolgende halbhohe Sections bilden eine Seite (ein Einrastpunkt, beide zugleich auf dem
// Bildschirm); eine übrig bleibende halbhohe Section bleibt allein (die untere Hälfte bleibt leer); eine größere Section beginnt immer
// eine eigene Seite und ist, wenn höher als der Bildschirm, darin frei scrollbar. Der Einrastpunkt ist die erste Section jeder Seite
// (.page-start, styles.css). Jede Seite ist ein Rahmen (y bis bot) für das Fenster; pageIdx hält die Section-Nummern je Seite.
function buildPages(c, secs) {
    var phone = isPhone() && !document.body.classList.contains('edit-mode');
    var H = c.clientHeight, pages = [], i = 0;
    var isHalf = function (s) { return s.h <= H * 0.5 + 3; };
    while (i < secs.length) {
        if (phone && isHalf(secs[i]) && i + 1 < secs.length && isHalf(secs[i + 1])) { pages.push([i, i + 1]); i += 2; }
        else { pages.push([i]); i++; }
    }
    glow.pageIdx = pages;
    glow.pages = pages.map(function (p) {
        var a = secs[p[0]], b = secs[p[p.length - 1]];
        return { y: a.y, h: b.y + b.h - a.y };
    });
    var starts = {}, lone = {}, changed = false;
    pages.forEach(function (p) { starts[p[0]] = true; if (p.length === 1 && isHalf(secs[p[0]])) lone[p[0]] = true; });
    secs.forEach(function (s, k) {
        var want = phone && !!starts[k];
        if (s.el.classList.contains('page-start') !== want) s.el.classList.toggle('page-start', want);
        // eine allein stehende halbhohe Section bekommt eine leere halbhohe Section dahinter (Füllraum), auch als letzte:
        // so bleibt die Seite voll, und eine folgende größere Section beginnt auf einer eigenen Seite
        var filler = phone && lone[k] ? Math.max(0, Math.round(H - s.h)) + 'px' : '';
        if (s.el.style.marginBottom !== filler) { s.el.style.marginBottom = filler; changed = true; }
    });
    return changed;
}

// Section, die auf dem Smartphone den Einrastpunkt ihrer Seite bildet (sonst die Section selbst): dorthin springen Dropdown, Stepper und Pfeile
function pageStart(sec) {
    var secs = document.querySelectorAll('#container section');
    var idx = Array.prototype.indexOf.call(secs, sec);
    if (idx < 0 || !glow.pageIdx || !isPhone() || document.body.classList.contains('edit-mode')) return sec;
    for (var k = 0; k < glow.pageIdx.length; k++) {
        if (glow.pageIdx[k].indexOf(idx) >= 0) return secs[glow.pageIdx[k][0]];
    }
    return sec;
}

// Touch: beim Scrollen ist das Fenster eine Funktion der Scrollposition. Zwischen zwei Section-Oberkanten geht es vom Rahmen der einen
// zu dem der nächsten über (Oberkante = Scrollposition), am Einrastpunkt deckt es genau die Section. So läuft es mit dem Finger und dem
// Auslauf, ohne eigene Zeit: kein Vorauseilen, Zurückbleiben oder Zucken bei Zielwechseln. Die letzte Section erreicht die Oberkante evtl. nie:
// Ihr Übergang endet beim größten Scrollweg.
function glowScroll() {
    var f = glow, c = f.container, l = f.pages && f.pages.length ? f.pages : f.secs;
    if (!l.length) return;
    cancelAnimationFrame(f.raf); f.raf = 0;
    f.dest = null;   // danach neu bestimmen
    var st = c.scrollTop, max = c.scrollHeight - c.clientHeight, i = 0;
    while (i + 1 < l.length && l[i + 1].y <= st + 0.5) i++;
    var a = l[i], top = a.y, bot = a.y + a.h;
    if (i + 1 < l.length) {
        var b = l[i + 1], end = Math.min(b.y, max), p = end > a.y ? Math.max(0, Math.min(1, (st - a.y) / (end - a.y))) : 0;
        top = a.y + (b.y - a.y) * p;
        bot = a.y + a.h + (b.y + b.h - a.y - a.h) * p;
    }
    // Übergang vom Tap-Ziel (oder einer Animation) in die Kopplung: der Abstand zum Rahmen der Scrollposition klingt in 280 ms ab (Smoothstep),
    // statt dass das Fenster dorthin springt (das ließ die Unterkante nach dem Tippen und Scrollen ruckeln)
    var now = performance.now();
    if (!f.inScroll) { f.inScroll = true; f.offset = { top: f.top - top, bot: f.bot - bot, t0: now }; }
    var v = f.offset, t = v ? Math.min(1, (now - v.t0) / 280) : 1, k = v ? 1 - t * t * (3 - 2 * t) : 0;   // Smoothstep: ohne Ruck am Anfang und am Ende
    if (v && t >= 1) { f.offset = v = null; k = 0; }
    glowPaint(top + (v ? v.top * k : 0), bot + (v ? v.bot * k : 0));
    if (v) f.raf = requestAnimationFrame(glowScroll);   // weiter abklingen, auch wenn das Scrollen kurz ruht
}

function glowSync() {
    var f = glow;
    if (!f.container) return;
    ghostHeaderRender();
    if (isTouch() && !document.body.classList.contains('keyboard') && (swiping || !lock.sec)) {
        f.container.querySelectorAll('section.hot').forEach(function (s) { s.classList.remove('hot'); });
        glowScroll();
        return;
    }
    f.inScroll = false;   // nicht an die Scrollposition gekoppelt: beim nächsten Übergang neu ansetzen
    var z = glowTarget();
    f.container.querySelectorAll('section.hot').forEach(function (s) {
        if (!z || s !== z.sec || !z.hot) s.classList.remove('hot');
    });
    if (z && z.hot) z.sec.classList.add('hot');
    if (z && z.sec === f.dest) return;
    var first = !f.dest;
    f.dest = z && z.sec;
    glowTo(z, !first);
}

function glowLayout() {
    var f = glow;
    if (!f.container || !glowMeasure()) return;
    f.dest = null;   // neu bestimmen und ohne Gleiten setzen
    glowSync();
}

function glowPlan(fn) {
    var id = 0;
    return function () {
        cancelAnimationFrame(id);
        id = requestAnimationFrame(fn);
    };
}

// Beobachter mit Notbremse: ändert ein Aufruf das Beobachtete wieder (z. B. classList.remove ohne Wirkung zählt als Änderung),
// ruft er sich in derselben Aufgabe endlos neu auf und friert die Seite ein. Nach 500 Aufrufen ohne Atempause wird er getrennt.
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
    f.container = c; f.rows = []; f.secs = []; f.sig = ''; f.dest = null; f.top = f.bot = 0;
    glowMeasure();
    glowSync();

    var layout = glowPlan(glowLayout), sync = glowPlan(glowSync);
    var ro = new ResizeObserver(layout);
    ro.observe(c);
    c.querySelectorAll('section').forEach(function (s) { ro.observe(s); });
    // Klassen (aktuell, mit-hover, tastatur) ändern das Ziel; neue Kacheln und Ansichtswechsel die Maße
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

// Ereignisse hängen am Dokument und gelten für jeden Durchlauf von fensterInit
['mouseover', 'mouseout', 'focusin', 'focusout', 'keydown'].forEach(function (n) {
    document.addEventListener(n, glowPlan(glowSync));
});
document.addEventListener('scroll', glowPlan(glowSync), true);
window.addEventListener('resize', glowPlan(glowLayout));
if (document.fonts && document.fonts.ready) document.fonts.ready.then(glowPlan(glowLayout));

// ── Ghost headers (Geist-Titel) ───────────────────────────────────────────────────
// Liegt der Titel der Ziel-Section (Nav-Chip unter der Maus oder Sprung nach Klick) außerhalb der Ansicht,
// klebt eine Kopie am oberen bzw. unteren Rand, bis der echte Titel dort ankommt und natürlich weiterläuft.
// Wechselt das Ziel, gleitet die neue Kopie über die vorige.
// Die Kopien stapeln sich: stapel liegt von unten nach oben, cur ist die oberste (das aktuelle Ziel). Am oberen Rand liegt die Kopie
// der frühesten Section oben, am unteren Rand die der spätesten: ein früheres Ziel legt sich darüber, ein späteres lässt die Kopien davor
// hinausgleiten; kehrt das Ziel zu einer Kopie im Stapel zurück, gleiten die darüber hinaus und sie ist wieder frei.
var ghostHeader = { layer: null, cur: null, stack: [], leaving: [], jump: null, jumpTimer: 0, removeTimer: 0, underTimer: 0, free: 0, followTimer: 0 };

// Lage außerhalb der Ansicht: die Kopie samt Schatten (--schatten) und Linie liegt ganz draußen
function ghostHeaderOffscreen(edge) {
    return edge === 'top' ? 'translateY(calc(-100% - var(--shadow, 1.5rem) - 2px))' : 'translateY(calc(100% + var(--shadow, 1.5rem) + 2px))';
}

function ghostHeaderDuration() {
    // 400 ms, bei reduzierter Bewegung kurz wie das Fenster
    return matchMedia('(prefers-reduced-motion: reduce)').matches ? measures['glow-duration-short'] : 400;
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

// Sprung (Klick, Dropdown, Pfeiltasten): die Kopie bleibt, bis der Titel in der Ansicht ist
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
    if (pale) {   // Übergabe an den echten Titel: kurz ausblenden, damit ein Versatz von wenigen Pixeln nicht springt
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
    // Smartphone: keine Ghost headers, die Titel bleiben an ihrer Section und scrollen mit ihr aus der Ansicht
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
            // angekommen: die Kopie liegt über dem echten Titel, bis das Fenster ihn gedeckt hat (sonst blitzt er grau auf)
            var upper = r.top - cr.top + c.scrollTop, f = glow;
            var covered = name.classList.contains('covered') && f.top <= upper + 0.5 && f.bot >= upper + heightPx - 0.5;   // Zeile ganz im Fenster
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
    // Wechsel laufen einzeln: läuft einer, wartet das Ziel auf dessen Ende, und nur das letzte zählt.
    // So gleiten bei schnellem Überfahren mehrerer Chips nie mehrere Kopien gleichzeitig wie ein Fächer.
    function waitForEnd() {
        if (now >= ghostHeader.free) return false;
        clearTimeout(ghostHeader.followTimer);
        ghostHeader.followTimer = setTimeout(ghostHeaderRender, ghostHeader.free - now + 10);
        return true;
    }
    function followStep() {   // der nächste Schritt (Stapel Stück für Stück abbauen oder aufbauen) nach diesem Wechsel
        clearTimeout(ghostHeader.followTimer);
        ghostHeader.followTimer = setTimeout(ghostHeaderRender, ghostHeader.free - performance.now() + 10);
    }
    // ein- und hinausgleiten: ease-out (schnell am Anfang, langsam am Ende)
    var curve = 'transform ' + ghostHeaderDuration() + 'ms cubic-bezier(.215, .61, .355, 1)';
    function slideOut(g) {   // gleitet samt Schatten und Linie hinaus und wird danach entfernt
        g.el.style.transition = curve;
        g.el.style.transform = ghostHeaderOffscreen(g.edge);
        g.el.classList.add('out');   // Schatten und Linie blenden am Ende des Hinausgleitens schnell aus (styles.css)
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
    // Die Kopien gleiten gemeinsam hinaus (ein Wechsel), die oberste der übrigen wird frei und bekommt ihren Schatten zurück
    function slideOutAll(list, pale) {
        list.forEach(function (g) { if (pale && g.sec === sec) ghostHeaderRemove(g, false, true); else slideOut(g); });
        ghostHeader.stack = ghostHeader.stack.filter(function (g) { return list.indexOf(g) < 0; });
        var released = ghostHeader.stack[ghostHeader.stack.length - 1] || null;
        if (released) released.el.classList.remove('under');
        ghostHeader.cur = released;
        scheduleRemoval();
    }
    if (!edge) {
        // Kein Ziel oder sein Titel steht in der Ansicht: alle Kopien gleiten hinaus
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
    // nach einem Klick läuft der Schatten aus, je näher der echte Titel seiner Stelle kommt; dort ist er weg
    var strength = sec === ghostHeader.jump ? Math.min(1, distance / (measures['ghost-header-fade'] * heightPx)) : 1;
    // darunterliegende Kopien, deren echter Titel inzwischen in der Ansicht steht, verschwinden
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
    // Es wechselt etwas
    if (waitForEnd()) return;
    ghostHeader.free = now + ghostHeaderDuration();
    // anderer Rand: erst gleitet der ganze Stapel hinaus, danach beginnt der neue
    if (cur && cur.edge !== edge) {
        slideOutAll(ghostHeader.stack.slice(), false);
        followStep();
        return;
    }
    // das Ziel liegt schon im Stapel: die Kopien darüber gleiten gemeinsam hinaus, es ist wieder frei
    var pos = ghostHeader.stack.findIndex(function (g) { return g.sec === sec; });
    if (pos >= 0) {
        slideOutAll(ghostHeader.stack.slice(pos + 1), false);
        refresh(ghostHeader.stack[pos]);
        return;
    }
    // Neues Ziel: Kopien, die weiter weg liegen als das Ziel, gleiten zuerst hinaus (Schritt 2, das Einfahren, folgt nach diesem Wechsel);
    // die näheren bleiben darunter. Schnelles Überfahren lässt Zwischenschritte aus (nur das letzte Ziel zählt).
    var targetRank = ghostHeaderRank(sec, edge);
    var further = ghostHeader.stack.filter(function (g) { return ghostHeaderRank(g.sec, edge) > targetRank; });
    if (further.length) { slideOutAll(further, false); followStep(); return; }
    // Der Stapel enthält alle Sections zwischen der Ansicht und dem Ziel: die dazwischen liegen fertig unter dem Ziel (ohne Schatten und Linie)
    // und werden beim Rückweg freigelegt, ohne vorher herunterzugleiten
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
    // die bisher oberste liegt jetzt unter dem Ziel: kein zweiter Schatten und keine zweite Linie (sonst wird es immer dunkler); erst wenn das Ziel da ist, damit keine Lücke entsteht
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
    // das Ziel gleitet ein, samt Schatten und Linie
    fresh.el.style.transform = ghostHeaderOffscreen(edge);
    fresh.el.getBoundingClientRect();   // Ausgangslage festschreiben
    // beschleunigt und endet hart, wie das Fenster
    fresh.el.style.transition = curve;
    fresh.el.style.transform = 'none';
    ghostHeader.cur = fresh;
    scheduleRemoval();
}

// Rand, an dem der Titel einer Section außerhalb der Ansicht liegt ('top', 'bottom'); null, wenn er in der Ansicht steht
function ghostHeaderEdge(sec, cr, tall) {
    var r = sec.querySelector('.name').getBoundingClientRect();
    if (r.top < cr.top - 0.5) return 'top';
    if (r.top > cr.top + tall - r.height + 0.5) return 'bottom';
    return null;
}

// Entfernung von der Ansicht: größer heißt weiter weg (oben die früheren Sections, unten die späteren)
function ghostHeaderRank(sec, edge) {
    return edge === 'top' ? -ghostHeaderIndex(sec) : ghostHeaderIndex(sec);
}

// Eine Kopie des Titels, am Rand ausgerichtet (Ausgangslage: an ihrem Platz)
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

// Position einer Section im Inhalt (Reihenfolge der Titel)
function ghostHeaderIndex(sec) {
    return Array.prototype.indexOf.call(glow.container.querySelectorAll('section'), sec);
}

function ghostHeaderReset() {
    clearTimeout(ghostHeader.removeTimer); clearTimeout(ghostHeader.jumpTimer); clearTimeout(ghostHeader.underTimer); clearTimeout(ghostHeader.followTimer); ghostHeader.free = 0;
    if (ghostHeader.layer) ghostHeader.layer.innerHTML = '';
    ghostHeader.cur = null; ghostHeader.stack = []; ghostHeader.leaving = []; ghostHeader.jump = null;
}

// ── Kachel-Licht (Chips und Raster) ───────────────────────────────
// Die Hover-Fläche der Kachel ist ein einzelnes Element, das von Kachel zu Kachel gleitet
// (beschleunigt, endet hart). Aus dem Nichts kommt sie in voller Größe von außen in die Kachel
// und verlässt sie genauso, beschnitten auf die Kachel; nichts skaliert. Sie liegt im Inhalt und scrollt mit.
// modus: 'aus' (unsichtbar), 'ein' (auf einer Kachel oder unterwegs dorthin), 'raus' (verlässt die Kachel).
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
    // beschnitten auf das Rechteck der Kachel (ohne Rundung) als festes Fenster im Raum: nur der Teil des Lichts darin zeigt sich
    s.clipPath = k
        ? 'xywh(' + (k.x - r.x) + 'px ' + (k.y - r.y) + 'px ' + k.w + 'px ' + k.h + 'px)'
        : '';
}

// Rundung der Kachelfläche (a::before), damit Licht und Beschnitt exakt wie die Kachel gerundet sind
function lightRadius(a) {
    light.radius = parseFloat(getComputedStyle(a, '::before').borderTopLeftRadius) || 0;
    light.el.style.borderRadius = light.radius + 'px';
}

// Der Strich-Cursor sitzt im Licht und gleitet mit: Lage relativ zum Licht = Zeiger relativ zur Zielkachel; Farbe der Section
function lightLine(li, mouseX) {
    var sec = li.closest('section');
    light.el.style.setProperty('--sc', sec ? sec.style.getPropertyValue('--c') : '');
    if (mouseX == null) return;
    light.cursor.style.left = (mouseX - li.querySelector('a').getBoundingClientRect().left) + 'px';
}

// Anteil der Kachel, den das Licht deckt
function lightCoverage(r, k) {
    if (!r || !k || !k.w || !k.h) return 0;
    var w = Math.max(0, Math.min(r.x + r.w, k.x + k.w) - Math.max(r.x, k.x));
    var h = Math.max(0, Math.min(r.y + r.h, k.y + k.h) - Math.max(r.y, k.y));
    return (w * h) / (k.w * k.h);
}

// Die Schrift einer Kachel kehrt um (.da), solange das Licht sie zu mindestens 95 % deckt.
// Geprüft werden nur die Zielkachel, die verlassene und alle bisher umgekehrten: so bleibt keine hängen.
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

// Die Zelle unter dem Licht (und die verlassene) trägt die Section-Farbe sofort, ohne auf das Fenster zu warten.
// Zwei Flächen im Inhalt unter dem Licht; so liegen sie sicher hinter der hellen Kachelfläche.
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

// Kante der Kachel, der der Zeiger am nächsten ist (ohne Zeiger: links)
function lightEdge(a, pos) {
    if (!pos) return 'l';
    var r = a.getBoundingClientRect();
    var d = { l: Math.abs(pos.x - r.left), r: Math.abs(r.right - pos.x), t: Math.abs(pos.y - r.top), b: Math.abs(r.bottom - pos.y) };
    var m = Math.min(d.l, d.r, d.t, d.b);
    return m === d.l ? 'l' : m === d.r ? 'r' : m === d.t ? 't' : 'b';
}

// die Kachel um ihre eigene Größe über die Kante hinaus verschoben: das Licht "draußen"
function lightOutside(n, rim) {
    var o = { x: n.x, y: n.y, w: n.w, h: n.h };
    if (rim === 'l') o.x = n.x - n.w;
    else if (rim === 'r') o.x = n.x + n.w;
    else if (rim === 't') o.y = n.y - n.h;
    else o.y = n.y + n.h;
    return o;
}

// sofort weg, ohne Bewegung
function lightReset() {
    cancelAnimationFrame(light.raf); light.raf = 0; light.end = null;
    light.mode = 'off'; light.tile = null; light.old = null; light.clip = null;
    light.inverted.forEach(function (li) { li.classList.remove('inverted'); });
    light.inverted.clear();
    lightCells();
    if (!light.el) return;
    light.el.style.opacity = '0';
    light.el.style.clipPath = '';
    // nur wenn gesetzt: classList.remove löst auch ohne Änderung den Body-Beobachter aus (Endlosschleife im Edit-Mode)
    if (document.body.classList.contains('tile-light')) document.body.classList.remove('tile-light');
}

function lightTo(li, mouseX, mouseY) {
    if (!light.el || !glow.container) return;
    var a = li && li.querySelector('a');
    if (!a || !lightActive() || lock.sec) { lightReset(); return; }   // gesperrt: scrollende Kacheln unter dem ruhenden Zeiger leuchten nicht
    if (li === light.tile && light.mode === 'on') return;
    var to = lightFrame(a);
    lightRadius(a);
    lightLine(li, mouseX);
    var before = light.tile;
    if (light.mode === 'off') {
        // aus dem Nichts: von außen über die Eintrittskante in die Kachel, beschnitten auf sie
        light.mode = 'on'; light.tile = li; light.old = null; light.clip = to;
        light.el.style.opacity = '1';
        document.body.classList.add('tile-light');
        var from = lightOutside(to, lightEdge(a, mouseX == null ? null : { x: mouseX, y: mouseY }));
        lightPaint(from);
        lightCells();
        lightRun(from, to, measures['light-edge-duration'], true, function () { light.clip = null; lightPaint(light.cur); });
        return;
    }
    // sichtbar (auf einer Kachel oder beim Verlassen): gleitet von hier zur neuen Kachel
    if (before && before !== li) light.old = before;
    light.mode = 'on'; light.tile = li; light.clip = null;
    lightCells();
    lightRun(light.cur, to, measures['light-duration'], false, null);
}

// mit Zeigerposition: das Licht verlässt die Kachel über die Kante, über die der Zeiger ging (Gegenstück zum Eintritt)
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
    if (document.body.classList.contains('keyboard') || isTouch()) return;   // Touch: von iOS nachgeschobene Mausereignisse zählen nicht
    var li = e.target.closest && e.target.closest('#container li');
    if (li) lightTo(li, e.clientX, e.clientY); else lightOff({ x: e.clientX, y: e.clientY });
});
document.documentElement.addEventListener('mouseleave', function (e) {
    lightMouse = null;
    lightOff({ x: e.clientX, y: e.clientY });
});

// Sicherung: das Licht folgt immer der Kachel unter dem Zeiger, auch wenn kein mouseover kam
// (Scrollen unter ruhendem Zeiger, Wechsel von Tastatur zu Maus, Layoutwechsel)
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

// ── Strich-Zeiger ─────────────────────────────────────────────────
// Der senkrechte Strich ersetzt den Punkt: Höhe der Zeile unter dem Zeiger (Titel, Nav-Chip),
// in der Section außerhalb von Titel und Kachel deren Höhe mit 33 % Deckkraft. Auf Kacheln zeichnet ihn die Kachel selbst.
var cursor = { el: null, secEl: null, x: 0, y: 0, dest: null, raf: 0, on: false };

function cursorTarget(t) {
    if (!t || !t.closest || document.body.classList.contains('edit-mode') || document.body.classList.contains('keyboard')) return null;   // Tastatur: ruhender Zeiger zählt nicht
    var z = { sec: t.closest('#container section'), fixed: null, hide: false, head: !!t.closest('#container .name') };
    // gesperrt: auf Nav-Chips und außerhalb der angeklickten Section der normale Punkt-Zeiger, bis die Maus sich bewegt
    if (lock.sec && (t.closest('a.secname') || z.sec !== lock.sec)) return { sec: null, fixed: null, hide: false, head: false, std: true };
    // Eintrag der Sections-Liste: derselbe Chevron wie auf dem Nav-Chip (Richtung des Klicks), ohne Strich
    var entry = t.closest('#jumper-pop a');
    if (entry) return { sec: null, fixed: null, hide: false, head: false, chip: entry, list: true };
    if (t.closest('li a')) { z.hide = true; z.sec = null; }   // Kachel: nur ihr eigener Strich
    else {
        // Kachelrand (kein Hintergrund erkennen) bzw. Nav-Chip: Strich in der Höhe der Zeile
        var el = t.closest('#container li') || t.closest('a.secname');
        if (el) { z.fixed = el; z.sec = null; z.chip = el.matches('a.secname') ? el : null; }
    }
    return z.sec || z.fixed || z.hide ? z : null;
}

// Richtung, in die ein Klick auf den Nav-Chip scrollt (null: die Section liegt schon oben)
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
    // in der Section (nicht auf Chip oder Kachel) zeigt das kleine Quadrat die Zeigerposition, auch im Titel, der ganz oben steht
    var headerAtTop = z.head && z.sec && Math.abs(z.sec.getBoundingClientRect().top - document.getElementById('container').getBoundingClientRect().top) <= 2;
    document.documentElement.classList.toggle('cursor-dot', !!z.sec && (!z.head || headerAtTop));
    // im Titel zeigt ein Chevron nach oben die Zeigerposition, auf einem Nav-Chip nach oben oder unten, wohin der Klick scrollt
    var direction = z.head ? (headerAtTop ? null : 'up') : chipDirection(z.chip);
    // normaler Punkt-Zeiger: während der Sperre, und in der Liste, wenn die Section schon oben liegt (kein Chevron)
    document.documentElement.classList.toggle('cursor-std', !!z.std || (!!z.list && !direction));
    if (direction) document.documentElement.setAttribute('data-arrow', direction);
    else document.documentElement.removeAttribute('data-arrow');
    // Zeile unter dem Zeiger (Kachelrand, Nav-Chip): fester Strich in voller Deckkraft
    if (z.fixed && !(z.chip && direction)) {
        var r = z.fixed.getBoundingClientRect();
        s.style.left = cursor.x + 'px';
        s.style.top = r.top + 'px';
        s.style.height = r.height + 'px';
        s.style.opacity = '1';
    } else s.style.opacity = '0';
    // ganze Section (Hintergrund, Titel, hinter den Kacheln): im Inhalt, schwach, scrollt mit
    if (b) {
        if (z.sec && (!z.head || headerAtTop)) {   // im Titel nur der Chevron, kein Strich; im obersten (aktiven) Titel Punkt und Strich
            var c = document.getElementById('container'), cr = c.getBoundingClientRect(), sr = z.sec.getBoundingClientRect();
            var upper = Math.max(sr.top, cr.top), lower = Math.min(sr.bottom, cr.bottom);
            b.style.left = (cursor.x - cr.left + c.scrollLeft) + 'px';
            b.style.top = (upper - cr.top + c.scrollTop) + 'px';
            b.style.height = Math.max(0, lower - upper) + 'px';
            b.style.opacity = String(measures['cursor-line-faint']);
        } else b.style.opacity = '0';
    }
}

// Der Section-Strich liegt im Inhalt unter Kacheln und Licht (erstes Kind)
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

// Sections belegen ein ganzes Vielfaches eines Viertels der Inhaltshöhe
var gridBase = 0;

function gridInit(onlyOnChange) {
    var container = document.getElementById('container');
    if (!container) return;
    var sections = container.querySelectorAll('section');

    var on = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--grid'), 10);

    // kein Raster (Desktop) oder Edit-Mode: gesetzte Höhen lösen und raus
    if (!on || document.body.classList.contains('edit-mode')) {
        sections.forEach(function (s) { s.style.minHeight = ''; });
        gridBase = 0;
        return;
    }

    // Freiraum unten muss genau der Leistenhöhe entsprechen
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

    // Schwelle gegen Safaris Leistenanimation, die resize im 17-ms-Takt feuert
    if (onlyOnChange && Math.abs(inner - gridBase) < 8) return;
    gridBase = inner;

    // die Section, die gerade oben steht, nach dem Umbau wieder dorthin
    var upperEdge = container.getBoundingClientRect().top;
    var upper = null;
    sections.forEach(function (s) {
        if (!upper && s.getBoundingClientRect().bottom - upperEdge > 1) upper = s;
    });

    var quarter = inner / on;
    sections.forEach(function (s) { s.style.minHeight = ''; });

    // erst alles messen, dann alles setzen
    var places = [];
    sections.forEach(function (s) {
        // 1px Toleranz, sonst rundet eine exakt passende Section auf zwei auf
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

// erst nach Ruhe neu rastern, nicht bei jedem Zwischenschritt
var gridTimer = null;

window.addEventListener('resize', function () {
    clearTimeout(gridTimer);
    gridTimer = setTimeout(function () { gridInit(true); }, 250);
});

// Icon-Schrift vom CDN ändert nach dem Laden die Kopfhöhe
if (document.fonts) document.fonts.ready.then(function () { gridInit(); });

// nach einem Sprung den Inhalt fokussieren, sonst laufen die Pfeiltasten ins Leere
function focusContent(sec) {
    var c = document.getElementById('container');

    // Ziel ist die angesprungene Section
    var fixed = sec && sec.nodeType === 1 ? sec : null;

    // Ziel bei jedem Versuch neu bestimmen — beim Klick ist der Hash noch alt
    var assign = function () {
        var dest = fixed;
        if (!dest && location.hash.length > 1) {
            var el = document.getElementById(location.hash.slice(1));
            dest = el && el.closest('section');
        }
        // sofort mitziehen, sonst leuchten bis zur Scroll-Ruhe zwei Bereiche
        if (dest) {
            document.querySelectorAll('#container section.current')
                .forEach(function (s) { s.classList.remove('current'); });
            dest.classList.add('current');
            ghostHeaderJump(dest);
        }
        (dest || c).focus({ preventScroll: true });
    };

    // dreifach, weil jeder Zeitpunkt für sich unzuverlässig ist
    assign();
    if (document.readyState === 'complete') requestAnimationFrame(assign);
    else window.addEventListener('load', assign, { once: true });
    setTimeout(assign, 250);
}

// hashchange feuert nach der Sprungmarke — dort sitzt der Fokus zuverlässig
window.addEventListener('hashchange', function () { focusContent(); });

// Pfeiltasten summieren sich auf ein Ziel, statt auf die Animation zu warten
var jumpTarget = null;

function jumpBy(delta, wrap) {
    var sections = document.querySelectorAll('#container section');
    if (!sections.length) return;
    var base = jumpTarget;
    // Maus seit dem letzten Tastendruck bewegt: von der Section unter der Maus aus
    var underMouse = mouseMoved ? mouseSection() : null;
    mouseMoved = false;
    if (underMouse) {
        base = Array.prototype.indexOf.call(sections, underMouse);
    } else if (base === null) {
        var activeEl = document.querySelector('#container section h3.name.active');
        base = 0;
        sections.forEach(function (s, i) { if (activeEl && s.contains(activeEl)) base = i; });
    }
    // Smartphone: von Seite zu Seite (ein Paar halbhoher Sections ist eine Seite, Englisch: page)
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
        // von der letzten zur ersten und zurück
        ? (dest % sections.length + sections.length) % sections.length
        : Math.max(0, Math.min(sections.length - 1, dest));
    sections[jumpTarget].scrollIntoView();
    focusContent(sections[jumpTarget]);
}

// Pfeil links/rechts: von Kachel zu Kachel, über Section-Grenzen hinweg.
// Ausgangspunkt: die zuletzt mit der Maus berührte Kachel, wenn die Maus seit dem
// letzten Tastendruck bewegt wurde; sonst die fokussierte; sonst die erste der Section
var mouseTile = null;
var mouseMoved = false;

var mousePoint = null;   // letzte Mausposition im Fenster

function mouseSection() {
    var el = mousePoint && document.elementFromPoint(mousePoint.x, mousePoint.y);
    return el && el.closest ? el.closest('#container section') : null;
}

// erste Kachel einer Section, bei Pfeil links (delta < 0) die letzte
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
            // Maus in einer Section, aber nicht auf einer Kachel: deren erste Kachel
            var below = mouseSection();
            dest = below && tileIn(below, delta);
        }
    }
    if (i === -1 && !dest) i = links.indexOf(document.activeElement);
    mouseMoved = false;
    if (dest) {
        // Ausgangspunkt war die Section unter der Maus
    } else if (i === -1) {
        var sec = document.querySelector('#container section.current') ||
            document.querySelector('#container section');
        // links: die letzte Kachel der Section, rechts: die erste
        dest = tileIn(sec, delta) || links[0];
    } else {
        dest = links[Math.max(0, Math.min(links.length - 1, i + delta))];
    }
    dest.focus();
}

// Pfeiltasten: auch ohne Fokus im Inhalt (z. B. nach einem Klick in die Leiste) —
// im Edit-Mode und in Eingabefeldern gehören sie dem Textcursor
document.addEventListener('keydown', function (e) {
    if (document.body.classList.contains('edit-mode')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    // Inhalt, Chips und Zahnrad der Leiste; das Dropdown (Button) behält seine Pfeiltasten
    if (t !== document.body && !(t.closest && t.closest('#container, .title a, .title button'))) return;
    if (t.closest && t.closest('#section-jumper')) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); jumpBy(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); jumpBy(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); linkBy(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); linkBy(-1); }
});

// Sprungtasten der unteren Leiste
['step-prev', 'step-next'].forEach(function (id, i) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', function (e) {
        e.preventDefault();
        jumpBy(i ? 1 : -1, true);
    });
});

// Adressen, die nie als nicht erreichbar gelten (auch wenn die Daten es markieren): zentral in never-dead.json
// (allIpAddresses: jede IP-Adresse; hosts: Rechnernamen). edit/pruefen.php liest dieselbe Datei.
var neverDead = { allIpAddresses: true, hosts: [] };

function isNeverDead(url) {
    var h;
    try { h = new URL(url).hostname; } catch (e) { return false; }
    if (neverDead.allIpAddresses && (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.charAt(0) === '[')) return true;
    return neverDead.hosts.indexOf(h.toLowerCase()) >= 0;
}

function makeLi(name, url, dead) {
    var li = document.createElement('li');
    if (dead && !isNeverDead(url)) li.classList.add('dead');   // beim letzten Test nicht erreichbar
    var a = document.createElement('a');
    a.tabIndex = 0;
    a.href = url;
    a.textContent = name;
    li.appendChild(a);
    return li;
}

// ── Ausgangspunkt für die Pfeiltasten (linkBy): die Kachel unter der Maus ──
function setMouseTile(e) {
    var a = e.target.closest('li a');
    if (a) mouseTile = a;
}
document.getElementById('container').addEventListener('mouseover', setMouseTile);
document.getElementById('container').addEventListener('mousemove', setMouseTile);

// ── Einstellungen: Zahnrad in der Leiste, Overlay mit einem Knopf pro Einstellung ──
// Ein Icon pro Einstellung zeigt den aktuellen Wert; jeder Klick schaltet zum anderen von zwei Werten. API für Zoom/Farbschema steht im <head>.
// icon: Font-Awesome-Klasse oder Buchstabe (Zoom); zeigt den aktuellen Wert
var SETTINGS = [
    {
        label: 'Zoom',
        values: [['s', 'S'], ['m', 'M']],
        get: function () { return window.msmrZoom.get(); },
        icon: function (w) { return { text: w.toUpperCase() }; },
        set: function (w) { window.msmrZoom.set(w); }
    },
    {
        label: 'Theme',
        values: [['auto', 'auto'], ['light', 'light'], ['dark', 'dark']],
        schema: true,
        all: true,   // der Hinweis nennt alle Werte, der aktuelle in Klammern
        get: function () { return window.msmrTheme.auto() ? 'auto' : window.msmrTheme.get(); },
        set: function (w) { if (w === 'auto') window.msmrTheme.setAuto(); else window.msmrTheme.set(w); }
    },
    {
        label: 'Color',
        values: [['vivid', 'color'], ['pale', 'pale']],
        text: { vivid: 'col', pale: 'pale' },
        // Kreis in einer Section-Farbe: kräftig = bunt, fast farblos (gleiche Helligkeit) = blass
        circle: { vivid: '1', pale: 'var(--color-pale)' },
        get: function () { return getPref('colorMode'); },
        set: function (w) { setPref('colorMode', w); }
    },
    {
        label: 'Navigation',
        values: [['short', 'text'], ['icons', 'icons']],
        // Text-Modus: das Wort „text“; Icon-Modus: Squircle wie bei APP
        squircle: true,
        get: function () { return getPref('navMode'); },
        set: function (w) { setPref('navMode', w); }
    },
    {
        label: 'View',
        values: [['chips', 'chips'], ['grid', 'grid']],
        text: { chips: 'chip', grid: 'grid' },
        // vier Kacheln: gerundet und getrennt = Chips; eckig und aneinander = Raster
        tiles: { chips: false, grid: true },
        get: function () { return getPref('view'); },
        set: function (w) { setPref('view', w); }
    },
    {
        label: 'Align',
        // im Raster heißt „links“ volle Breite
        descr: function (w) { return w === 'left' && getPref('view') === 'grid' ? 'full' : null; },
        values: [['left', 'left'], ['center', 'center']],
        text: { left: 'left', center: 'cen' },
        icons: { left: 'fa-align-left', center: 'fa-align-center' },
        get: function () { return getPref('align'); },
        set: function (w) { setPref('align', w); }
    },
    {
        label: 'Edit',
        values: [['off', 'edit'], ['on', 'done']],
        text: { off: 'edit', on: 'save' },
        // zwei Chevrons übereinander = aus; Diskette = es wird bearbeitet, Klick beendet und fragt nach dem Speichern
        icons: { off: ['fa-chevron-up', 'fa-chevron-down'], on: 'fa-floppy-disk' },
        get: function () { return document.body.classList.contains('edit-mode') ? 'on' : 'off'; },
        set: function (w) { if (w === 'on') enterEditMode(); else finishEditing(); },
        closes: true
    }
];

function valueName(e, w) {
    return (e.descr && e.descr(w)) ||
        e.values.filter(function (p) { return p[0] === w; })[0][1];
}

function valueTo(e, w) {
    var i = 0;
    e.values.forEach(function (p, k) { if (p[0] === w) i = k; });
    return e.values[(i + 1) % e.values.length][0];
}

// Farbschema: manuell groß hell/dunkel; auto groß „auto“ und klein das Icon des Systemwerts.
// Text-Modus: Wörter; Icon-Modus: Sonne/Mond, „auto“ als gefüllter Kreis
function drawScheme(ic, w) {
    var icons = document.body.classList.contains('nav-icons');
    var sym = { light: 'fa-sun', dark: 'fa-moon' }, word = { auto: 'aut', light: 'light', dark: 'dark' };
    function glyph(cssClass, extra) {
        var g = document.createElement('i');
        g.className = cssClass + (extra ? ' ' + extra : '');
        return g;
    }
    function text(t, cssClass) {
        var s = document.createElement('span');
        s.className = cssClass;
        s.textContent = t;
        return s;
    }
    ic.className = 'set-icon set-scheme';
    ic.textContent = '';
    if (w === 'auto') {
        ic.appendChild(icons ? glyph('fa-solid fa-circle') : text(word.auto, 'set-letter set-text'));
        ic.appendChild(glyph('fa-solid ' + sym[window.msmrTheme.get()], 'set-corner'));
    } else {
        ic.appendChild(icons ? glyph('fa-solid ' + sym[w]) : text(word[w], 'set-letter set-text'));
    }
}

// zeichnet das Icon für den Wert w
function drawIcon(ic, e, w) {
    if (e.icon) {
        var d = e.icon(w);
        ic.className = 'set-icon set-letter';
        ic.textContent = d.text;
    } else if (e.schema) {
        drawScheme(ic, w);
    } else if (!document.body.classList.contains('nav-icons')) {
        ic.className = 'set-icon set-letter set-text';
        ic.textContent = (e.descr && e.descr(w)) || (e.text && e.text[w]) || valueName(e, w);
    } else if (e.circle) {
        ic.className = 'set-icon set-circle';
        ic.textContent = '';
        ic.style.setProperty('--k', sectionColor(6, e.circle[w]));
    } else if (e.squircle) {
        ic.className = 'set-icon icon-squircle';
        ic.textContent = '';
    } else if (e.tiles) {
        ic.className = 'set-icon set-tiles' + (e.tiles[w] ? ' square' : '');
        ic.textContent = '';
        for (var k = 0; k < 4; k++) ic.appendChild(document.createElement('i'));
    } else if (Array.isArray(e.icons[w])) {
        // mehrere Symbole als ein Icon, senkrecht gestapelt
        ic.className = 'set-icon set-stack';
        ic.textContent = '';
        e.icons[w].forEach(function (k) {
            var g = document.createElement('i');
            g.className = 'fa-solid ' + k;
            ic.appendChild(g);
        });
    } else {
        ic.className = 'set-icon fa-solid ' + e.icons[w];
        ic.textContent = '';
    }
}

function settingsDisplay() {
    document.querySelectorAll('#settings-pop .set-btn').forEach(function (b, i) {
        var e = SETTINGS[i], w = e.get();
        drawIcon(b.querySelector('.set-icon'), e, w);
        b.title = e.all
            ? e.values.map(function (p) { return p[0] === w ? '[' + p[1] + ']' : p[1]; }).join(' / ')
            : valueName(e, w) + '/' + valueName(e, valueTo(e, w));   // jetzt/nächster Wert
        b.setAttribute('aria-label', e.label + ': ' + b.title);
    });
}

// Knopfhöhe der Overlays (Einstellungen und Sections-Liste) = Breite des Zahnrads in der Chips-Ansicht.
// Im Raster mit voller Breite streckt sich das Zahnrad: dafür kurz mit der Leistenbreite der Chips messen
function navButtonHeight() {
    var gearEl = document.getElementById('settings-btn'), bar = document.querySelector('.title');
    var widthPx = gearEl.getBoundingClientRect().width;
    if (document.body.classList.contains('view-grid') && !document.body.classList.contains('align-center') && bar) {
        bar.style.maxWidth = 'calc(var(--column) + 0.12em)';
        widthPx = gearEl.getBoundingClientRect().width;
        bar.style.maxWidth = '';
    }
    return widthPx;
}

// bündig unter dem Zahnrad, gleich breit; in der unteren Leiste (Smartphone-/Kleinansicht) bündig darüber
function settingsPlace() {
    var pop = document.getElementById('settings-pop');
    var gearEl = document.getElementById('settings-btn');
    var r = gearEl.getBoundingClientRect();
    var upper = r.top > window.innerHeight / 2;
    // Im Raster läuft die Leiste über die ganze Breite und das Zahnrad streckt sich: die Breite bleibt die des Zahnrads,
    // die Knopfhöhe (und damit die Höhe des Overlays) aber dieselbe wie bei Chips; dafür mit der Leistenbreite der Chips messen
    pop.style.width = r.width + 'px';   // bündig mit dem Zahnrad, auch wenn es sich im Raster streckt
    pop.style.setProperty('--set-height', navButtonHeight() + 'px');   // Knopfhöhe wie bei Chips
    pop.style.left = r.left + 'px';
    pop.style.right = 'auto';
    pop.style.top = upper ? 'auto' : r.bottom + 'px';
    pop.style.bottom = upper ? (window.innerHeight - r.top) + 'px' : 'auto';
    pop.classList.toggle('upward', upper);
}

(function () {
    var pop = document.getElementById('settings-pop');
    SETTINGS.forEach(function (e) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'set-btn';
        b.innerHTML = '<span class="set-icon" aria-hidden="true"></span>';
        b.addEventListener('click', function () {
            e.set(valueTo(e, e.get()));
            settingsDisplay();
            if (e.closes) { pop.hidePopover(); return; }
            settingsPlace();   // der Zoom verschiebt das Zahnrad
        });
        pop.appendChild(b);
    });
    // Zahnrad: Klick schaltet das Overlay um; mit der Maus geht auch drücken, auf einen Knopf ziehen
    // und loslassen — das schaltet nur diesen Knopf weiter und schließt das Overlay (wie ein Menü)
    var gearZone = document.getElementById('settings-btn');
    var mouse = false, wasOpen = false;
    function isOpen() { return pop.matches(':popover-open'); }
    function buttonAt(ev) {
        var el = document.elementFromPoint(ev.clientX, ev.clientY);
        return el && el.closest ? el.closest('#settings-pop .set-btn') : null;
    }
    gearZone.addEventListener('pointerdown', function (ev) {
        if (ev.pointerType !== 'mouse' || ev.button !== 0) return;
        mouse = true;
        wasOpen = isOpen();
        if (!wasOpen) pop.showPopover();
    });
    document.addEventListener('pointerup', function (ev) {
        if (!mouse) return;
        var button = buttonAt(ev);
        var onGear = ev.target.closest && ev.target.closest('#settings-btn');
        if (button) { button.click(); if (isOpen()) pop.hidePopover(); }   // gezogen und losgelassen: schalten, schließen
        else if (onGear) { if (wasOpen) pop.hidePopover(); }   // einfacher Klick: umschalten
        else pop.hidePopover();   // woanders losgelassen
        mouse = !!onGear;   // nach dem Loslassen auf dem Zahnrad folgt noch der click, den der Handler unten überspringt
    });
    // Tastatur und Touch: normaler Klick; ein Mausklick wurde oben schon behandelt
    gearZone.addEventListener('click', function () {
        if (mouse) { mouse = false; return; }
        if (isOpen()) pop.hidePopover(); else pop.showPopover();
    });
    // Klick außerhalb und Esc schließen (manuelles Popover kennt beides nicht)
    document.addEventListener('pointerdown', function (ev) {
        if (isOpen() && !ev.target.closest('#settings-pop, #settings-btn')) pop.hidePopover();
    });
    document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && isOpen()) pop.hidePopover();
    });

    pop.addEventListener('beforetoggle', function (ev) {
        if (ev.newState === 'open') settingsPlace();
    });
    window.addEventListener('resize', function () { if (pop.matches(':popover-open')) settingsPlace(); });

    // Mit Maus: schließt sich 3 s nach dem Verlassen von Overlay und Zahnrad (Touch/ohne Zeiger: nie)
    var pointer = matchMedia('(hover: hover) and (pointer: fine)');
    var closeTimer = null;
    function autoCloseStop() { clearTimeout(closeTimer); closeTimer = null; }
    function autoCloseStart() {
        autoCloseStop();
        if (!pointer.matches || !pop.matches(':popover-open')) return;
        closeTimer = setTimeout(function () { if (pop.matches(':popover-open')) pop.hidePopover(); }, 3000);
    }
    var gear = document.getElementById('settings-btn'), gearTo = 0;
    [pop, gear].forEach(function (el) {
        el.addEventListener('mouseenter', autoCloseStop);
        el.addEventListener('mouseleave', autoCloseStart);
    });
    // Tastaturbedienung im Overlay hält es offen
    pop.addEventListener('focusin', autoCloseStop);
    pop.addEventListener('focusout', autoCloseStart);
    pop.addEventListener('toggle', function (ev) {
        var on = ev.newState === 'open';
        // Zahnrad kehrt um, solange das Overlay offen ist; zurück erst, wenn es eingezogen ist
        clearTimeout(gearTo);
        if (on) gear.classList.add('open');
        else gearTo = setTimeout(function () { gear.classList.remove('open'); },
            parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pop-duration')) || 0);
        gear.setAttribute('aria-expanded', on);
        if (on) autoCloseStart(); else autoCloseStop();
    });
    document.addEventListener('msmrzoom', settingsDisplay);
    document.addEventListener('msmrtheme', settingsDisplay);
    settingsDisplay();
})();

document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;   // Browser-Zoom bleibt unberührt
    if (e.target.closest('input, select, textarea, [contenteditable]')) return;
    if (e.key === '+' || e.key === '=') window.msmrZoom.set('m');
    else if (e.key === '-' || e.key === '0') window.msmrZoom.set('s');
});

// ── Maus oder Tastatur: nur das zuletzt benutzte Gerät hebt eine Kachel hervor ──
document.addEventListener('keydown', function (e) {
    if (e.key === 'Tab' || e.key.indexOf('Arrow') === 0) {
        document.body.classList.add('keyboard');
        if (cursor.el) cursorPlan();   // Strich/Chevron unter dem ruhenden Zeiger ausblenden
    }
});
document.addEventListener('mousemove', function (e) {
    if (isTouch()) return;
    document.body.classList.remove('keyboard');
    mousePoint = { x: e.clientX, y: e.clientY };
    mouseMoved = true;
});

// APP gehört als 3. Section in die Reihe; fehlt sie in den gespeicherten Daten, kommt sie leer dazu
function withApp(data) {
    var app = data.filter(function (s) { return s.id === 'app'; })[0];
    if (!app) {
        data.splice(2, 0, { id: 'app', title: 'app', icon: 'icon-squircle', links: [] });
    } else if (app.title === 'APP') {
        app.title = 'app';   // kleingeschrieben wie die anderen; die Großbuchstaben macht das CSS
    }
    if (app && app.icon === 'fa-mobile-screen') {
        app.icon = 'icon-squircle';   // vorher gespeichertes Handy-Icon ersetzen
    }
    return data;
}

// ── Load ──────────────────────────────────────────────────────────
// Ausnahmen zuerst (fehlt die Datei, gelten nur die Standardwerte), dann die Links
fetch('never-dead.json')
    .then(function (r) { return r.json(); })
    .then(function (d) {
        if (typeof d.allIpAddresses === 'boolean') neverDead.allIpAddresses = d.allIpAddresses;
        if (Array.isArray(d.hosts)) neverDead.hosts = d.hosts.map(function (x) { return String(x).toLowerCase(); });
    })
    .catch(function () { })
    .then(function () { return fetch('links.php?t=' + Date.now()); })
    .then(function (r) { return r.json(); })
    .then(withApp)
    .then(render)
    .catch(function (e) {
        document.getElementById('container').innerHTML =
            '<p style="color:red;padding:20px">links.json load error: ' + e + '</p>';
    });

// ── Edit Mode ─────────────────────────────────────────────────────

function preventEnter(e) { if (e.key === 'Enter') e.preventDefault(); }

// Löschen ist bis zum Speichern umkehrbar
function makeDelButton(li) {
    var del = document.createElement('span');
    del.className = 'btn-del';
    del.textContent = '×';
    del.title = 'Delete';
    del.addEventListener('click', function () {
        var removed = li.classList.toggle('removed');
        del.textContent = removed ? '↺' : '×';
        del.title = removed ? 'Restore' : 'Delete';
    });
    return del;
}

// GET beantwortet save.php mit 405, ohne etwas anzufassen; 401 kommt vom Server davor
function canSave() {
    return fetch('edit/save.php')
        .then(function (r) { return r.status !== 401; })
        .catch(function () { return false; });   // im Zweifel nichts freigeben
}

// Ohne Anmeldung (401 vom Server) passiert nichts — der Edit Mode bleibt zu
function enterEditMode() {
    canSave().then(function (may) {
        if (!may) return;
        document.body.classList.add('edit-mode');
        gridInit();   // gesetzte Rasterhöhen lösen, sonst schlagen sie die Edit-Regeln
        releaseLinks();
        settingsDisplay();
    });
}

function releaseLinks() {
    document.querySelectorAll('ul.group li:not(.btn-add)').forEach(function (li) {
        if (li.querySelector('a') && !li.querySelector('.edit-url')) createFields(li);
    });

    if (makeDraggable()) sectionsSortable();
    document.querySelectorAll('ul.group').forEach(function (ul) {
        if (makeDraggable()) sortable(ul);
        if (ul.querySelector('.btn-add')) return;
        var add = document.createElement('li');
        add.className = 'btn-add';
        add.textContent = '+';
        add.title = 'Add link';
        add.addEventListener('click', function () { addLink(ul, add); });
        ul.appendChild(add);
    });
}

// Name und URL bearbeitbar machen, Anfasser und Löschknopf anhängen
function createFields(li) {
    var a = li.querySelector('a');
    a.contentEditable = 'true';
    a.addEventListener('keydown', preventEnter);

    var urlField = document.createElement('span');
    urlField.className = 'edit-url';
    urlField.contentEditable = 'true';
    urlField.textContent = a.getAttribute('href');
    urlField.addEventListener('keydown', preventEnter);
    li.appendChild(urlField);

    li.appendChild(makeDelButton(li));
    if (makeDraggable()) li.insertBefore(makeMoveHandle(li), a);
}

function addLink(ul, addBtn) {
    var li = makeLi('New link', 'https://');
    createFields(li);
    ul.insertBefore(li, addBtn);
    li.querySelector('a').focus();
}

// ── Sortieren ─────────────────────────────────────────────────────

// Ziehen braucht eine Maus; am Finger bliebe der Anfasser wirkungslos
function makeDraggable() { return matchMedia('(pointer: fine)').matches; }

var dragged = null;      // Kachel, die gerade zieht
var prepared = null;  // Kachel, deren Anfasser gedrückt ist
var startPlace = null;   // Nachbar beim Zugbeginn, für die Rückkehr beim Abbruch
var startList = null;   // Liste beim Zugbeginn: eine Kachel darf in jede Section wandern

// ein Klick ohne Zug muss die Kachel wieder festsetzen
document.addEventListener('mouseup', function () {
    if (prepared) {
        prepared.draggable = false;
        prepared.classList.remove('grabbed');
        prepared = null;
    }
});

// außerhalb jeder Liste: Kachel kehrt an den Start zurück und zeigt den Abbruch —
// was man sieht, ist immer das Ergebnis des Loslassens
document.addEventListener('dragover', function (e) {
    if (!dragged) return;
    var inside = !!(e.target.closest && e.target.closest('ul.group'));
    dragged.classList.toggle('cancel', !inside);
    if (!inside && (dragged.parentNode !== startList || dragged.nextSibling !== startPlace)) {
        startList.insertBefore(dragged, startPlace);
    }
});

// draggable erst beim Griff setzen, sonst zieht jede Textauswahl die Kachel mit
function makeMoveHandle(li) {
    var handle = document.createElement('span');
    handle.className = 'btn-move';
    handle.textContent = '⠿';
    handle.title = 'Move';
    handle.addEventListener('mousedown', function () {
        li.draggable = true;
        // jetzt schon, denn das Zugbild ist ein Schnappschuss der Kachel
        // beim Zugbeginn — erst dann wäre der Hintergrund nicht mit drauf
        li.classList.add('grabbed');
        prepared = li;
    });

    li.addEventListener('dragstart', function (e) {
        dragged = li;
        startPlace = li.nextSibling;
        startList = li.parentNode;
        // erst nach dem Schnappschuss des Zugbilds, sonst trägt auch das
        // mitfliegende Bild das Ziel-Highlight
        setTimeout(function () { if (dragged === li) li.classList.add('dragging'); });
        e.dataTransfer.effectAllowed = 'move';
        // Firefox startet ohne gesetzte Daten gar keinen Zug
        e.dataTransfer.setData('text/plain', '');
    });
    li.addEventListener('dragend', function () {
        // Loslassen im Aus, ohne dass der Abbruch-Handler noch feuerte
        if (li.classList.contains('cancel') &&
            (li.parentNode !== startList || li.nextSibling !== startPlace)) {
            startList.insertBefore(li, startPlace);
        }
        li.classList.remove('dragging', 'cancel', 'grabbed');
        li.draggable = false;
        dragged = null;
        prepared = null;
        startPlace = null;
        startList = null;
    });
    return handle;
}

function sortable(ul) {
    if (ul.dataset.sortable) return;
    ul.dataset.sortable = '1';

    ul.addEventListener('dragover', function (e) {
        if (!dragged) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        // Ziel ist die ganze Kachel unterm Zeiger, keine Lückenrechnerei:
        // sie gibt ihren Platz her, die Zugrichtung entscheidet die Seite.
        // Über Lücken (auch der eigenen Kachel) bleibt die Vorschau stehen.
        var dest = e.target.closest ? e.target.closest('li') : null;
        if (!dest || dest === dragged || dest.parentNode !== ul) return;   // Lücken: Vorschau bleibt
        var before = dest.classList.contains('btn-add') ? dest
            // Ziel liegt vor der Zugkachel → davor, sonst dahinter
            : (dest.compareDocumentPosition(dragged) & Node.DOCUMENT_POSITION_FOLLOWING)
                ? dest : dest.nextSibling;
        if (before !== dragged && before !== dragged.nextSibling) ul.insertBefore(dragged, before);
    });

    // die Kachel steht schon am Ziel; preventDefault hält den Browser nur
    // davon ab, den Zugtext in das contentEditable darunter zu setzen
    ul.addEventListener('drop', function (e) { e.preventDefault(); });
}

// Sections untereinander umsortieren (wie in der Ansicht: senkrecht): Griff am Titel, Ziehen über eine andere Section
// verschiebt die gezogene davor oder dahinter, je nach Zeigerhälfte. Die Reihenfolge im DOM wird gespeichert (collectData).
var draggedSection = null;

function sectionsSortable() {
    var c = document.getElementById('container');
    if (c.dataset.secSortable) return;
    c.dataset.secSortable = '1';
    c.querySelectorAll('section').forEach(function (sec) {
        var h3 = sec.querySelector('h3.name');
        if (!h3) return;
        var handle = document.createElement('span');
        handle.className = 'sec-handle';
        handle.textContent = '⠿';
        handle.title = 'Move section';
        h3.insertBefore(handle, h3.firstChild);
        // erst mit dem Griff wird die Section ziehbar, sonst zöge jeder Klick im Inhalt sie mit
        handle.addEventListener('mousedown', function () { sec.draggable = true; });
        sec.addEventListener('dragstart', function (e) {
            if (e.target !== sec) return;   // Kachel-Züge steigen hier nur auf
            draggedSection = sec;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', '');   // Firefox startet sonst keinen Zug
            e.dataTransfer.setDragImage(h3, 16, 16);   // nur der Titel fliegt mit, nicht die ganze Section
            setTimeout(function () { if (draggedSection === sec) sec.classList.add('sec-dragging'); });
        });
        sec.addEventListener('dragend', function (e) {
            if (e.target !== sec) return;
            sec.draggable = false;
            sec.classList.remove('sec-dragging');
            draggedSection = null;
        });
    });
    c.addEventListener('dragover', function (e) {
        if (!draggedSection) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        var dest = e.target.closest && e.target.closest('#container section');
        if (!dest || dest === draggedSection) return;
        var r = dest.getBoundingClientRect();
        var before = e.clientY < r.top + r.height / 2 ? dest : dest.nextElementSibling;
        if (before !== draggedSection && before !== draggedSection.nextElementSibling) c.insertBefore(draggedSection, before);
    });
    c.addEventListener('drop', function (e) { if (draggedSection) e.preventDefault(); });
}

// ── Collect & Save ────────────────────────────────────────────────
function collectData() {
    var data = [];
    document.querySelectorAll('section').forEach(function (section) {
        var h3 = section.querySelector('h3.name');
        var ul = section.querySelector('ul.group');
        if (!h3 || !ul) return;

        var links = [];
        ul.querySelectorAll('li:not(.btn-add):not(.removed)').forEach(function (li) {
            var a = li.querySelector('a');
            var urlField = li.querySelector('.edit-url');
            if (!a) return;
            var name = a.textContent.trim();
            var url = urlField ? urlField.textContent.trim() : a.getAttribute('href');
            if (!name || !url) return;
            var entry = { name: name, url: url };
            // Tot-Markierung mitschreiben; eine geänderte URL hebt sie auf
            if (li.classList.contains('dead') && url === li.dataset.url0) entry.dead = true;
            links.push(entry);
        });

        if (!links.length) return;

        var sec = {
            id: h3.id,
            title: (h3.querySelector('a') || {}).textContent || h3.id
        };
        if (h3.dataset.icon) sec.icon = h3.dataset.icon;
        sec.color = h3.dataset.color || 'cyan';
        sec.links = links;
        data.push(sec);
    });
    return data;
}

// Vergleich gegen die beim Rendern gestempelten Ursprungswerte
function changes() {
    var deleted = [], modified = [], moved = [], fresh = 0;
    document.querySelectorAll('ul.group li:not(.btn-add)').forEach(function (li) {
        var a = li.querySelector('a');
        if (!a) return;
        if (li.dataset.url0 === undefined) { fresh++; return; }
        var urlFieldEl = li.querySelector('.edit-url');
        var name = a.textContent.trim();
        var url = urlFieldEl ? urlFieldEl.textContent.trim() : a.getAttribute('href');

        if (li.classList.contains('removed')) {
            deleted.push('· ' + li.dataset.name0 + '  ' + li.dataset.url0);
        } else if (name !== li.dataset.name0 || url !== li.dataset.url0) {
            modified.push('· ' + li.dataset.name0 + '  ' + li.dataset.url0 +
                '\n  → ' + name + '  ' + url);
        }
    });

    // Umgestellt heißt: die Ausgangspositionen steigen nicht mehr an
    document.querySelectorAll('#container section').forEach(function (section) {
        var ul = section.querySelector('ul.group');
        if (!ul) return;
        var secId = (section.querySelector('h3.name') || {}).id;
        var last = -1, reordered = false;
        ul.querySelectorAll('li:not(.btn-add):not(.removed)').forEach(function (li) {
            if (li.dataset.pos0 === undefined) return;   // neu, hat keine Ausgangsposition
            if (li.dataset.sec0 !== secId) reordered = true;   // aus einer anderen Section herübergezogen
            var pos = +li.dataset.pos0;
            if (pos < last) reordered = true;
            last = pos;
        });
        var heading = section.querySelector('h3.name a');
        if (reordered) moved.push('· ' + (heading ? heading.textContent : ''));
    });

    // Reihenfolge der Sections selbst: die Ausgangspositionen steigen nicht mehr an
    var lastSec = -1, secReordered = false;
    document.querySelectorAll('#container section').forEach(function (section) {
        if (section.dataset.pos0 === undefined) return;
        if (+section.dataset.pos0 < lastSec) secReordered = true;
        lastSec = +section.dataset.pos0;
    });
    if (secReordered) moved.push('· Order of sections');

    return { deleted: deleted, modified: modified, moved: moved, fresh: fresh };
}

// Text der Änderungen für die Rückfrage; leer, wenn nichts zu speichern ist
function changesText() {
    var d = changes();
    if (!d.modified.length && !d.deleted.length && !d.moved.length) {
        return d.fresh ? 'Save new entries?' : '';
    }
    var text = 'Save changes?\n';
    if (d.modified.length) {
        text += '\nChanged (' + d.modified.length + '):\n' + d.modified.join('\n') + '\n';
    }
    if (d.moved.length) {
        text += '\nOrder changed (' + d.moved.length + '):\n' +
            d.moved.join('\n') + '\n';
    }
    if (d.deleted.length) {
        text += '\nDeleted (' + d.deleted.length + '):\n' + d.deleted.join('\n') + '\n';
    }
    return text;
}

// Bearbeiten beenden: nichts geändert → einfach zu; sonst fragen, ob gespeichert wird,
// bei „Nein“ ob verworfen wird; bei erneutem „Nein“ bleibt der Edit Mode offen
function finishEditing() {
    var text = changesText();
    if (!text) { location.reload(); return; }
    if (confirm(text)) save();
    else if (confirm('Discard changes?')) location.reload();
}

function save() {
    var json = JSON.stringify(collectData(), null, 2);
    fetch('edit/save.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: json
    })
    .then(function (r) {
        if (r.status === 401) {
            throw new Error('Not signed in — open /edit/ once directly in the browser and sign in.');
        }
        if (!r.ok) throw new Error('HTTP ' + r.status);
        document.querySelector('.titledomain').textContent = '✓';
        setTimeout(function () { location.reload(); }, 800);
    })
    .catch(function (err) { alert('Error: ' + err.message); });
}
