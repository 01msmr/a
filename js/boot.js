// Owns: adding the APP section, loading never-dead.json and links.php (started in the head), starting the page
// Defines globals: withApp, neverDeadReq, linksReq
// Uses: render, links
// APP belongs as the 3rd section in the row; if it is missing in the saved data, it is added empty
function withApp(data) {
    var app = data.filter(function (s) { return s.id === 'app'; })[0];
    if (!app) {
        data.splice(2, 0, { id: 'app', title: 'app', icon: 'icon-squircle', links: [] });
    } else if (app.title === 'APP') {
        app.title = 'app';   // lowercase like the others; CSS makes the capitals
    }
    if (app && app.icon === 'fa-mobile-screen') {
        app.icon = 'icon-squircle';   // replace previously saved phone icon
    }
    return data;
}

// ── Load ──────────────────────────────────────────────────────────
// Exceptions first (if the file is missing, only the defaults apply), then the links; both requests start in the head of index.html
var neverDeadReq = window.msmrNeverDead || fetch('never-dead.json');
var linksReq = window.msmrLinks || fetch('links.php?t=' + Date.now());
neverDeadReq
    .then(function (r) { return r.json(); })
    .then(function (d) {
        if (typeof d.allIpAddresses === 'boolean') neverDead.allIpAddresses = d.allIpAddresses;
        if (Array.isArray(d.hosts)) neverDead.hosts = d.hosts.map(function (x) { return String(x).toLowerCase(); });
    })
    .catch(function () { })
    .then(function () { return linksReq; })
    .then(function (r) { return r.json(); })
    .then(withApp)
    .then(render)
    .catch(function (e) {
        document.getElementById('container').innerHTML =
            '<p style="color:red;padding:20px">links.json load error: ' + e + '</p>';
    });

