// Owns: edit mode, drag and sort, change detection, saving
// Defines globals: preventEnter, makeDelButton, canSave, enterEditMode, releaseLinks, createFields, addLink, makeDraggable, prepared, startPlace, startList, makeMoveHandle, sortable, draggedSection, sectionsSortable, collectData, changes, changesText, finishEditing, save
// Uses: state, grid, links, settings
// ── Edit Mode ─────────────────────────────────────────────────────

function preventEnter(e) { if (e.key === 'Enter') e.preventDefault(); }

// Deleting can be undone until saving
function makeDelButton(li) {
    var del = document.createElement('span');
    del.className = 'btn-del';
    del.textContent = '×';
    setHint(del, 'Delete');
    del.addEventListener('click', function () {
        var removed = li.classList.toggle('removed');
        del.textContent = removed ? '↺' : '×';
        setHint(del, removed ? 'Restore' : 'Delete');
    });
    return del;
}

// save.php answers GET with 405 without touching anything; 401 comes from the server in front
function canSave() {
    return fetch('edit/save.php')
        .then(function (r) { return r.status !== 401; })
        .catch(function () { return false; });   // when in doubt release nothing
}

// Without sign-in (401 from the server) nothing happens — edit mode stays closed
function enterEditMode() {
    canSave().then(function (may) {
        if (!may) return;
        document.body.classList.add('edit-mode');
        gridInit();   // release set grid heights, otherwise they beat the edit rules
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
        setHint(add, 'Add link');
        add.addEventListener('click', function () { addLink(ul, add); });
        ul.appendChild(add);
    });
}

// make name and URL editable, attach handle and delete button
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

// ── Sorting ───────────────────────────────────────────────────────

// Dragging needs a mouse; with a finger the handle would be ineffective
function makeDraggable() { return matchMedia('(pointer: fine)').matches; }

var prepared = null;  // tile whose handle is pressed
var startPlace = null;   // neighbor at the start of the drag, for the return on abort
var startList = null;   // list at the start of the drag: a tile may move into any section

// a click without a drag must fix the tile in place again
document.addEventListener('mouseup', function () {
    if (prepared) {
        prepared.draggable = false;
        prepared.classList.remove('grabbed');
        prepared = null;
    }
});

// outside any list: the tile returns to the start and shows the abort —
// what you see is always the result of the release
document.addEventListener('dragover', function (e) {
    if (!dragged) return;
    var inside = !!(e.target.closest && e.target.closest('ul.group'));
    dragged.classList.toggle('cancel', !inside);
    if (!inside && (dragged.parentNode !== startList || dragged.nextSibling !== startPlace)) {
        startList.insertBefore(dragged, startPlace);
    }
});

// set draggable only on the handle, otherwise every text selection drags the tile along
function makeMoveHandle(li) {
    var handle = document.createElement('span');
    handle.className = 'btn-move';
    handle.textContent = '⠿';
    setHint(handle, 'Move');
    handle.addEventListener('mousedown', function () {
        li.draggable = true;
        // now, because the drag image is a snapshot of the tile
        // at the start of the drag — only then would the background not be on it
        li.classList.add('grabbed');
        prepared = li;
    });

    li.addEventListener('dragstart', function (e) {
        dragged = li;
        startPlace = li.nextSibling;
        startList = li.parentNode;
        // only after the snapshot of the drag image, otherwise the flying
        // image carries the target highlight too
        setTimeout(function () { if (dragged === li) li.classList.add('dragging'); });
        e.dataTransfer.effectAllowed = 'move';
        // Firefox does not start a drag at all without data set
        e.dataTransfer.setData('text/plain', '');
    });
    li.addEventListener('dragend', function () {
        // release off target, without the abort handler firing any more
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

        // The target is the whole tile under the pointer, no gap arithmetic:
        // it gives up its place, the drag direction decides the side.
        // Over gaps (also the own tile) the preview stays.
        var dest = e.target.closest ? e.target.closest('li') : null;
        if (!dest || dest === dragged || dest.parentNode !== ul) return;   // gaps: preview stays
        var before = dest.classList.contains('btn-add') ? dest
            // target lies before the dragged tile → before it, otherwise after it
            : (dest.compareDocumentPosition(dragged) & Node.DOCUMENT_POSITION_FOLLOWING)
                ? dest : dest.nextSibling;
        if (before !== dragged && before !== dragged.nextSibling) ul.insertBefore(dragged, before);
    });

    // the tile is already at the target; preventDefault only keeps the browser
    // from putting the drag text into the contentEditable underneath
    ul.addEventListener('drop', function (e) { e.preventDefault(); });
}

// Re-sort sections among each other (as in the view: vertically): handle on the heading, dragging over another section
// moves the dragged one before or after it, depending on the half of the pointer. The order in the DOM is saved (collectData).
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
        setHint(handle, 'Move section');
        h3.insertBefore(handle, h3.firstChild);
        // only with the handle the section becomes draggable, otherwise every click in the content would drag it along
        handle.addEventListener('mousedown', function () { sec.draggable = true; });
        sec.addEventListener('dragstart', function (e) {
            if (e.target !== sec) return;   // tile drags only rise here
            draggedSection = sec;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', '');   // Firefox does not start a drag otherwise
            e.dataTransfer.setDragImage(h3, 16, 16);   // only the heading flies along, not the whole section
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
            // write the dead mark along; a changed URL clears it
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

// Comparison against the original values stamped during rendering
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

    // Reordered means: the starting positions no longer rise
    document.querySelectorAll('#container section').forEach(function (section) {
        var ul = section.querySelector('ul.group');
        if (!ul) return;
        var secId = (section.querySelector('h3.name') || {}).id;
        var last = -1, reordered = false;
        ul.querySelectorAll('li:not(.btn-add):not(.removed)').forEach(function (li) {
            if (li.dataset.pos0 === undefined) return;   // new, has no starting position
            if (li.dataset.sec0 !== secId) reordered = true;   // dragged over from another section
            var pos = +li.dataset.pos0;
            if (pos < last) reordered = true;
            last = pos;
        });
        var heading = section.querySelector('h3.name a');
        if (reordered) moved.push('· ' + (heading ? heading.textContent : ''));
    });

    // Order of the sections themselves: the starting positions no longer rise
    var lastSec = -1, secReordered = false;
    document.querySelectorAll('#container section').forEach(function (section) {
        if (section.dataset.pos0 === undefined) return;
        if (+section.dataset.pos0 < lastSec) secReordered = true;
        lastSec = +section.dataset.pos0;
    });
    if (secReordered) moved.push('· Order of sections');

    return { deleted: deleted, modified: modified, moved: moved, fresh: fresh };
}

// Text of the changes for the confirmation; empty if there is nothing to save
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

// Finish editing: nothing changed → simply close; otherwise ask whether to save,
// on "No" whether to discard; on another "No" edit mode stays open
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
