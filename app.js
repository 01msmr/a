// ── Ansichts-Einstellungen ────────────────────────────────────────
var PREF_DEFAULTS = { navMode: 'short', align: 'left', view: 'chips', farbe: 'bunt' };

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
    document.documentElement.dataset.farbe = getPref('farbe');
    if (typeof settingsAnzeige === 'function') settingsAnzeige();
    dropdownBeschriften();
}

// Dropdown: im Icon-Modus das Icon-Zeichen der Section statt ihres Namens
function dropdownBeschriften() {
    var icons = document.body.classList.contains('nav-icons');
    document.querySelectorAll('#section-jumper option').forEach(function (o) {
        if (o.dataset.glyph === undefined) {
            var i = makeIcon(o.dataset.icon);
            document.body.appendChild(i);
            var z = getComputedStyle(i, '::before').content.replace(/["']/g, '');
            i.remove();
            o.dataset.glyph = o.dataset.icon === 'icon-squircle' || !z || z === 'none' ? '\uf0c8' : z;
        }
        o.textContent = icons ? o.dataset.glyph : o.dataset.titel;
        o.title = o.dataset.titel;
    });
}

applyPrefs();

// ── Render ────────────────────────────────────────────────────────
var syncActive = function () { };
var selSprung = null;   // Ziel eines Sprungs über das Dropdown: es zeigt bis zur Ankunft diese Section

// kräftige, gesättigte Farben (ohne Grauanteil): weiße Schrift (hell) bzw. dunkle Schrift (dunkel) bleibt lesbar
var SEC_COLORS = ['#f85a5a', '#fb8f2a', '#e2a800', '#8ac430', '#2fc16c', '#22b59f', '#18b4d6',
    '#4a92f0', '#6c70f2', '#9a62f0', '#c456e8', '#ea4fa8', '#f4587a', '#f67a3a', '#2fae82'];

// Section-Farbe: gleiche Helligkeit und Tönung, die Sättigung folgt --farb-int (styles.css, Einstellung „Farbe“)
function secFarbe(idx, intensitaet) {
    return 'oklch(from ' + SEC_COLORS[idx % SEC_COLORS.length] + ' l calc(c * ' + (intensitaet || 'var(--farb-int, 1)') + ') h)';
}

function makeIcon(icon) {
    var i = document.createElement('i');
    // APP-Section: Font Awesomes fa-square (nächstes Rundrechteck) statt der eigenen Squircle-Maske
    if (icon === 'icon-squircle') icon = 'fa-square';
    i.className = 'fa-solid ' + (icon || 'fa-hashtag') + ' secicon';
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

// Sections-Liste: ein Eintrag je Section (Icon oder Name), öffnet statt des nativen Menüs
function jumperListe(data) {
    var pop = document.getElementById('jumper-pop');
    pop.innerHTML = '';
    data.forEach(function (sec) {
        var a = document.createElement('a');
        a.href = '#' + sec.id;
        a.target = '_self';
        a.appendChild(makeIcon(sec.icon));
        var t = document.createElement('span');
        t.className = 'secshort';
        t.textContent = sec.title;
        a.appendChild(t);
        a.title = sec.title;
        a.addEventListener('click', function (ev) {
            ev.preventDefault();
            pop.hidePopover();
            var sel = document.getElementById('section-jumper');
            sel.value = '#' + sec.id;
            sel.dispatchEvent(new Event('change'));
        });
        pop.appendChild(a);
    });
}

(function () {
    var sel = document.getElementById('section-jumper');
    var pop = document.getElementById('jumper-pop');
    function offen() { return pop.matches(':popover-open'); }
    function oeffnen() {
        var r = sel.getBoundingClientRect(), oben = r.top > window.innerHeight / 2;
        pop.style.width = r.width + 'px';   // bündig mit dem Feld, wie das Einstellungs-Overlay
        pop.style.left = r.left + 'px';
        pop.style.top = oben ? 'auto' : r.bottom + 'px';
        pop.style.bottom = oben ? (window.innerHeight - r.top) + 'px' : 'auto';
        pop.style.maxHeight = (oben ? r.top : window.innerHeight - r.bottom) - 8 + 'px';
        pop.classList.toggle('nach-oben', oben);
        pop.querySelectorAll('a').forEach(function (a) {
            a.classList.toggle('aktiv', a.getAttribute('href') === sel.value);
        });
        pop.showPopover();
    }
    function eintragUnter(ev) {
        var el = document.elementFromPoint(ev.clientX, ev.clientY);
        return el && el.closest ? el.closest('#jumper-pop a') : null;
    }
    // drücken, auf einen Eintrag ziehen, loslassen wählt ihn (wie beim Einstellungs-Overlay); ein einfacher Klick öffnet/schließt
    var gedrueckt = false, warOffen = false;
    sel.addEventListener('mousedown', function (ev) {
        ev.preventDefault();   // kein natives Menü
        gedrueckt = true;
        warOffen = offen();
        if (!warOffen) oeffnen();
    });
    document.addEventListener('mouseup', function (ev) {
        if (!gedrueckt) return;
        gedrueckt = false;
        var e = eintragUnter(ev);
        if (e) e.click();
        else if (ev.target.closest('#section-jumper')) { if (warOffen) pop.hidePopover(); }
        else pop.hidePopover();
    });
    sel.addEventListener('keydown', function (ev) {
        if (!(ev.key === 'Enter' || ev.key === ' ' || ev.key === 'ArrowDown' || ev.key === 'ArrowUp')) return;
        ev.preventDefault();
        oeffnen();
        var ak = pop.querySelector('a.aktiv');
        if (ak) { ak.scrollIntoView({ block: 'nearest' }); ak.focus(); }
    });
    pop.addEventListener('keydown', function (ev) {
        var l = Array.prototype.slice.call(pop.querySelectorAll('a')), i = l.indexOf(document.activeElement);
        if (ev.key === 'ArrowDown') { ev.preventDefault(); l[Math.min(i + 1, l.length - 1)].focus(); }
        else if (ev.key === 'ArrowUp') { ev.preventDefault(); l[Math.max(i - 1, 0)].focus(); }
    });
    document.addEventListener('pointerdown', function (ev) {
        if (offen() && !ev.target.closest('#jumper-pop, #section-jumper')) pop.hidePopover();
    });
    document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && offen()) { pop.hidePopover(); sel.focus(); }
    });
})();

