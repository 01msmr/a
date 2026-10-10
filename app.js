// ── Ansichts-Einstellungen ────────────────────────────────────────
var PREF_DEFAULTS = { navMode: 'short', align: 'left' };

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
    if (typeof settingsAnzeige === 'function') settingsAnzeige();
}

applyPrefs();

// ── Render ────────────────────────────────────────────────────────
var syncActive = function () { };

// kräftige, gesättigte Farben (ohne Grauanteil): weiße Schrift (hell) bzw. dunkle Schrift (dunkel) bleibt lesbar
var SEC_COLORS = ['#f85a5a', '#fb8f2a', '#f0b400', '#8ac430', '#2fc16c', '#22b59f', '#18b4d6',
    '#4a92f0', '#6c70f2', '#9a62f0', '#c456e8', '#ea4fa8', '#f4587a', '#f67a3a', '#2fae82'];

function makeIcon(icon) {
    var i = document.createElement('i');
    // eigenes Icon ohne Font Awesome: Squircle (s. styles.css)
    i.className = (icon === 'icon-squircle' ? icon : 'fa-solid ' + (icon || 'fa-hashtag')) + ' secicon';
    i.setAttribute('aria-hidden', 'true');
    return i;
}

// Chip und Titel einer Section leuchten gemeinsam, sobald einer von beiden berührt wird
function koppleHover(a, b) {
    [[a, b], [b, a]].forEach(function (p) {
        p[0].addEventListener('mouseenter', function () { p[1].classList.add('mit-hover'); });
        p[0].addEventListener('mouseleave', function () { p[1].classList.remove('mit-hover', 'mit-druck'); });
        p[0].addEventListener('mousedown', function () { p[1].classList.add('mit-druck'); });
        p[0].addEventListener('mouseup', function () { p[1].classList.remove('mit-druck'); });
    });
}

function render(data) {
    var chipOf = {};
    var nav = document.getElementById('section-nav-list');
    var sel = document.getElementById('section-jumper');
    nav.innerHTML = '';
    sel.innerHTML = '';

    data.forEach(function (sec, idx) {
        var a = document.createElement('a');
        a.style.setProperty('--c', SEC_COLORS[idx % SEC_COLORS.length]);
        a.className = 'secname';
        a.href = '#' + sec.id;
        a.target = '_self';
        a.title = sec.title;
        a.appendChild(makeIcon(sec.icon));
        var short = document.createElement('span');
        short.className = 'secshort';
        short.textContent = sec.title;
        a.appendChild(short);
        // gewickelt, damit nicht das Event als Fokusziel ankommt
        a.addEventListener('click', function () { focusContent(); });
        nav.appendChild(a);
        chipOf[sec.id] = a;

        var opt = document.createElement('option');
        opt.value = '#' + sec.id;
        opt.textContent = sec.title;
        sel.appendChild(opt);
    });

    sel.addEventListener('change', function () {
        var el = document.querySelector(sel.value);
        if (el) el.scrollIntoView();
        // iOS gibt den Fokus nach dem Schließen der Auswahlliste an das select zurück
        sel.blur();
        focusContent(el && el.closest('section'));
    });

    var container = document.getElementById('container');
    container.tabIndex = -1;
    container.innerHTML = '';

    data.forEach(function (sec, idx) {
        var section = document.createElement('section');
        section.style.setProperty('--c', SEC_COLORS[idx % SEC_COLORS.length]);   // erbt an Titel und Kacheln
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
        koppleHover(chipOf[sec.id], h3);

        var ul = document.createElement('ul');
        ul.className = 'group';
        (sec.links || []).forEach(function (link, i) {
            var li = makeLi(link.name, link.url, link.tot);
            li.dataset.name0 = link.name;   // Ursprungswerte für den Vergleich
            li.dataset.url0 = link.url;
            li.dataset.pos0 = i;
            li.dataset.sec0 = sec.id;
            ul.appendChild(li);
        });

        section.appendChild(h3);
        section.appendChild(ul);
        container.appendChild(section);
    });

    applyPrefs();
    trackActiveSection();
    raster();
    // Reload mit #hash: der Browser springt in nachgeladenem Inhalt nicht selbst dorthin,
    // sonst zeigt der Inhalt die erste Section, während die Markierung zur Adresse gehört
    var ziel = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
    if (ziel) {
        ziel.scrollIntoView({ behavior: 'instant' });
        syncActive();
    }
    focusContent();
}

