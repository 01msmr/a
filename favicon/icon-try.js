// TEMPORARY: test icons for the iOS home screen, to find out what iOS recolors in dark mode; remove with favicon/try/ once the icon is chosen
// Defines globals: iconTestVariant, applyIconTest
// Uses: nothing; runs in the head after favicon/app-mode.js. https://a.msmr.co/?icon=N (bookmark) or /?app&icon=N (web app), N = 1..8, see the README
function iconTestVariant(search) {
    var n = parseInt(new URLSearchParams(search).get('icon'), 10);
    return n >= 1 && n <= 8 ? n : null;
}

// The touch icon and the manifest (standalone or not) of variant n; without a variant nothing is touched
function applyIconTest(doc, n, app) {
    if (!n) return;
    var touch = doc.querySelector('link[rel="apple-touch-icon"]'), man = doc.querySelector('link[rel="manifest"]');
    if (touch) touch.setAttribute('href', './favicon/try/ico-' + n + '-180.png');
    if (man) man.setAttribute('href', './favicon/try/manifest-' + n + (app ? '-app' : '') + '.json');
}

applyIconTest(document, iconTestVariant(location.search), new URLSearchParams(location.search).has('app'));
