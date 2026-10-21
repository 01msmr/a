// Web app variant: https://a.msmr.co/?app is the address to add to the iOS home screen as a standalone web app (the normal address stays a bookmark)
// Defines globals: isAppMode, applyAppMode
// Uses: nothing; runs in the head right after <link rel="manifest"> (iOS reads the manifest and the meta tags at the moment of "Add to Home Screen")
function isAppMode(search) {
    return new URLSearchParams(search).has('app');
}

// In app mode: standalone manifest (its start address carries ?app again) and the iOS web app tags; otherwise nothing is touched
function applyAppMode(doc, on) {
    if (!on) return;
    var link = doc.querySelector('link[rel="manifest"]');
    if (!link) { link = doc.createElement('link'); link.rel = 'manifest'; doc.head.appendChild(link); }
    link.setAttribute('href', './favicon/manifest-app.json');
    [['apple-mobile-web-app-capable', 'yes'], ['apple-mobile-web-app-title', 'a.']].forEach(function (m) {
        if (doc.querySelector('meta[name="' + m[0] + '"]')) return;
        var meta = doc.createElement('meta');
        meta.name = m[0]; meta.content = m[1];
        doc.head.appendChild(meta);
    });
}

applyAppMode(document, isAppMode(location.search));