// Oberste sichtbare Section: Chip invertiert, Dropdown nachgeführt.
function trackActiveSection() {
    var container = document.getElementById('container');
    var sel = document.getElementById('section-jumper');
    var chips = document.querySelectorAll('.secname');
    var timer = null;

    syncActive = function () {
        var top = container.getBoundingClientRect().top;
        var headings = document.querySelectorAll('section h3.name');
        var active = chips.length ? chips[0].hash : '';
        var aktiv = null;
        headings.forEach(function (h3) {
            if (h3.getBoundingClientRect().top - top <= 8) {
                active = '#' + h3.id;
                aktiv = h3;
            }
        });
        // Maus zuletzt benutzt und über einer Section: deren Chip leuchtet, sonst die oberste
        var nav = active;
        if (mausPos && !document.body.classList.contains('tastatur')) {
            var unterMaus = document.elementFromPoint(mausPos.x, mausPos.y);
            var sec = unterMaus && unterMaus.closest && unterMaus.closest('#container section');
            var kopf = sec && sec.querySelector('h3.name');
            if (kopf) nav = '#' + kopf.id;
        }
        chips.forEach(function (chip) {
            chip.classList.toggle('active', chip.hash === nav);
        });
        headings.forEach(function (h3) {
            var passt = '#' + h3.id === active;
            h3.classList.toggle('active', passt);
            // Section markieren — greift auch beim Scrollen von Hand
            h3.closest('section').classList.toggle('aktuell', passt);
        });
        // angedockter Header → Rahmen der Leiste mitfärben, kein heller Spalt
        document.body.classList.toggle('docked',
            !!aktiv && aktiv.getBoundingClientRect().top - top <= 1);
        sel.value = active;
        jumpTarget = null;   // Scrollen zur Ruhe gekommen
    };

    // Chip folgt der Maus; Verlassen des Inhalts (Leiste, Rand) → wieder die oberste Section
    var mausPos = null, wartet = false;
    container.addEventListener('mousemove', function (e) {
        mausPos = { x: e.clientX, y: e.clientY };
        // nach dem Umschalten auf Maus (document-Handler läuft nach diesem)
        if (!wartet) { wartet = true; setTimeout(function () { wartet = false; syncActive(); }); }
    });
    container.addEventListener('mouseleave', function () {
        mausPos = null;
        syncActive();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Tab' || e.key.indexOf('Arrow') === 0) setTimeout(syncActive);
    });

    // erst nach Scroll-Ruhe nachziehen
    container.addEventListener('scroll', function () {
        clearTimeout(timer);
        timer = setTimeout(syncActive, 75);
    });
    syncActive();
}

// Sections belegen ein ganzes Vielfaches eines Viertels der Inhaltshöhe
var rasterBasis = 0;

function raster(nurBeiAenderung) {
    var container = document.getElementById('container');
    if (!container) return;
    var sections = container.querySelectorAll('section');

    var an = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--raster'), 10);

    // kein Raster (Desktop) oder Edit-Mode: gesetzte Höhen lösen und raus
    if (!an || document.body.classList.contains('edit-mode')) {
        sections.forEach(function (s) { s.style.minHeight = ''; });
        rasterBasis = 0;
        return;
    }

    // Freiraum unten muss genau der Leistenhöhe entsprechen
    var leiste = document.querySelector('.title');
    if (leiste && getComputedStyle(leiste).position === 'fixed') {
        container.style.paddingBottom =
            Math.ceil(leiste.getBoundingClientRect().height) + 'px';
    } else {
        container.style.paddingBottom = '';
    }

    var cs = getComputedStyle(container);
    var innen = container.clientHeight
        - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (!(innen > 0)) return;

    // Schwelle gegen Safaris Leistenanimation, die resize im 17-ms-Takt feuert
    if (nurBeiAenderung && Math.abs(innen - rasterBasis) < 8) return;
    rasterBasis = innen;

    // die Section, die gerade oben steht, nach dem Umbau wieder dorthin
    var obenKante = container.getBoundingClientRect().top;
    var oben = null;
    sections.forEach(function (s) {
        if (!oben && s.getBoundingClientRect().bottom - obenKante > 1) oben = s;
    });

    var viertel = innen / an;
    sections.forEach(function (s) { s.style.minHeight = ''; });

    // erst alles messen, dann alles setzen
    var plaetze = [];
    sections.forEach(function (s) {
        // 1px Toleranz, sonst rundet eine exakt passende Section auf zwei auf
        plaetze.push(Math.max(1, Math.ceil((s.getBoundingClientRect().height - 1) / viertel)));
    });
    sections.forEach(function (s, i) {
        s.style.minHeight = (plaetze[i] * viertel) + 'px';
    });

    if (oben) {
        var glatt = container.style.scrollBehavior;
        container.style.scrollBehavior = 'auto';
        container.scrollTop += oben.getBoundingClientRect().top - obenKante;
        container.style.scrollBehavior = glatt;
    }
}