function render(data) {
    var chipOf = {};
    var nav = document.getElementById('section-nav-list');
    var sel = document.getElementById('section-jumper');
    var zahnrad = document.getElementById('settings-btn');   // bleibt als letzter Eintrag in der Leiste
    nav.querySelectorAll('.secname').forEach(function (a) { a.remove(); });
    sel.innerHTML = '';

    data.forEach(function (sec, idx) {
        var a = document.createElement('a');
        a.style.setProperty('--c', secFarbe(idx));
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
        nav.insertBefore(a, zahnrad);
        chipOf[sec.id] = a;

        var opt = document.createElement('option');
        opt.value = '#' + sec.id;
        opt.dataset.titel = sec.title;
        opt.dataset.icon = sec.icon || '';
        sel.appendChild(opt);
    });
    dropdownBeschriften();
    jumperListe(data);

    sel.addEventListener('change', function () {
        selSprung = sel.value;
        // Auffangnetz: die letzte Section erreicht den oberen Rand evtl. nie
        setTimeout(function () { selSprung = null; syncActive(); }, 1500);
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
        section.style.setProperty('--c', secFarbe(idx));   // erbt an Titel und Kacheln
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
    maszLesen();
    lichtInit();
    strichSecInit();
    fensterInit();
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
        if (selSprung === null || selSprung === active) { selSprung = null; sel.value = active; }
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

// Zahlen aus den CSS-Variablen (:root in styles.css), einmal gelesen
var masz = {};
function maszLesen() {
    var cs = getComputedStyle(document.documentElement);
    ['fenster-dauer', 'fenster-dauer-kurz', 'gleiten-potenz', 'licht-dauer', 'licht-potenz', 'licht-rand-dauer', 'licht-deckung',
        'geist-schatten', 'geist-auslauf', 'geist-haelt', 'strich-schwach'].forEach(function (n) {
        masz[n] = parseFloat(cs.getPropertyValue('--' + n));
    });
}
function gleiten(t) { return Math.pow(t, masz['gleiten-potenz']); }
maszLesen();

// ── Leuchtfenster ─────────────────────────────────────────────────
// Die leuchtende Section (Hover, Nav-Chip, Tastatur, sonst die oberste) ist ein Fenster, das zur
// nächsten gleitet und dabei wächst bzw. schrumpft. Die Farbe wechselt hart an den Section-Kanten:
// jede Section malt nur ihren Teil des Fensters als Hintergrund. Zeilen (Titel, Gruppe, Kacheln)
// bekommen .gedeckt, sobald ihre Mitte im Fenster liegt. Maße liegen im Inhalt, Scrollen ändert sie nicht.
var fenster = {
    container: null, secs: [], zeilen: [], sig: '', top: 0, bot: 0, ziel: null,
    von: null, nach: null, t0: 0, dauer: 0, raf: 0, obs: []
};

function fensterZiel() {
    var c = fenster.container, s = null, heiss = true;
    if (document.body.classList.contains('tastatur')) {
        s = c.querySelector('section:focus-visible') || c.querySelector('section:has(:focus-visible)');
    } else {
        s = c.querySelector('section:hover');
        if (!s) {
            // auch der Chip der aktiven Section zählt: ihr Titel zeigt dieselbe Hover-Fläche wie jeder andere
            var h = c.querySelector('.name.mit-hover');
            s = h && h.closest('section');
        }
    }
    if (!s) { s = c.querySelector('section.aktuell'); heiss = false; }
    return s ? { sec: s, heiss: heiss } : null;
}

// misst alle Section- und Zeilenmitten im Inhalt; true, wenn sich etwas verschoben hat
function fensterMessen() {
    var c = fenster.container, cr = c.getBoundingClientRect(), st = c.scrollTop;
    var secs = [], zeilen = [], sig = [];
    var y = function (r) { return Math.round(r.top - cr.top + st); };
    c.querySelectorAll('section').forEach(function (el) {
        var r = el.getBoundingClientRect();
        var name = el.querySelector('.name'), group = el.querySelector('.group');
        var rn = name && name.getBoundingClientRect();
        secs.push({ el: el, y: y(r), h: Math.round(r.height), an: null });
        if (rn) zeilen.push({ el: el, y: y(rn) + Math.round(rn.height / 2), an: null });
        if (rn) zeilen.push({ el: name, y: y(rn) + Math.round(rn.height / 2), an: null });
        if (group) zeilen.push({ el: group, y: y(group.getBoundingClientRect()), an: null });
        var lis = el.querySelectorAll('li');
        lis.forEach(function (li, i) {
            var rl = li.getBoundingClientRect();
            // die letzte Kachel meldet ihrer Gruppe, ob die letzte Zeile gedeckt ist (leere Rasterfelder)
            zeilen.push({ el: li, y: y(rl) + Math.round(rl.height / 2), an: null, ende: i === lis.length - 1 ? group : null });
            // die untere Rasterlinie schaltet an der Unterkante der Zeile, nicht in ihrer Mitte
            zeilen.push({ el: li, y: y(rl) + Math.round(rl.height) - 1, an: null, cls: 'gedeckt-u' });
        });
        // leere Felder der letzten Rasterzeile (Spalten minus Rest), für ::after der Gruppe
        if (group) {
            var spalten = getComputedStyle(group).gridTemplateColumns.split(' ').length;
            var leer = lis.length ? (spalten - lis.length % spalten) % spalten : spalten;
            group.style.setProperty('--leer', leer);
            group.classList.toggle('voll', leer === 0 || getComputedStyle(group).display !== 'grid');
        }
    });
    secs.forEach(function (s) { sig.push(s.y, s.h); });
    zeilen.forEach(function (z) { sig.push(z.y); });
    sig = sig.join(',');
    // Zustand der alten Zeilen mitnehmen, damit nichts flackert
    // (eine Zeile kann zwei Zustände haben: Mitte .gedeckt, Unterkante .gedeckt-u)
    var alt = new Map();
    fenster.zeilen.forEach(function (z) {
        var m = alt.get(z.el) || {};
        m[z.cls || ''] = z.an;
        alt.set(z.el, m);
    });
    zeilen.forEach(function (z) {
        var m = alt.get(z.el), k = z.cls || '';
        z.an = m && k in m ? m[k] : null;
    });
    var geaendert = sig !== fenster.sig;
    fenster.secs = secs; fenster.zeilen = zeilen; fenster.sig = sig;
    return geaendert;
}

function fensterMalen(top, bot) {
    fenster.top = top; fenster.bot = bot;
    fenster.secs.forEach(function (s) {
        var lo = Math.max(top, s.y) - s.y, hi = Math.min(bot, s.y + s.h) - s.y;
        var bild = hi > lo
            ? 'linear-gradient(to bottom, transparent ' + lo + 'px, var(--c) ' + lo + 'px, var(--c) ' + hi + 'px, transparent ' + hi + 'px)'
            : '';
        if (bild !== s.an) { s.el.style.backgroundImage = bild; s.an = bild; }
    });
    fenster.zeilen.forEach(function (z) {
        var an = z.y >= top && z.y < bot;
        if (an !== z.an) {
            z.el.classList.toggle(z.cls || 'gedeckt', an);
            if (z.ende) z.ende.classList.toggle('ende-gedeckt', an);
            z.an = an;
        }
    });
}

function fensterRahmen(sec) {
    for (var i = 0; i < fenster.secs.length; i++) {
        var s = fenster.secs[i];
        if (s.el === sec) return { top: s.y, bot: s.y + s.h };
    }
    return { top: 0, bot: 0 };
}

function fensterSchritt(jetzt) {
    var f = fenster, t = Math.min(1, (jetzt - f.t0) / f.dauer);
    // beschleunigt von Anfang an und endet hart: kein Auslaufen
    var e = gleiten(t);
    fensterMalen(f.von.top + (f.nach.top - f.von.top) * e, f.von.bot + (f.nach.bot - f.von.bot) * e);
    f.raf = t < 1 ? requestAnimationFrame(fensterSchritt) : 0;
}

// sofort ans Ziel (Start, Layoutwechsel) oder gleitend
function fensterZu(ziel, animiert) {
    var f = fenster;
    cancelAnimationFrame(f.raf); f.raf = 0;
    var nach = fensterRahmen(ziel && ziel.sec);
    if (!animiert) { fensterMalen(nach.top, nach.bot); return; }
    // reduzierte Bewegung heißt kürzer, nicht keine
    var kurz = matchMedia('(prefers-reduced-motion: reduce)').matches;
    f.von = { top: f.top, bot: f.bot }; f.nach = nach;
    f.dauer = kurz ? masz['fenster-dauer-kurz'] : masz['fenster-dauer']; f.t0 = performance.now();
    f.raf = requestAnimationFrame(fensterSchritt);
}

function fensterSync() {
    var f = fenster;
    if (!f.container) return;
    geistRender();
    var z = fensterZiel();
    f.container.querySelectorAll('section.heiss').forEach(function (s) {
        if (!z || s !== z.sec || !z.heiss) s.classList.remove('heiss');
    });
    if (z && z.heiss) z.sec.classList.add('heiss');
    if (z && z.sec === f.ziel) return;
    var erstes = !f.ziel;
    f.ziel = z && z.sec;
    fensterZu(z, !erstes);
}

function fensterLayout() {
    var f = fenster;
    if (!f.container || !fensterMessen()) return;
    f.ziel = null;   // neu bestimmen und ohne Gleiten setzen
    fensterSync();
}

function fensterPlan(fn) {
    var id = 0;
    return function () {
        cancelAnimationFrame(id);
        id = requestAnimationFrame(fn);
    };
}

function fensterInit() {
    var f = fenster, c = document.getElementById('container');
    f.obs.forEach(function (o) { o.disconnect(); });
    f.obs = [];
    cancelAnimationFrame(f.raf); f.raf = 0;
    geistZuruecksetzen();
    f.container = c; f.zeilen = []; f.secs = []; f.sig = ''; f.ziel = null; f.top = f.bot = 0;
    fensterMessen();
    fensterSync();

    var layout = fensterPlan(fensterLayout), sync = fensterPlan(fensterSync);
    var ro = new ResizeObserver(layout);
    ro.observe(c);
    c.querySelectorAll('section').forEach(function (s) { ro.observe(s); });
    // Klassen (aktuell, mit-hover, tastatur) ändern das Ziel; neue Kacheln und Ansichtswechsel die Maße
    var mo = new MutationObserver(function (ms) {
        var maße = ms.some(function (m) { return m.type === 'childList'; });
        (maße ? layout : sync)();
    });
    mo.observe(c, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    var bo = new MutationObserver(function () {
        layout(); sync();
        if (document.body.classList.contains('edit-mode')) lichtHart();
        lichtPlan();
    });
    bo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    f.obs.push(ro, mo, bo);
}

// Ereignisse hängen am Dokument und gelten für jeden Durchlauf von fensterInit
['mouseover', 'mouseout', 'focusin', 'focusout', 'keydown'].forEach(function (n) {
    document.addEventListener(n, fensterPlan(fensterSync));
});
document.addEventListener('scroll', fensterPlan(fensterSync), true);
window.addEventListener('resize', fensterPlan(fensterLayout));
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fensterPlan(fensterLayout));

// ── Geist-Titel ───────────────────────────────────────────────────
// Liegt der Titel der Ziel-Section (Nav-Chip unter der Maus oder Sprung nach Klick) außerhalb der Ansicht,
// klebt eine Kopie am oberen bzw. unteren Rand, bis der echte Titel dort ankommt und natürlich weiterläuft.
// Wechselt das Ziel, gleitet die neue Kopie über die vorige.
var geist = { ebene: null, cur: null, alt: [], sprung: null, sprungT: 0, weg: 0 };

function geistDauer() {
    return matchMedia('(prefers-reduced-motion: reduce)').matches ? masz['fenster-dauer-kurz'] : masz['fenster-dauer'];
}

function geistEbene() {
    if (!geist.ebene) {
        geist.ebene = document.createElement('div');
        geist.ebene.id = 'geist-ebene';
        geist.ebene.setAttribute('aria-hidden', 'true');
        document.body.appendChild(geist.ebene);
    }
    return geist.ebene;
}

// Sprung (Klick, Dropdown, Pfeiltasten): die Kopie bleibt, bis der Titel in der Ansicht ist
function geistSprung(sec) {
    geist.sprung = sec;
    clearTimeout(geist.sprungT);
    geist.sprungT = setTimeout(function () { geist.sprung = null; geistRender(); }, masz['geist-haelt']);
    geistRender();
}

function geistSection() {
    var c = fenster.container;
    var h = c && c.querySelector('.name.mit-hover:not(.active)');
    return (h && h.closest('section')) || geist.sprung;
}

function geistEntfernen(g, gleitend, blass) {
    if (!g) return;
    if (blass) {   // Übergabe an den echten Titel: kurz ausblenden, damit ein Versatz von wenigen Pixeln nicht springt
        g.el.style.transition = 'opacity 60ms linear';
        g.el.style.opacity = '0';
        setTimeout(function () { g.el.remove(); }, 70);
        return;
    }
    if (!gleitend) { g.el.remove(); return; }
    g.el.style.transform = g.lage === 'oben' ? 'translateY(-100%)' : 'translateY(100%)';
    setTimeout(function () { g.el.remove(); }, geistDauer() + 30);
}

function geistRender() {
    var c = fenster.container;
    if (!c) return;
    var sec = document.body.classList.contains('edit-mode') ? null : geistSection();
    var cr = c.getBoundingClientRect(), hoch = c.clientHeight;
    var lage = null, name = sec && sec.querySelector('.name'), hoehe = 0, abstand = 0, warten = null;
    if (name) {
        var r = name.getBoundingClientRect();
        hoehe = r.height;
        if (r.top < cr.top - 0.5) { lage = 'oben'; abstand = cr.top - r.top; }
        else if (r.top > cr.top + hoch - hoehe + 0.5) { lage = 'unten'; abstand = r.top - (cr.top + hoch - hoehe); }
        else if (sec === geist.sprung) {
            // angekommen: die Kopie liegt über dem echten Titel, bis das Fenster ihn gedeckt hat (sonst blitzt er grau auf)
            var oben = r.top - cr.top + c.scrollTop, f = fenster;
            var gedeckt = name.classList.contains('gedeckt') && f.top <= oben + 0.5 && f.bot >= oben + hoehe - 0.5;   // Zeile ganz im Fenster
            if (gedeckt || !geist.cur || geist.cur.sec !== sec) geist.sprung = null;
            else warten = r.top - cr.top;
        }
    }
    var cur = geist.cur;
    if (!lage && warten !== null) {
        cur.el.style.top = warten + 'px';
        cur.el.style.setProperty('--staerke', 0);
        return;
    }
    if (!lage) {
        // kein Ziel: gleitet hinaus; Titel in der Ansicht: der echte Titel übernimmt sofort
        geistEntfernen(cur, !sec, !!sec);
        geist.alt.forEach(function (g) { geistEntfernen(g, false); });
        geist.alt = []; geist.cur = null;
        return;
    }
    var ebene = geistEbene();
    ebene.style.left = cr.left + 'px';
    ebene.style.top = cr.top + 'px';
    ebene.style.width = c.clientWidth + 'px';
    ebene.style.height = hoch + 'px';
    var kachel = c.querySelector('li');
    ebene.style.setProperty('--schatten', (kachel ? kachel.offsetHeight : hoehe) * masz['geist-schatten'] + 'px');
    // nach einem Klick läuft der Schatten aus, je näher der echte Titel seiner Stelle kommt; dort ist er weg
    var staerke = sec === geist.sprung ? Math.min(1, abstand / (masz['geist-auslauf'] * hoehe)) : 1;
    if (cur && cur.sec === sec) {
        cur.el.classList.toggle('heiss', !!sec.querySelector('.name.mit-hover'));
        cur.el.style.setProperty('--staerke', staerke);
        cur.lage = lage;
        cur.el.classList.remove('oben', 'unten');
        cur.el.classList.add(lage);
        cur.el.style.top = (lage === 'oben' ? 0 : hoch - hoehe) + 'px';
        return;
    }
    // neue Kopie über die vorige
    var el = document.createElement('div');
    el.className = 'geist ' + lage;
    el.style.setProperty('--staerke', staerke);
    el.classList.toggle('heiss', !!sec.querySelector('.name.mit-hover'));
    el.style.setProperty('--c', sec.style.getPropertyValue('--c'));
    var klon = name.cloneNode(true);
    klon.removeAttribute('id');
    klon.className = 'name';
    klon.querySelectorAll('a').forEach(function (a) { a.tabIndex = -1; });
    el.appendChild(klon);
    el.style.top = (lage === 'oben' ? 0 : hoch - hoehe) + 'px';
    el.style.transform = lage === 'oben' ? 'translateY(-100%)' : 'translateY(100%)';
    ebene.appendChild(el);
    el.getBoundingClientRect();   // Ausgangslage festschreiben
    // beschleunigt und endet hart, wie das Fenster
    el.style.transition = 'transform ' + geistDauer() + 'ms cubic-bezier(.55, .085, .68, .19), filter ' + geistDauer() + 'ms linear';
    el.style.transform = 'none';
    var neu = { sec: sec, el: el, lage: lage };
    if (cur) { cur.el.classList.add('alt'); geist.alt.push(cur); }   // vorige: grau, ohne Schatten
    geist.cur = neu;
    clearTimeout(geist.weg);
    geist.weg = setTimeout(function () {
        geist.alt.forEach(function (g) { geistEntfernen(g, false); });
        geist.alt = [];
    }, geistDauer() + 30);
}

function geistZuruecksetzen() {
    clearTimeout(geist.weg); clearTimeout(geist.sprungT);
    if (geist.ebene) geist.ebene.innerHTML = '';
    geist.cur = null; geist.alt = []; geist.sprung = null;
}

// ── Kachel-Licht (Chips und Raster) ───────────────────────────────
// Die Hover-Fläche der Kachel ist ein einzelnes Element, das von Kachel zu Kachel gleitet
// (beschleunigt, endet hart). Aus dem Nichts kommt sie in voller Größe von außen in die Kachel
// und verlässt sie genauso, beschnitten auf die Kachel; nichts skaliert. Sie liegt im Inhalt und scrollt mit.
// modus: 'aus' (unsichtbar), 'ein' (auf einer Kachel oder unterwegs dorthin), 'raus' (verlässt die Kachel).
var licht = { el: null, modus: 'aus', tile: null, alt: null, da: new Set(), cur: null, von: null, nach: null,
    clip: null, radius: 0, t0: 0, dauer: 0, linear: false, raf: 0, ende: null, strich: null };

function lichtAktiv() {
    return !document.body.classList.contains('edit-mode');
}

function lichtRahmen(a) {
    var c = fenster.container, cr = c.getBoundingClientRect(), r = a.getBoundingClientRect();
    return { x: r.left - cr.left + c.scrollLeft, y: r.top - cr.top + c.scrollTop, w: r.width, h: r.height };
}

function lichtMalen(r) {
    if (!(r.w >= 0 && r.h >= 0 && isFinite(r.x) && isFinite(r.y))) return;
    licht.cur = r;
    var s = licht.el.style, k = licht.clip;
    s.left = r.x + 'px'; s.top = r.y + 'px'; s.width = r.w + 'px'; s.height = r.h + 'px';
    // beschnitten auf das Rechteck der Kachel (ohne Rundung) als festes Fenster im Raum: nur der Teil des Lichts darin zeigt sich
    s.clipPath = k
        ? 'xywh(' + (k.x - r.x) + 'px ' + (k.y - r.y) + 'px ' + k.w + 'px ' + k.h + 'px)'
        : '';
}

// Rundung der Kachelfläche (a::before), damit Licht und Beschnitt exakt wie die Kachel gerundet sind
function lichtRadius(a) {
    licht.radius = parseFloat(getComputedStyle(a, '::before').borderTopLeftRadius) || 0;
    licht.el.style.borderRadius = licht.radius + 'px';
}

// Der Strich-Cursor sitzt im Licht und gleitet mit: Lage relativ zum Licht = Zeiger relativ zur Zielkachel; Farbe der Section
function lichtStrich(li, mausX) {
    var sec = li.closest('section');
    licht.el.style.setProperty('--sc', sec ? sec.style.getPropertyValue('--c') : '');
    if (mausX == null) return;
    licht.strich.style.left = (mausX - li.querySelector('a').getBoundingClientRect().left) + 'px';
}

// Anteil der Kachel, den das Licht deckt
function lichtDeckung(r, k) {
    if (!r || !k || !k.w || !k.h) return 0;
    var w = Math.max(0, Math.min(r.x + r.w, k.x + k.w) - Math.max(r.x, k.x));
    var h = Math.max(0, Math.min(r.y + r.h, k.y + k.h) - Math.max(r.y, k.y));
    return (w * h) / (k.w * k.h);
}

// Die Schrift einer Kachel kehrt um (.da), solange das Licht sie zu mindestens 95 % deckt.
// Geprüft werden nur die Zielkachel, die verlassene und alle bisher umgekehrten: so bleibt keine hängen.
function lichtDa() {
    var kand = new Set(licht.da);
    if (licht.tile) kand.add(licht.tile);
    if (licht.alt) kand.add(licht.alt);
    kand.forEach(function (li) {
        var a = li.querySelector('a');
        var an = !!a && licht.modus !== 'aus' && lichtDeckung(licht.cur, lichtRahmen(a)) >= masz['licht-deckung'];
        li.classList.toggle('da', an);
        if (an) licht.da.add(li); else licht.da.delete(li);
    });
    if (licht.alt && !licht.da.has(licht.alt)) licht.alt = null;
    lichtZellen();
}

// Die Zelle unter dem Licht (und die verlassene) trägt die Section-Farbe sofort, ohne auf das Fenster zu warten.
// Zwei Flächen im Inhalt unter dem Licht; so liegen sie sicher hinter der hellen Kachelfläche.
function lichtZellen() {
    var liste = licht.zellen || [];
    var kand = licht.modus === 'aus' ? [] : [licht.tile, licht.alt].filter(Boolean);
    liste.forEach(function (z, i) {
        var li = kand[i], a = li && li.querySelector('a');
        if (!a) { z.style.display = 'none'; return; }
        var r = lichtRahmen(li), sec = li.closest('section');
        z.style.display = 'block';
        z.style.left = r.x + 'px'; z.style.top = r.y + 'px'; z.style.width = r.w + 'px'; z.style.height = r.h + 'px';
        z.style.backgroundColor = sec ? sec.style.getPropertyValue('--c') : '';
    });
}

function lichtSchritt(jetzt) {
    var t = Math.max(0, Math.min(1, (jetzt - licht.t0) / licht.dauer)), v = licht.von, n = licht.nach;
    var e = licht.linear ? t : Math.pow(t, masz['licht-potenz']);
    lichtMalen({ x: v.x + (n.x - v.x) * e, y: v.y + (n.y - v.y) * e, w: v.w + (n.w - v.w) * e, h: v.h + (n.h - v.h) * e });
    lichtDa();
    if (t < 1) { licht.raf = requestAnimationFrame(lichtSchritt); return; }
    licht.raf = 0;
    var ende = licht.ende;
    licht.ende = null;
    if (ende) ende();
}

function lichtLauf(von, nach, dauer, linear, ende) {
    cancelAnimationFrame(licht.raf);
    licht.von = von; licht.nach = nach; licht.dauer = dauer; licht.linear = linear; licht.ende = ende || null;
    licht.t0 = performance.now();
    licht.raf = requestAnimationFrame(lichtSchritt);
}

// Kante der Kachel, der der Zeiger am nächsten ist (ohne Zeiger: links)
function lichtKante(a, pos) {
    if (!pos) return 'l';
    var r = a.getBoundingClientRect();
    var d = { l: Math.abs(pos.x - r.left), r: Math.abs(r.right - pos.x), t: Math.abs(pos.y - r.top), b: Math.abs(r.bottom - pos.y) };
    var m = Math.min(d.l, d.r, d.t, d.b);
    return m === d.l ? 'l' : m === d.r ? 'r' : m === d.t ? 't' : 'b';
}

// die Kachel um ihre eigene Größe über die Kante hinaus verschoben: das Licht "draußen"
function lichtAussen(n, kante) {
    var o = { x: n.x, y: n.y, w: n.w, h: n.h };
    if (kante === 'l') o.x = n.x - n.w;
    else if (kante === 'r') o.x = n.x + n.w;
    else if (kante === 't') o.y = n.y - n.h;
    else o.y = n.y + n.h;
    return o;
}

// sofort weg, ohne Bewegung
function lichtHart() {
    cancelAnimationFrame(licht.raf); licht.raf = 0; licht.ende = null;
    licht.modus = 'aus'; licht.tile = null; licht.alt = null; licht.clip = null;
    licht.da.forEach(function (li) { li.classList.remove('da'); });
    licht.da.clear();
    lichtZellen();
    if (!licht.el) return;
    licht.el.style.opacity = '0';
    licht.el.style.clipPath = '';
    document.body.classList.remove('licht');
}

function lichtZu(li, mausX, mausY) {
    if (!licht.el || !fenster.container) return;
    var a = li && li.querySelector('a');
    if (!a || !lichtAktiv()) { lichtHart(); return; }
    if (li === licht.tile && licht.modus === 'ein') return;
    var nach = lichtRahmen(a);
    lichtRadius(a);
    lichtStrich(li, mausX);
    var vor = licht.tile;
    if (licht.modus === 'aus') {
        // aus dem Nichts: von außen über die Eintrittskante in die Kachel, beschnitten auf sie
        licht.modus = 'ein'; licht.tile = li; licht.alt = null; licht.clip = nach;
        licht.el.style.opacity = '1';
        document.body.classList.add('licht');
        var von = lichtAussen(nach, lichtKante(a, mausX == null ? null : { x: mausX, y: mausY }));
        lichtMalen(von);
        lichtZellen();
        lichtLauf(von, nach, masz['licht-rand-dauer'], true, function () { licht.clip = null; lichtMalen(licht.cur); });
        return;
    }
    // sichtbar (auf einer Kachel oder beim Verlassen): gleitet von hier zur neuen Kachel
    if (vor && vor !== li) licht.alt = vor;
    licht.modus = 'ein'; licht.tile = li; licht.clip = null;
    lichtZellen();
    lichtLauf(licht.cur, nach, masz['licht-dauer'], false, null);
}

// mit Zeigerposition: das Licht verlässt die Kachel über die Kante, über die der Zeiger ging (Gegenstück zum Eintritt)
function lichtAus(pos) {
    if (!licht.el || licht.modus !== 'ein') return;
    var li = licht.tile, a = li && li.querySelector('a');
    if (!a || !licht.cur || !lichtAktiv()) { lichtHart(); return; }
    var n = lichtRahmen(a);
    lichtRadius(a);
    licht.modus = 'raus'; licht.alt = li; licht.tile = null; licht.clip = n;
    lichtLauf(licht.cur, lichtAussen(n, lichtKante(a, pos)), masz['licht-rand-dauer'], true, lichtHart);
}

function lichtInit() {
    var c = document.getElementById('container');
    lichtHart();
    licht.el = document.createElement('div');
    licht.el.id = 'kachel-licht';
    licht.el.setAttribute('aria-hidden', 'true');
    c.insertBefore(licht.el, c.firstChild);
    licht.strich = document.createElement('div');
    licht.strich.className = 'licht-strich';
    licht.el.appendChild(licht.strich);
    licht.zellen = [0, 1].map(function () {
        var z = document.createElement('div');
        z.className = 'kachel-zelle';
        z.setAttribute('aria-hidden', 'true');
        c.insertBefore(z, licht.el);
        return z;
    });
    licht.cur = null;
}

document.addEventListener('mouseover', function (e) {
    if (document.body.classList.contains('tastatur')) return;
    var li = e.target.closest && e.target.closest('#container li');
    if (li) lichtZu(li, e.clientX, e.clientY); else lichtAus({ x: e.clientX, y: e.clientY });
});
document.documentElement.addEventListener('mouseleave', function (e) {
    lichtMaus = null;
    lichtAus({ x: e.clientX, y: e.clientY });
});

// Sicherung: das Licht folgt immer der Kachel unter dem Zeiger, auch wenn kein mouseover kam
// (Scrollen unter ruhendem Zeiger, Wechsel von Tastatur zu Maus, Layoutwechsel)
var lichtMaus = null, lichtPlanRaf = 0;
function lichtSync() {
    lichtPlanRaf = 0;
    if (!lichtMaus || document.body.classList.contains('tastatur')) return;
    var t = document.elementFromPoint(lichtMaus.x, lichtMaus.y);
    var li = t && t.closest && t.closest('#container li');
    if (li) lichtZu(li, lichtMaus.x, lichtMaus.y); else lichtAus(lichtMaus);
}
function lichtPlan() { if (!lichtPlanRaf) lichtPlanRaf = requestAnimationFrame(lichtSync); }
document.addEventListener('mousemove', function (e) {
    lichtMaus = { x: e.clientX, y: e.clientY };
    if (licht.modus === 'ein' && licht.tile) lichtStrich(licht.tile, e.clientX);
    lichtPlan();
}, { passive: true });
document.addEventListener('scroll', lichtPlan, true);
document.addEventListener('focusin', function (e) {
    if (!document.body.classList.contains('tastatur')) return;
    var li = e.target.closest && e.target.closest('#container li');
    if (li && e.target.matches(':focus-visible')) lichtZu(li); else lichtAus();
});
window.addEventListener('resize', function () {
    var a = licht.tile && licht.tile.querySelector('a');
    if (!a || licht.modus !== 'ein') return;
    cancelAnimationFrame(licht.raf); licht.raf = 0; licht.clip = null;
    lichtMalen(lichtRahmen(a));
    lichtDa();
});

// ── Strich-Zeiger ─────────────────────────────────────────────────
// Der senkrechte Strich ersetzt den Punkt: Höhe der Zeile unter dem Zeiger (Titel, Nav-Chip),
// in der Section außerhalb von Titel und Kachel deren Höhe mit 33 % Deckkraft. Auf Kacheln zeichnet ihn die Kachel selbst.
var strich = { el: null, secEl: null, x: 0, y: 0, ziel: null, raf: 0, an: false };

function strichZiel(t) {
    if (!t || !t.closest || document.body.classList.contains('edit-mode')) return null;
    var z = { sec: t.closest('#container section'), fest: null, hide: false };
    if (t.closest('li a')) { z.hide = true; z.sec = null; }   // Kachel: nur ihr eigener Strich
    else {
        // Kachelrand (kein Hintergrund erkennen) bzw. Nav-Chip: Strich in der Höhe der Zeile
        var el = t.closest('#container li') || t.closest('a.secname');
        if (el) { z.fest = el; z.sec = null; }
    }
    return z.sec || z.fest || z.hide ? z : null;
}

function strichSetzen() {
    strich.raf = 0;
    var s = strich.el, b = strich.secEl, z = strich.ziel;
    if (!z) {
        s.style.opacity = '0';
        if (b) b.style.opacity = '0';
        document.documentElement.classList.remove('strich-an');
        return;
    }
    document.documentElement.classList.add('strich-an');
    // in der Section (nicht auf Chip oder Kachel) zeigt das kleine Quadrat die Zeigerposition
    document.documentElement.classList.toggle('strich-punkt', !!z.sec);
    // Zeile unter dem Zeiger (Kachelrand, Nav-Chip): fester Strich in voller Deckkraft
    if (z.fest) {
        var r = z.fest.getBoundingClientRect();
        s.style.left = strich.x + 'px';
        s.style.top = r.top + 'px';
        s.style.height = r.height + 'px';
        s.style.opacity = '1';
    } else s.style.opacity = '0';
    // ganze Section (Hintergrund, Titel, hinter den Kacheln): im Inhalt, schwach, scrollt mit
    if (b) {
        if (z.sec) {
            var c = document.getElementById('container'), cr = c.getBoundingClientRect(), sr = z.sec.getBoundingClientRect();
            var oben = Math.max(sr.top, cr.top), unten = Math.min(sr.bottom, cr.bottom);
            b.style.left = (strich.x - cr.left + c.scrollLeft) + 'px';
            b.style.top = (oben - cr.top + c.scrollTop) + 'px';
            b.style.height = Math.max(0, unten - oben) + 'px';
            b.style.opacity = String(masz['strich-schwach']);
        } else b.style.opacity = '0';
    }
}

// Der Section-Strich liegt im Inhalt unter Kacheln und Licht (erstes Kind)
function strichSecInit() {
    var c = document.getElementById('container');
    strich.secEl = document.createElement('div');
    strich.secEl.id = 'strich-sec';
    strich.secEl.setAttribute('aria-hidden', 'true');
    c.insertBefore(strich.secEl, c.firstChild);
}

function strichPlanen(e) {
    if (e) { strich.x = e.clientX; strich.y = e.clientY; strich.ziel = strichZiel(e.target); }
    else strich.ziel = strichZiel(document.elementFromPoint(strich.x, strich.y));
    if (!strich.raf) strich.raf = requestAnimationFrame(strichSetzen);
}

(function () {
    if (!matchMedia('(hover: hover)').matches) return;
    strich.el = document.createElement('div');
    strich.el.id = 'strich';
    strich.el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(strich.el);
    document.addEventListener('mousemove', strichPlanen, { passive: true });
    document.addEventListener('mouseover', strichPlanen, { passive: true });
    document.documentElement.addEventListener('mouseleave', function () {
        strich.ziel = null;
        if (!strich.raf) strich.raf = requestAnimationFrame(strichSetzen);
    });
    document.addEventListener('scroll', function () { if (strich.ziel) strichPlanen(); }, true);
})();

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
            geistSprung(ziel);
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

// erste Kachel einer Section, bei Pfeil links (delta < 0) die letzte
function kachelAn(section, delta) {
    var k = section.querySelectorAll('li a');
    return k.length ? k[delta < 0 ? k.length - 1 : 0] : null;
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
            ziel = unter && kachelAn(unter, delta);
        }
    }
    if (i === -1 && !ziel) i = links.indexOf(document.activeElement);
    mausBewegt = false;
    if (ziel) {
        // Ausgangspunkt war die Section unter der Maus
    } else if (i === -1) {
        var sec = document.querySelector('#container section.aktuell') ||
            document.querySelector('#container section');
        // links: die letzte Kachel der Section, rechts: die erste
        ziel = kachelAn(sec, delta) || links[0];
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
    // Inhalt, Chips und Zahnrad der Leiste; das Dropdown behält seine Pfeiltasten
    if (t !== document.body && !(t.closest && t.closest('#container, .title a, .title button'))) return;
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

// ── Ausgangspunkt für die Pfeiltasten (linkBy): die Kachel unter der Maus ──
function setzeMausKachel(e) {
    var a = e.target.closest('li a');
    if (a) mausKachel = a;
}
document.getElementById('container').addEventListener('mouseover', setzeMausKachel);
document.getElementById('container').addEventListener('mousemove', setzeMausKachel);

// ── Einstellungen: Zahnrad in der Leiste, Overlay mit einem Knopf pro Einstellung ──
// Ein Icon pro Einstellung zeigt den aktuellen Wert; jeder Klick schaltet zum anderen von zwei Werten. API für Zoom/Farbschema steht im <head>.
// icon: Font-Awesome-Klasse oder Buchstabe (Zoom); zeigt den aktuellen Wert
var EINSTELLUNGEN = [
    {
        label: 'Zoom',
        werte: [['s', 'S'], ['m', 'M']],
        get: function () { return window.msmrZoom.get(); },
        icon: function (w) { return { text: w.toUpperCase() }; },
        set: function (w) { window.msmrZoom.set(w); }
    },
    {
        label: 'Farbschema',
        werte: [['auto', 'auto'], ['light', 'hell'], ['dark', 'dunkel']],
        schema: true,
        get: function () { return window.msmrTheme.auto() ? 'auto' : window.msmrTheme.get(); },
        set: function (w) { if (w === 'auto') window.msmrTheme.setAuto(); else window.msmrTheme.set(w); }
    },
    {
        label: 'Farbe',
        werte: [['bunt', 'bunt'], ['blass', 'blass']],
        text: { bunt: 'bunt', blass: 'blass' },
        // Kreis in einer Section-Farbe: kräftig = bunt, fast farblos (gleiche Helligkeit) = blass
        kreis: { bunt: '1', blass: 'var(--farbe-blass)' },
        get: function () { return getPref('farbe'); },
        set: function (w) { setPref('farbe', w); }
    },
    {
        label: 'Navigation',
        werte: [['short', 'Text'], ['icons', 'Icons']],
        // Text-Modus: das Wort „text“; Icon-Modus: Squircle wie bei APP
        text: { short: 'text', icons: 'icons' },
        squircle: true,
        get: function () { return getPref('navMode'); },
        set: function (w) { setPref('navMode', w); }
    },
    {
        label: 'Ansicht',
        werte: [['chips', 'Chips'], ['grid', 'Raster']],
        text: { chips: 'chips', grid: 'raster' },
        // vier Kacheln: gerundet und getrennt = Chips; eckig und aneinander = Raster
        kacheln: { chips: false, grid: true },
        get: function () { return getPref('view'); },
        set: function (w) { setPref('view', w); }
    },
    {
        label: 'Ausrichtung',
        // im Raster heißt „links“ volle Breite
        beschr: function (w) { return w === 'left' && getPref('view') === 'grid' ? 'volle Breite' : null; },
        werte: [['left', 'links'], ['center', 'Mitte']],
        text: { left: 'links', center: 'mitte' },
        icons: { left: 'fa-align-left', center: 'fa-align-center' },
        get: function () { return getPref('align'); },
        set: function (w) { setPref('align', w); }
    },
    {
        label: 'Bearbeiten',
        werte: [['aus', 'aus'], ['an', 'an']],
        text: { aus: 'edit', an: 'fertig' },
        // zwei Chevrons übereinander = aus; Diskette = es wird bearbeitet, Klick beendet und fragt nach dem Speichern
        icons: { aus: ['fa-chevron-up', 'fa-chevron-down'], an: 'fa-floppy-disk' },
        get: function () { return document.body.classList.contains('edit-mode') ? 'an' : 'aus'; },
        set: function (w) { if (w === 'an') enterEditMode(); else beendeBearbeiten(); },
        schliesst: true
    }
];

function wertName(e, w) {
    return (e.beschr && e.beschr(w)) ||
        e.werte.filter(function (p) { return p[0] === w; })[0][1];
}

function wertNach(e, w) {
    var i = 0;
    e.werte.forEach(function (p, k) { if (p[0] === w) i = k; });
    return e.werte[(i + 1) % e.werte.length][0];
}

// Farbschema: manuell groß hell/dunkel und klein „auto“; auto groß „auto“ und klein das Icon des Systemwerts.
// Text-Modus: Wörter; Icon-Modus: Sonne/Mond, „auto“ als Kreis (leer = aus, gefüllt = an)
function zeichneSchema(ic, w) {
    var icons = document.body.classList.contains('nav-icons');
    var sym = { light: 'fa-sun', dark: 'fa-moon' }, wort = { auto: 'auto', light: 'hell', dark: 'dunkel' };
    function glyph(klasse, extra) {
        var g = document.createElement('i');
        g.className = klasse + (extra ? ' ' + extra : '');
        return g;
    }
    function text(t, klasse) {
        var s = document.createElement('span');
        s.className = klasse;
        s.textContent = t;
        return s;
    }
    ic.className = 'set-icon set-schema';
    ic.textContent = '';
    if (w === 'auto') {
        ic.appendChild(icons ? glyph('fa-solid fa-circle') : text(wort.auto, 'set-letter set-text'));
        ic.appendChild(glyph('fa-solid ' + sym[window.msmrTheme.get()], 'set-ecke'));
    } else {
        ic.appendChild(icons ? glyph('fa-solid ' + sym[w]) : text(wort[w], 'set-letter set-text'));
        ic.appendChild(icons ? glyph('fa-regular fa-circle', 'set-ecke') : text(wort.auto, 'set-ecke'));
    }
}

// zeichnet das Icon für den Wert w
function zeichneIcon(ic, e, w) {
    if (e.icon) {
        var d = e.icon(w);
        ic.className = 'set-icon set-letter';
        ic.textContent = d.text;
    } else if (e.schema) {
        zeichneSchema(ic, w);
    } else if (e.text && !document.body.classList.contains('nav-icons')) {
        ic.className = 'set-icon set-letter set-text';
        ic.textContent = e.text[w];
    } else if (e.kreis) {
        ic.className = 'set-icon set-kreis';
        ic.textContent = '';
        ic.style.setProperty('--k', secFarbe(6, e.kreis[w]));
    } else if (e.squircle) {
        ic.className = 'set-icon icon-squircle';
        ic.textContent = '';
    } else if (e.kacheln) {
        ic.className = 'set-icon set-kacheln' + (e.kacheln[w] ? ' eckig' : '');
        ic.textContent = '';
        for (var k = 0; k < 4; k++) ic.appendChild(document.createElement('i'));
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
}

function settingsAnzeige() {
    document.querySelectorAll('#settings-pop .set-btn').forEach(function (b, i) {
        var e = EINSTELLUNGEN[i], w = e.get();
        zeichneIcon(b.querySelector('.set-icon'), e, w);
        b.title = e.label + ': ' + wertName(e, w);
        b.setAttribute('aria-label', b.title);
    });
}

// bündig unter dem Zahnrad, gleich breit; in der unteren Leiste (Telefon) bündig darüber
function settingsPlatzieren() {
    var pop = document.getElementById('settings-pop');
    var gz = document.getElementById('settings-btn');
    var r = gz.getBoundingClientRect();
    var oben = r.top > window.innerHeight / 2;
    // Im Raster läuft die Leiste über die ganze Breite und das Zahnrad streckt sich: die Breite bleibt die des Zahnrads,
    // die Knopfhöhe (und damit die Höhe des Overlays) aber dieselbe wie bei Chips; dafür mit der Leistenbreite der Chips messen
    var leiste = document.querySelector('.title'), breite = r.width;
    if (document.body.classList.contains('view-grid') && !document.body.classList.contains('align-center') && leiste) {
        leiste.style.maxWidth = 'calc(var(--spalte) + 0.12em)';
        breite = gz.getBoundingClientRect().width;
        leiste.style.maxWidth = '';
    }
    pop.style.width = r.width + 'px';   // bündig mit dem Zahnrad, auch wenn es sich im Raster streckt
    pop.style.setProperty('--set-hoehe', breite + 'px');   // Knopfhöhe wie bei Chips
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
            e.set(wertNach(e, e.get()));
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
    if (e.key === '+' || e.key === '=') window.msmrZoom.set('m');
    else if (e.key === '-' || e.key === '0') window.msmrZoom.set('s');
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
