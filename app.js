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
    });

    var container = document.getElementById('container');
    container.innerHTML = '';
    container.appendChild(buildSettingsPanel());

    data.forEach(function (sec) {
        var section = document.createElement('section');

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
        (sec.links || []).forEach(function (link) {
            ul.appendChild(makeLi(link.name, link.url));
        });

        section.appendChild(h3);
        section.appendChild(ul);
        container.appendChild(section);
    });

    applyPrefs();
    trackActiveSection();
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
            h3.classList.toggle('active', '#' + h3.id === active);
        });
        // angedockter Header → Rahmen der Leiste mitfärben, kein heller Spalt
        document.body.classList.toggle('docked',
            !!aktiv && aktiv.getBoundingClientRect().top - top <= 1);
        sel.value = active;
    };

    // erst nach Scroll-Ruhe nachziehen
    container.addEventListener('scroll', function () {
        clearTimeout(timer);
        timer = setTimeout(syncActive, 75);
    });
    syncActive();
}

function makeLi(name, url) {
    var li = document.createElement('li');
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

function enterEditMode() {
    document.body.classList.add('edit-mode');

    // erst im nächsten Frame, sonst rastert scroll-snap zurück
    var panel = document.querySelector('.settings-panel');
    if (panel) requestAnimationFrame(function () { panel.scrollIntoView(); });

    document.querySelectorAll('ul.group li:not(.btn-add)').forEach(function (li) {
        var a = li.querySelector('a');
        if (!a || li.querySelector('.edit-url')) return;

        a.contentEditable = 'true';
        a.addEventListener('keydown', preventEnter);

        var urlField = document.createElement('span');
        urlField.className = 'edit-url';
        urlField.contentEditable = 'true';
        urlField.textContent = a.getAttribute('href');
        urlField.addEventListener('keydown', preventEnter);
        li.appendChild(urlField);

        li.appendChild(makeDelButton(li));
    });

    document.querySelectorAll('ul.group').forEach(function (ul) {
        if (ul.querySelector('.btn-add')) return;
        var add = document.createElement('li');
        add.className = 'btn-add';
        add.textContent = '+';
        add.title = 'Link hinzufügen';
        add.addEventListener('click', function () { addLink(ul, add); });
        ul.appendChild(add);
    });
}

function addLink(ul, addBtn) {
    var li = makeLi('Neuer Link', 'https://');
    var a = li.querySelector('a');
    a.contentEditable = 'true';
    a.addEventListener('keydown', preventEnter);

    var urlField = document.createElement('span');
    urlField.className = 'edit-url';
    urlField.contentEditable = 'true';
    urlField.textContent = 'https://';
    urlField.addEventListener('keydown', preventEnter);

    li.appendChild(urlField);
    li.appendChild(makeDelButton(li));
    ul.insertBefore(li, addBtn);
    a.focus();
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
            if (name && url) links.push({ name: name, url: url });
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