// erst nach Ruhe neu rastern, nicht bei jedem Zwischenschritt
var rasterTimer = null;

window.addEventListener('resize', function () {
    clearTimeout(rasterTimer);
    rasterTimer = setTimeout(function () { raster(true); }, 250);
});

// Icon-Schrift vom CDN ändert nach dem Laden die Kopfhöhe
if (document.fonts) document.fonts.ready.then(function () { raster(); });

// nach einem Sprung den Inhalt fokussieren, sonst laufen die Pfeiltasten ins Leere
function focusContent(sec) {
    var c = document.getElementById('container');

    // Ziel ist die angesprungene Section
    var fest = sec && sec.nodeType === 1 ? sec : null;

    // Ziel bei jedem Versuch neu bestimmen — beim Klick ist der Hash noch alt
    var setzen = function () {
        var ziel = fest;
        if (!ziel && location.hash.length > 1) {
            var el = document.getElementById(location.hash.slice(1));
            ziel = el && el.closest('section');
        }
        // sofort mitziehen, sonst leuchten bis zur Scroll-Ruhe zwei Bereiche
        if (ziel) {
            document.querySelectorAll('#container section.aktuell')
                .forEach(function (s) { s.classList.remove('aktuell'); });
            ziel.classList.add('aktuell');
        }
        (ziel || c).focus({ preventScroll: true });
    };

    // dreifach, weil jeder Zeitpunkt für sich unzuverlässig ist
    setzen();
    if (document.readyState === 'complete') requestAnimationFrame(setzen);
    else window.addEventListener('load', setzen, { once: true });
    setTimeout(setzen, 250);
}

// hashchange feuert nach der Sprungmarke — dort sitzt der Fokus zuverlässig
window.addEventListener('hashchange', function () { focusContent(); });

// Pfeiltasten summieren sich auf ein Ziel, statt auf die Animation zu warten
var jumpTarget = null;

function jumpBy(delta, umlaufen) {
    var sections = document.querySelectorAll('#container section');
    if (!sections.length) return;
    var base = jumpTarget;
    // Maus seit dem letzten Tastendruck bewegt: von der Section unter der Maus aus
    var unterMaus = mausBewegt ? mausSection() : null;
    mausBewegt = false;
    if (unterMaus) {
        base = Array.prototype.indexOf.call(sections, unterMaus);
    } else if (base === null) {
        var aktiv = document.querySelector('#container section h3.name.active');
        base = 0;
        sections.forEach(function (s, i) { if (aktiv && s.contains(aktiv)) base = i; });
    }
    var ziel = base + delta;
    jumpTarget = umlaufen
        // von der letzten zur ersten und zurück
        ? (ziel % sections.length + sections.length) % sections.length
        : Math.max(0, Math.min(sections.length - 1, ziel));
    sections[jumpTarget].scrollIntoView();
    focusContent(sections[jumpTarget]);
}

// Pfeil links/rechts: von Kachel zu Kachel, über Section-Grenzen hinweg.
// Ausgangspunkt: die zuletzt mit der Maus berührte Kachel, wenn die Maus seit dem
// letzten Tastendruck bewegt wurde; sonst die fokussierte; sonst die erste der Section
var mausKachel = null;
var mausBewegt = false;

var mausPunkt = null;   // letzte Mausposition im Fenster

function mausSection() {
    var el = mausPunkt && document.elementFromPoint(mausPunkt.x, mausPunkt.y);
    return el && el.closest ? el.closest('#container section') : null;
}

function linkBy(delta) {
    var links = Array.prototype.slice.call(document.querySelectorAll('#container li a'));
    if (!links.length) return;
    var i = -1, ziel = null;
    if (mausBewegt) {
        var el = mausPunkt && document.elementFromPoint(mausPunkt.x, mausPunkt.y);
        var kachel = el && el.closest && el.closest('#container li a');
        if (kachel) i = links.indexOf(kachel);
        else {
            // Maus in einer Section, aber nicht auf einer Kachel: deren erste Kachel
            var unter = mausSection();
            ziel = unter && unter.querySelector('li a');
        }
    }
    if (i === -1 && !ziel) i = links.indexOf(document.activeElement);
    mausBewegt = false;
    if (ziel) {
        // Ausgangspunkt war die Section unter der Maus
    } else if (i === -1) {
        var sec = document.querySelector('#container section.aktuell') ||
            document.querySelector('#container section');
        ziel = sec.querySelector('li a') || links[0];
    } else {
        ziel = links[Math.max(0, Math.min(links.length - 1, i + delta))];
    }
    ziel.focus();
}

