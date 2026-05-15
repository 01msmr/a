// ── Render ────────────────────────────────────────────────────────
function render(data) {
    window._data = data;

    var nav = document.getElementById('section-nav-list');
    var sel = document.getElementById('section-jumper');
    nav.innerHTML = '';
    sel.innerHTML = '';

    data.forEach(function (sec) {
        var a = document.createElement('a');
        a.className = 'secname';
        a.href = '#' + sec.id;
        a.target = '_self';
        a.textContent = sec.title;
        nav.appendChild(a);

        var opt = document.createElement('option');
        opt.value = '#' + sec.id;
        opt.textContent = sec.title;
        sel.appendChild(opt);
    });

    sel.addEventListener('change', function () {
        var el = document.querySelector(sel.value);
        if (el) el.scrollIntoView();
    });

    var container = document.getElementById('container');
    container.innerHTML = '';
    data.forEach(function (sec) {
        var section = document.createElement('section');

        var h3 = document.createElement('h3');
        h3.id = sec.id;
        h3.className = 'name';
        h3.style.color = sec.color || 'cyan';
        h3.innerHTML = '<a href="#' + sec.id + '" target="_self">' + sec.title + '</a>';

        var ul = document.createElement('ul');
        ul.className = 'group';
        (sec.links || []).forEach(function (link) {
            ul.appendChild(makeLi(link.name, link.url));
        });

        section.appendChild(h3);
        section.appendChild(ul);
        container.appendChild(section);
    });
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

// ── Load ──────────────────────────────────────────────────────────
fetch('links.json?t=' + Date.now())
    .then(function (r) { return r.json(); })
    .then(render)
    .catch(function (e) {
        document.getElementById('container').innerHTML =
            '<p style="color:red;padding:20px">links.json Ladefehler: ' + e + '</p>';
    });

// ── Edit Bar ──────────────────────────────────────────────────────
var editBar = document.createElement('div');
editBar.id = 'edit-bar';
editBar.innerHTML = '<button id="btn-cancel">Abbrechen</button><button id="btn-save">Speichern</button>';
document.body.appendChild(editBar);

// Doppelklick auf Titel-Bereich → Edit Mode
document.querySelector('.title').addEventListener('dblclick', function (e) {
    if (e.target.closest('a') || e.target.tagName === 'SELECT') return;
    enterEditMode();
});

document.getElementById('btn-cancel').addEventListener('click', function () { location.reload(); });
document.getElementById('btn-save').addEventListener('click', save);

// ── Edit Mode ─────────────────────────────────────────────────────
function preventEnter(e) { if (e.key === 'Enter') e.preventDefault(); }

function enterEditMode() {
    document.body.classList.add('edit-mode');
    document.getElementById('edit-bar').classList.add('visible');

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

        var del = document.createElement('span');
        del.className = 'btn-del';
        del.textContent = '×';
        del.title = 'Löschen';
        del.addEventListener('click', function () { li.remove(); });
        li.appendChild(del);
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

    var del = document.createElement('span');
    del.className = 'btn-del';
    del.textContent = '×';
    del.addEventListener('click', function () { li.remove(); });

    li.appendChild(urlField);
    li.appendChild(del);
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
        ul.querySelectorAll('li:not(.btn-add)').forEach(function (li) {
            var a = li.querySelector('a');
            var urlField = li.querySelector('.edit-url');
            if (!a) return;
            var name = a.textContent.trim();
            var url = urlField ? urlField.textContent.trim() : a.getAttribute('href');
            if (name && url) links.push({ name: name, url: url });
        });

        if (links.length) data.push({
            id: h3.id,
            title: (h3.querySelector('a') || {}).textContent || h3.id,
            color: h3.style.color || 'cyan',
            links: links
        });
    });
    return data;
}

function save() {
    var json = JSON.stringify(collectData(), null, 2);
    fetch('save.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'X-Save-Token': 'CHANGE_ME'
        },
        body: json
    })
    .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        document.querySelector('.titledomain').textContent = '✓';
        setTimeout(function () { location.reload(); }, 800);
    })
    .catch(function (err) { alert('Fehler: ' + err.message); });
}