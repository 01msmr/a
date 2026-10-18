// Owns: never-dead addresses, link list items, mouse tile
// Defines globals: isNeverDead, makeLi, setMouseTile
// Uses: state
// Addresses that never count as unreachable (even if the data marks them): centrally in never-dead.json
// (allIpAddresses: every IP address; hosts: host names). edit/check.php reads the same file.

function isNeverDead(url) {
    var h;
    try { h = new URL(url).hostname; } catch (e) { return false; }
    if (neverDead.allIpAddresses && (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.charAt(0) === '[')) return true;
    return neverDead.hosts.indexOf(h.toLowerCase()) >= 0;
}

function makeLi(name, url, dead) {
    var li = document.createElement('li');
    if (dead && !isNeverDead(url)) li.classList.add('dead');   // unreachable at the last test
    var a = document.createElement('a');
    a.tabIndex = 0;
    a.href = url;
    a.textContent = name;
    li.appendChild(a);
    return li;
}

// ── Starting point for the arrow keys (linkBy): the tile under the mouse ──
function setMouseTile(e) {
    var a = e.target.closest('li a');
    if (a) mouseTile = a;
}
document.getElementById('container').addEventListener('mouseover', setMouseTile);
document.getElementById('container').addEventListener('mousemove', setMouseTile);