// Pfeiltasten: auch ohne Fokus im Inhalt (z. B. nach einem Klick in die Leiste) —
// im Edit-Mode und in Eingabefeldern gehören sie dem Textcursor
document.addEventListener('keydown', function (e) {
    if (document.body.classList.contains('edit-mode')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    if (t !== document.body && !(t.closest && t.closest('#container'))) return;
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

function makeLi(name, url, tot) {
    var li = document.createElement('li');
    if (tot) li.classList.add('tot');   // beim letzten Test nicht erreichbar
    var a = document.createElement('a');
    a.tabIndex = 0;
    a.href = url;
    a.textContent = name;
    li.appendChild(a);
    return li;
}

// ── Gezeichneter Strich-Cursor in der Kachel (Position für li a::after) ──
// auch beim Betreten (mouseover): sonst blitzt der Strich kurz an der alten Position
function setzeStrich(e) {
    var a = e.target.closest('li a');
    if (!a) return;
    mausKachel = a;   // Ausgangspunkt für die Pfeiltasten (linkBy)
    var r = a.getBoundingClientRect();
    a.style.setProperty('--cx', (e.clientX - r.left) + 'px');
}
document.getElementById('container').addEventListener('mouseover', setzeStrich);
document.getElementById('container').addEventListener('mousemove', setzeStrich);

// ── Einstellungen: Zahnrad in der Leiste, Overlay mit einem Knopf pro Einstellung ──
// Ein Icon pro Einstellung zeigt den aktuellen Wert; jeder Klick schaltet reihum weiter. API für Zoom/Farbschema steht im <head>.
// icon: Font-Awesome-Klasse oder Buchstabe (Zoom); zeigt den aktuellen Wert
var EINSTELLUNGEN = [
    {
        label: 'Zoom',
        werte: [['auto', 'automatisch'], ['s', 'S'], ['m', 'M'], ['l', 'L']],
        get: function () { return window.msmrZoom.mode() === 'auto' ? 'auto' : window.msmrZoom.get(); },
        // vier Stufen: a (automatisch), S, M, L
        icon: function (w) { return { text: w === 'auto' ? 'a' : w.toUpperCase() }; },
        beschr: function (w) { return w === 'auto' ? 'automatisch (' + window.msmrZoom.get().toUpperCase() + ')' : null; },
        set: function (w) { if (w === 'auto') window.msmrZoom.reset(); else window.msmrZoom.set(w); }
    },
    {
        label: 'Farbschema',
        werte: [['auto', 'automatisch'], ['light', 'hell'], ['dark', 'dunkel']],
        icons: { auto: 'fa-circle-half-stroke', light: 'fa-sun', dark: 'fa-moon' },
        get: function () { return window.msmrTheme.get(); },
        set: function (w) { window.msmrTheme.set(w); }
    },
    {
        label: 'Navigation',
        werte: [['short', 'Text'], ['icons', 'Icons']],
        // Squircle wie bei APP; mit „t“ darin = Text aktiv
        squircle: { short: true, icons: false },
        get: function () { return getPref('navMode'); },
        set: function (w) { setPref('navMode', w); }
    },
    {
        label: 'Ausrichtung',
        werte: [['left', 'links'], ['center', 'Mitte']],
        // „l“ linksbündig bzw. „c“ zentriert in einer festen Breite
        buchstabe: { left: 'l', center: 'c' },
        get: function () { return getPref('align'); },
        set: function (w) { setPref('align', w); }
    },
    {
        label: 'Bearbeiten',
        werte: [['aus', 'aus'], ['an', 'an (zum Beenden drücken)']],
        // zwei Chevrons übereinander = aus; Diskette = es wird bearbeitet, Klick beendet und fragt nach dem Speichern
        icons: { aus: ['fa-chevron-up', 'fa-chevron-down'], an: 'fa-floppy-disk' },
        get: function () { return document.body.classList.contains('edit-mode') ? 'an' : 'aus'; },
        set: function (w) { if (w === 'an') enterEditMode(); else beendeBearbeiten(); },
        schliesst: true
    }
];

function settingsAnzeige() {
    document.querySelectorAll('#settings-pop .set-btn').forEach(function (b, i) {
        var e = EINSTELLUNGEN[i], w = e.get();
        var beschr = (e.beschr && e.beschr(w)) ||
            e.werte.filter(function (p) { return p[0] === w; })[0][1];
        var ic = b.querySelector('.set-icon');
        if (e.icon) {
            var d = e.icon(w);
            ic.className = 'set-icon set-letter' + (d.auto ? ' auto' : '');
            ic.textContent = d.text;
        } else if (e.squircle) {
            ic.className = 'set-icon icon-squircle' + (e.squircle[w] ? ' mit-t' : '');
            ic.textContent = '';
        } else if (e.buchstabe) {
            ic.className = 'set-icon set-letter set-ausrichtung ' + w;
            ic.textContent = e.buchstabe[w];
        } else if (Array.isArray(e.icons[w])) {
            // mehrere Symbole als ein Icon, senkrecht gestapelt
            ic.className = 'set-icon set-stapel';
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
        b.title = e.label + ': ' + beschr;
        b.setAttribute('aria-label', e.label + ': ' + beschr + ' — zum Umschalten drücken');
    });
}

// bündig unter dem Zahnrad, gleich breit; in der unteren Leiste (Telefon) bündig darüber
function settingsPlatzieren() {
    var pop = document.getElementById('settings-pop');
    var r = document.getElementById('settings-btn').getBoundingClientRect();
    var oben = r.top > window.innerHeight / 2;
    pop.style.width = r.width + 'px';
    pop.style.left = r.left + 'px';
    pop.style.right = 'auto';
    pop.style.top = oben ? 'auto' : r.bottom + 'px';
    pop.style.bottom = oben ? (window.innerHeight - r.top) + 'px' : 'auto';
    pop.classList.toggle('nach-oben', oben);
}

(function () {
    var pop = document.getElementById('settings-pop');
    EINSTELLUNGEN.forEach(function (e) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'set-btn';
        b.innerHTML = '<span class="set-icon" aria-hidden="true"></span>';
        b.addEventListener('click', function () {
            var i = 0, w = e.get();
            e.werte.forEach(function (p, k) { if (p[0] === w) i = k; });
            e.set(e.werte[(i + 1) % e.werte.length][0]);
            settingsAnzeige();
            if (e.schliesst) { pop.hidePopover(); return; }
            settingsPlatzieren();   // der Zoom verschiebt das Zahnrad
        });
        pop.appendChild(b);
    });
    // Zahnrad: Klick schaltet das Overlay um; mit der Maus geht auch drücken, auf einen Knopf ziehen
    // und loslassen — das schaltet nur diesen Knopf weiter und schließt das Overlay (wie ein Menü)
    var zg = document.getElementById('settings-btn');
    var maus = false, warOffen = false;
    function offen() { return pop.matches(':popover-open'); }
    function knopfUnter(ev) {
        var el = document.elementFromPoint(ev.clientX, ev.clientY);
        return el && el.closest ? el.closest('#settings-pop .set-btn') : null;
    }
    zg.addEventListener('pointerdown', function (ev) {
        if (ev.pointerType !== 'mouse' || ev.button !== 0) return;
        maus = true;
        warOffen = offen();
        if (!warOffen) pop.showPopover();
    });
    document.addEventListener('pointerup', function (ev) {
        if (!maus) return;
        var knopf = knopfUnter(ev);
        var aufZahnrad = ev.target.closest && ev.target.closest('#settings-btn');
        if (knopf) { knopf.click(); if (offen()) pop.hidePopover(); }   // gezogen und losgelassen: schalten, schließen
        else if (aufZahnrad) { if (warOffen) pop.hidePopover(); }   // einfacher Klick: umschalten
        else pop.hidePopover();   // woanders losgelassen
        maus = !!aufZahnrad;   // nach dem Loslassen auf dem Zahnrad folgt noch der click, den der Handler unten überspringt
    });
    // Tastatur und Touch: normaler Klick; ein Mausklick wurde oben schon behandelt
    zg.addEventListener('click', function () {
        if (maus) { maus = false; return; }
        if (offen()) pop.hidePopover(); else pop.showPopover();
    });
    // Klick außerhalb und Esc schließen (manuelles Popover kennt beides nicht)
    document.addEventListener('pointerdown', function (ev) {
        if (offen() && !ev.target.closest('#settings-pop, #settings-btn')) pop.hidePopover();
    });
    document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && offen()) pop.hidePopover();
    });

    pop.addEventListener('beforetoggle', function (ev) {
        if (ev.newState === 'open') settingsPlatzieren();
    });
    window.addEventListener('resize', function () { if (pop.matches(':popover-open')) settingsPlatzieren(); });

    // Mit Maus: schließt sich 3 s nach dem Verlassen von Overlay und Zahnrad (Touch/ohne Zeiger: nie)
    var zeiger = matchMedia('(hover: hover) and (pointer: fine)');
    var zu = null;
    function zuStoppen() { clearTimeout(zu); zu = null; }
    function zuStarten() {
        zuStoppen();
        if (!zeiger.matches || !pop.matches(':popover-open')) return;
        zu = setTimeout(function () { if (pop.matches(':popover-open')) pop.hidePopover(); }, 3000);
    }
    var zahnrad = document.getElementById('settings-btn');
    [pop, zahnrad].forEach(function (el) {
        el.addEventListener('mouseenter', zuStoppen);
        el.addEventListener('mouseleave', zuStarten);
    });
    // Tastaturbedienung im Overlay hält es offen
    pop.addEventListener('focusin', zuStoppen);
    pop.addEventListener('focusout', zuStarten);
    pop.addEventListener('toggle', function (ev) {
        var an = ev.newState === 'open';
        zahnrad.classList.toggle('offen', an);   // Zahnrad kehrt um, solange das Overlay offen ist
        zahnrad.setAttribute('aria-expanded', an);
        if (an) zuStarten(); else zuStoppen();
    });
    document.addEventListener('msmrzoom', settingsAnzeige);
    document.addEventListener('msmrtheme', settingsAnzeige);
    settingsAnzeige();
})();

