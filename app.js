// ── Ansichts-Einstellungen ────────────────────────────────────────
var PREF_DEFAULTS = { navMode: 'short', align: 'left' };

function getPref(name) {
    try { return localStorage.getItem('a.' + name) || PREF_DEFAULTS[name]; }
    catch (e) { return PREF_DEFAULTS[name]; }
}

var prefsGeaendert = false;

function setPref(name, value) {
    try { localStorage.setItem('a.' + name, value); } catch (e) { }
    prefsGeaendert = true;
    applyPrefs();
}

function applyPrefs() {
    document.body.classList.toggle('nav-icons', getPref('navMode') === 'icons');
    document.body.classList.toggle('align-center', getPref('align') === 'center');
    document.querySelectorAll('.pref-toggle').forEach(function (input) {
        input.checked = getPref(input.dataset.pref) === input.dataset.on;
    });
}

applyPrefs();

// ── Render ────────────────────────────────────────────────────────
var EDIT_OPTION = '__edit';
var syncActive = function () { };

function makeIcon(icon) {
    var i = document.createElement('i');
    i.className = 'fa-solid ' + (icon || 'fa-hashtag') + ' secicon';
    i.setAttribute('aria-hidden', 'true');
    return i;
}

function render(data) {
    var nav = document.getElementById('section-nav-list');
    var sel = document.getElementById('section-jumper');
    nav.innerHTML = '';
    sel.innerHTML = '';

    // an erster Stelle; löst beim Laden nichts aus (change nur bei Auswahl)
    var editOpt = document.createElement('option');
    editOpt.value = EDIT_OPTION;
    editOpt.textContent = 'edit';
    sel.appendChild(editOpt);

    data.forEach(function (sec) {
        var a = document.createElement('a');
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

        var opt = document.createElement('option');
        opt.value = '#' + sec.id;
        opt.textContent = sec.title;
        sel.appendChild(opt);
    });

    sel.addEventListener('change', function () {
        if (sel.value === EDIT_OPTION) {
            enterEditMode();
            syncActive();
            return;
        }
        var el = document.querySelector(sel.value);
        if (el) el.scrollIntoView();
        // iOS gibt den Fokus nach dem Schließen der Auswahlliste an das select zurück
        sel.blur();
        focusContent(el && el.closest('section'));
    });

    var container = document.getElementById('container');
    container.tabIndex = -1;
    container.addEventListener('keydown', function (e) {
        // im Edit-Mode gehören die Pfeiltasten dem Textcursor
        if (document.body.classList.contains('edit-mode')) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); jumpBy(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); jumpBy(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); linkBy(1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); linkBy(-1); }
    });
    container.innerHTML = '';
    container.appendChild(buildSettingsPanel());

    data.forEach(function (sec) {
        var section = document.createElement('section');
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

        var ul = document.createElement('ul');
        ul.className = 'group';
        (sec.links || []).forEach(function (link, i) {
            var li = makeLi(link.name, link.url, link.tot);
            li.dataset.name0 = link.name;   // Ursprungswerte für den Vergleich
            li.dataset.url0 = link.url;
            li.dataset.pos0 = i;
            ul.appendChild(li);
        });

        section.appendChild(h3);
        section.appendChild(ul);
        container.appendChild(section);
    });

    applyPrefs();
    trackActiveSection();
    raster();
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
        chips.forEach(function (chip) {
            chip.classList.toggle('active', chip.hash === active);
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
    if (base === null) {
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

function linkBy(delta) {
    var links = Array.prototype.slice.call(document.querySelectorAll('#container li a'));
    if (!links.length) return;
    var i = -1;
    if (mausBewegt && mausKachel && mausKachel.isConnected) i = links.indexOf(mausKachel);
    if (i === -1) i = links.indexOf(document.activeElement);
    mausBewegt = false;
    var ziel;
    if (i === -1) {
        var sec = document.querySelector('#container section.aktuell') ||
            document.querySelector('#container section');
        ziel = sec.querySelector('li a') || links[0];
    } else {
        ziel = links[Math.max(0, Math.min(links.length - 1, i + delta))];
    }
    ziel.focus();
}

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

// ── Einstellungs-Panel (nur im Edit Mode sichtbar) ─────────────────
function switchRow(pref, on, off, label) {
    return '<div class="settings-row">' +
        '<span class="settings-label">' + label + '</span>' +
        '<label class="switch">' +
        '<input type="checkbox" class="pref-toggle" data-pref="' + pref +
        '" data-on="' + on + '" data-off="' + off + '">' +
        '<span class="switch-track"></span>' +
        '</label>' +
        '</div>';
}

function buildSettingsPanel() {
    var panel = document.createElement('div');
    panel.className = 'settings-panel';
    panel.innerHTML =
        '<h3 class="name"><i class="fa-solid fa-gear secicon" aria-hidden="true"></i>Einstellungen</h3>' +
        switchRow('navMode', 'icons', 'short', 'Navigation mit Icons') +
        switchRow('align', 'left', 'center', 'Seite linksbündig') +
        '<div class="settings-row settings-actions">' +
        '<button class="settings-cancel">Abbrechen</button>' +
        '<button class="settings-save">Speichern</button>' +
        '</div>';

    panel.querySelectorAll('.pref-toggle').forEach(function (input) {
        input.addEventListener('change', function () {
            setPref(input.dataset.pref, input.checked ? input.dataset.on : input.dataset.off);
        });
    });
    panel.querySelector('.settings-cancel').addEventListener('click', cancelEdit);
    panel.querySelector('.settings-save').addEventListener('click', save);
    return panel;
}

// ── Gezeichneter Strich-Cursor in der Kachel (Position für li a::after) ──
document.getElementById('container').addEventListener('mousemove', function (e) {
    var a = e.target.closest('li a');
    if (!a) return;
    mausKachel = a;   // Ausgangspunkt für die Pfeiltasten (linkBy)
    var r = a.getBoundingClientRect();
    a.style.setProperty('--cx', (e.clientX - r.left) + 'px');
});

// ── Maus oder Tastatur: nur das zuletzt benutzte Gerät hebt eine Kachel hervor ──
document.addEventListener('keydown', function (e) {
    if (e.key === 'Tab' || e.key.indexOf('Arrow') === 0) document.body.classList.add('tastatur');
});
document.addEventListener('mousemove', function () {
    document.body.classList.remove('tastatur');
    mausBewegt = true;
});

// ── Load ──────────────────────────────────────────────────────────
fetch('links.php?t=' + Date.now())
    .then(function (r) { return r.json(); })
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

function cancelEdit() { location.reload(); }

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

        // erst im nächsten Frame, sonst rastert scroll-snap zurück
        var panel = document.querySelector('.settings-panel');
        if (panel) requestAnimationFrame(function () { panel.scrollIntoView(); });

        linksFreigeben();
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

// ein Klick ohne Zug muss die Kachel wieder festsetzen
document.addEventListener('mouseup', function () {
    if (vorbereitet) {
        vorbereitet.draggable = false;
        vorbereitet.classList.remove('gepackt');
        vorbereitet = null;
    }
});

// außerhalb der eigenen Liste: Linie weg, Kachel kehrt an den Start zurück
// und zeigt den Abbruch — was man sieht, ist immer das Ergebnis des Loslassens
document.addEventListener('dragover', function (e) {
    if (!gezogen) return;
    var drin = gezogen.parentNode.contains(e.target);
    gezogen.classList.toggle('abbruch', !drin);
    if (!drin && gezogen.nextSibling !== startPlatz) {
        gezogen.parentNode.insertBefore(gezogen, startPlatz);
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
        // erst nach dem Schnappschuss des Zugbilds, sonst trägt auch das
        // mitfliegende Bild das Ziel-Highlight
        setTimeout(function () { if (gezogen === li) li.classList.add('dragging'); });
        e.dataTransfer.effectAllowed = 'move';
        // Firefox startet ohne gesetzte Daten gar keinen Zug
        e.dataTransfer.setData('text/plain', '');
    });
    li.addEventListener('dragend', function () {
        // Loslassen im Aus, ohne dass der Abbruch-Handler noch feuerte
        if (li.classList.contains('abbruch') && li.nextSibling !== startPlatz) {
            li.parentNode.insertBefore(li, startPlatz);
        }
        li.classList.remove('dragging', 'abbruch', 'gepackt');
        li.draggable = false;
        gezogen = null;
        vorbereitet = null;
        startPlatz = null;
    });
    return griff;
}

function sortierbar(ul) {
    if (ul.dataset.sortierbar) return;
    ul.dataset.sortierbar = '1';

    ul.addEventListener('dragover', function (e) {
        // nur die eigene Section nimmt an
        if (!gezogen || gezogen.parentNode !== ul) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        // Ziel ist die ganze Kachel unterm Zeiger, keine Lückenrechnerei:
        // sie gibt ihren Platz her, die Zugrichtung entscheidet die Seite.
        // Über Lücken (auch der eigenen Kachel) bleibt die Vorschau stehen.
        var ziel = e.target.closest ? e.target.closest('li') : null;
        if (!ziel || ziel === gezogen || ziel.parentNode !== ul) return;
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
        var letzte = -1, umgestellt = false;
        ul.querySelectorAll('li:not(.btn-add):not(.removed)').forEach(function (li) {
            if (li.dataset.pos0 === undefined) return;   // neu, hat keine Ausgangsposition
            var pos = +li.dataset.pos0;
            if (pos < letzte) umgestellt = true;
            letzte = pos;
        });
        var titel = section.querySelector('h3.name a');
        if (umgestellt) verschoben.push('· ' + (titel ? titel.textContent : ''));
    });

    return { geloescht: geloescht, geaendert: geaendert, verschoben: verschoben, neu: neu };
}

function bestaetigen() {
    var d = aenderungen();

    if (!d.geaendert.length && !d.geloescht.length && !d.verschoben.length) {
        // nichts zu überschreiben — neue Einträge und Einstellungen zählen mit
        if (!d.neu && !prefsGeaendert) {
            alert('Keine Änderungen — nichts zu speichern.');
            return false;
        }
        return true;
    }

    var text = 'Änderungen übernehmen?\n';
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
    return confirm(text);
}

function save() {
    if (!bestaetigen()) return;
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