document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;   // Browser-Zoom bleibt unberührt
    if (e.target.closest('input, select, textarea, [contenteditable]')) return;
    if (e.key === '+' || e.key === '=') window.msmrZoom.step(1);
    else if (e.key === '-') window.msmrZoom.step(-1);
    else if (e.key === '0') window.msmrZoom.reset();
});

// ── Maus oder Tastatur: nur das zuletzt benutzte Gerät hebt eine Kachel hervor ──
document.addEventListener('keydown', function (e) {
    if (e.key === 'Tab' || e.key.indexOf('Arrow') === 0) document.body.classList.add('tastatur');
});
document.addEventListener('mousemove', function (e) {
    document.body.classList.remove('tastatur');
    mausPunkt = { x: e.clientX, y: e.clientY };
    mausBewegt = true;
});

// APP gehört als 3. Section in die Reihe; fehlt sie in den gespeicherten Daten, kommt sie leer dazu
function mitApp(data) {
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
fetch('links.php?t=' + Date.now())
    .then(function (r) { return r.json(); })
    .then(mitApp)
    .then(render)
    .catch(function (e) {
        document.getElementById('container').innerHTML =
            '<p style="color:red;padding:20px">links.json Ladefehler: ' + e + '</p>';
    });

// ── Edit Mode ─────────────────────────────────────────────────────

// Doppelklick auf Titel-Bereich → Edit Mode
document.querySelector('.title').addEventListener('dblclick', function (e) {
    if (e.target.closest('a') || e.target.tagName === 'SELECT') return;
    enterEditMode();
});

function preventEnter(e) { if (e.key === 'Enter') e.preventDefault(); }

// Löschen ist bis zum Speichern umkehrbar
function makeDelButton(li) {
    var del = document.createElement('span');
    del.className = 'btn-del';
    del.textContent = '×';
    del.title = 'Löschen';
    del.addEventListener('click', function () {
        var removed = li.classList.toggle('removed');
        del.textContent = removed ? '↺' : '×';
        del.title = removed ? 'Wiederherstellen' : 'Löschen';
    });
    return del;
}

// GET beantwortet save.php mit 405, ohne etwas anzufassen; 401 kommt vom Server davor
function darfSpeichern() {
    return fetch('edit/save.php')
        .then(function (r) { return r.status !== 401; })
        .catch(function () { return false; });   // im Zweifel nichts freigeben
}

// Ohne Anmeldung (401 vom Server) passiert nichts — der Edit Mode bleibt zu
function enterEditMode() {
    darfSpeichern().then(function (darf) {
        if (!darf) return;
        document.body.classList.add('edit-mode');
        raster();   // gesetzte Rasterhöhen lösen, sonst schlagen sie die Edit-Regeln
        linksFreigeben();
        settingsAnzeige();
    });
}

function linksFreigeben() {
    document.querySelectorAll('ul.group li:not(.btn-add)').forEach(function (li) {
        if (li.querySelector('a') && !li.querySelector('.edit-url')) felderAnlegen(li);
    });

    document.querySelectorAll('ul.group').forEach(function (ul) {
        if (ziehbar()) sortierbar(ul);
        if (ul.querySelector('.btn-add')) return;
        var add = document.createElement('li');
        add.className = 'btn-add';
        add.textContent = '+';
        add.title = 'Link hinzufügen';
        add.addEventListener('click', function () { addLink(ul, add); });
        ul.appendChild(add);
    });
}

// Name und URL bearbeitbar machen, Anfasser und Löschknopf anhängen
function felderAnlegen(li) {
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
    if (ziehbar()) li.insertBefore(makeMoveHandle(li), a);
}

function addLink(ul, addBtn) {
    var li = makeLi('Neuer Link', 'https://');
    felderAnlegen(li);
    ul.insertBefore(li, addBtn);
    li.querySelector('a').focus();
}

// ── Sortieren ─────────────────────────────────────────────────────

// Ziehen braucht eine Maus; am Finger bliebe der Anfasser wirkungslos
function ziehbar() { return matchMedia('(pointer: fine)').matches; }

var gezogen = null;      // Kachel, die gerade zieht
var vorbereitet = null;  // Kachel, deren Anfasser gedrückt ist
var startPlatz = null;   // Nachbar beim Zugbeginn, für die Rückkehr beim Abbruch
var startListe = null;   // Liste beim Zugbeginn: eine Kachel darf in jede Section wandern

// ein Klick ohne Zug muss die Kachel wieder festsetzen
document.addEventListener('mouseup', function () {
    if (vorbereitet) {
        vorbereitet.draggable = false;
        vorbereitet.classList.remove('gepackt');
        vorbereitet = null;
    }
});

// außerhalb jeder Liste: Kachel kehrt an den Start zurück und zeigt den Abbruch —
// was man sieht, ist immer das Ergebnis des Loslassens
document.addEventListener('dragover', function (e) {
    if (!gezogen) return;
    var drin = !!(e.target.closest && e.target.closest('ul.group'));
    gezogen.classList.toggle('abbruch', !drin);
    if (!drin && (gezogen.parentNode !== startListe || gezogen.nextSibling !== startPlatz)) {
        startListe.insertBefore(gezogen, startPlatz);
    }
});

// draggable erst beim Griff setzen, sonst zieht jede Textauswahl die Kachel mit
function makeMoveHandle(li) {
    var griff = document.createElement('span');
    griff.className = 'btn-move';
    griff.textContent = '⠿';
    griff.title = 'Verschieben';
    griff.addEventListener('mousedown', function () {
        li.draggable = true;
        // jetzt schon, denn das Zugbild ist ein Schnappschuss der Kachel
        // beim Zugbeginn — erst dann wäre der Hintergrund nicht mit drauf
        li.classList.add('gepackt');
        vorbereitet = li;
    });

    li.addEventListener('dragstart', function (e) {
        gezogen = li;
        startPlatz = li.nextSibling;
        startListe = li.parentNode;
        // erst nach dem Schnappschuss des Zugbilds, sonst trägt auch das
        // mitfliegende Bild das Ziel-Highlight
        setTimeout(function () { if (gezogen === li) li.classList.add('dragging'); });
        e.dataTransfer.effectAllowed = 'move';
        // Firefox startet ohne gesetzte Daten gar keinen Zug
        e.dataTransfer.setData('text/plain', '');
    });
    li.addEventListener('dragend', function () {
        // Loslassen im Aus, ohne dass der Abbruch-Handler noch feuerte
        if (li.classList.contains('abbruch') &&
            (li.parentNode !== startListe || li.nextSibling !== startPlatz)) {
            startListe.insertBefore(li, startPlatz);
        }
        li.classList.remove('dragging', 'abbruch', 'gepackt');
        li.draggable = false;
        gezogen = null;
        vorbereitet = null;
        startPlatz = null;
        startListe = null;
    });
    return griff;
}

function sortierbar(ul) {
    if (ul.dataset.sortierbar) return;
    ul.dataset.sortierbar = '1';

    ul.addEventListener('dragover', function (e) {
        if (!gezogen) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        // Ziel ist die ganze Kachel unterm Zeiger, keine Lückenrechnerei:
        // sie gibt ihren Platz her, die Zugrichtung entscheidet die Seite.
        // Über Lücken (auch der eigenen Kachel) bleibt die Vorschau stehen.
        var ziel = e.target.closest ? e.target.closest('li') : null;
        if (!ziel || ziel === gezogen || ziel.parentNode !== ul) return;   // Lücken: Vorschau bleibt
        var vor = ziel.classList.contains('btn-add') ? ziel
            // Ziel liegt vor der Zugkachel → davor, sonst dahinter
            : (ziel.compareDocumentPosition(gezogen) & Node.DOCUMENT_POSITION_FOLLOWING)
                ? ziel : ziel.nextSibling;
        if (vor !== gezogen && vor !== gezogen.nextSibling) ul.insertBefore(gezogen, vor);
    });

    // die Kachel steht schon am Ziel; preventDefault hält den Browser nur
    // davon ab, den Zugtext in das contentEditable darunter zu setzen
    ul.addEventListener('drop', function (e) { e.preventDefault(); });
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
            var eintrag = { name: name, url: url };
            // Tot-Markierung mitschreiben; eine geänderte URL hebt sie auf
            if (li.classList.contains('tot') && url === li.dataset.url0) eintrag.tot = true;
            links.push(eintrag);
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
function aenderungen() {
    var geloescht = [], geaendert = [], verschoben = [], neu = 0;
    document.querySelectorAll('ul.group li:not(.btn-add)').forEach(function (li) {
        var a = li.querySelector('a');
        if (!a) return;
        if (li.dataset.url0 === undefined) { neu++; return; }
        var urlFeld = li.querySelector('.edit-url');
        var name = a.textContent.trim();
        var url = urlFeld ? urlFeld.textContent.trim() : a.getAttribute('href');

        if (li.classList.contains('removed')) {
            geloescht.push('· ' + li.dataset.name0 + '  ' + li.dataset.url0);
        } else if (name !== li.dataset.name0 || url !== li.dataset.url0) {
            geaendert.push('· ' + li.dataset.name0 + '  ' + li.dataset.url0 +
                '\n  → ' + name + '  ' + url);
        }
    });

    // Umgestellt heißt: die Ausgangspositionen steigen nicht mehr an
    document.querySelectorAll('#container section').forEach(function (section) {
        var ul = section.querySelector('ul.group');
        if (!ul) return;
        var secId = (section.querySelector('h3.name') || {}).id;
        var letzte = -1, umgestellt = false;
        ul.querySelectorAll('li:not(.btn-add):not(.removed)').forEach(function (li) {
            if (li.dataset.pos0 === undefined) return;   // neu, hat keine Ausgangsposition
            if (li.dataset.sec0 !== secId) umgestellt = true;   // aus einer anderen Section herübergezogen
            var pos = +li.dataset.pos0;
            if (pos < letzte) umgestellt = true;
            letzte = pos;
        });
        var titel = section.querySelector('h3.name a');
        if (umgestellt) verschoben.push('· ' + (titel ? titel.textContent : ''));
    });

    return { geloescht: geloescht, geaendert: geaendert, verschoben: verschoben, neu: neu };
}

// Text der Änderungen für die Rückfrage; leer, wenn nichts zu speichern ist
function aenderungsText() {
    var d = aenderungen();
    if (!d.geaendert.length && !d.geloescht.length && !d.verschoben.length) {
        return d.neu ? 'Neue Einträge speichern?' : '';
    }
    var text = 'Änderungen speichern?\n';
    if (d.geaendert.length) {
        text += '\nGeändert (' + d.geaendert.length + '):\n' + d.geaendert.join('\n') + '\n';
    }
    if (d.verschoben.length) {
        text += '\nReihenfolge geändert (' + d.verschoben.length + '):\n' +
            d.verschoben.join('\n') + '\n';
    }
    if (d.geloescht.length) {
        text += '\nGelöscht (' + d.geloescht.length + '):\n' + d.geloescht.join('\n') + '\n';
    }
    return text;
}

// Bearbeiten beenden: nichts geändert → einfach zu; sonst fragen, ob gespeichert wird,
// bei „Nein“ ob verworfen wird; bei erneutem „Nein“ bleibt der Edit Mode offen
function beendeBearbeiten() {
    var text = aenderungsText();
    if (!text) { location.reload(); return; }
    if (confirm(text)) save();
    else if (confirm('Änderungen verwerfen?')) location.reload();
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
            throw new Error('Nicht angemeldet — /edit/ einmal direkt im Browser aufrufen und anmelden.');
        }
        if (!r.ok) throw new Error('HTTP ' + r.status);
        document.querySelector('.titledomain').textContent = '✓';
        setTimeout(function () { location.reload(); }, 800);
    })
    .catch(function (err) { alert('Fehler: ' + err.message); });
}
