// Switches the iOS home screen icon between two variants (the icons live in favicon/touch-icon-inline.js, the fallback link in index.html):
//   node tools/touch-icon.js inline   embed favicon/icon-0..7.png as data: URIs (workaround for iOS 27.2, whose
//                                     Add to Home Screen sheet fails to load the icon from a network URL)
//   node tools/touch-icon.js url      the default: link the file by URL
// Run "inline" again after changing the icon files, so the embedded copy stays the same as the file.
// The ICONS line in favicon/touch-icon-inline.js carries the variant; the link in index.html always stays a URL.
// It also copies the icon to /apple-touch-icon.png and /apple-touch-icon-precomposed.png (asked for by other iOS versions and browsers).
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const ICON = 'favicon/icon-0.png';   // the fallback link and the copies at the root
const COLORED = [0, 1, 2, 3, 4, 5, 6, 7].map(n => 'favicon/icon-' + n + '.png');   // the script picks one at random
const mode = process.argv[2];
if (mode !== 'inline' && mode !== 'url') {
    console.error('usage: node tools/touch-icon.js inline|url');
    process.exit(1);
}

const file = path.join(root, 'index.html');
const html = fs.readFileSync(file, 'utf8');
const LINK = /<link rel="apple-touch-icon" href="[^"]*">/;
const ICON_LINE = /const ICONS = \[[^\]]*\];/;
if (!LINK.test(html)) {
    console.error('index.html: no <link rel="apple-touch-icon" href="…"> found');
    process.exit(1);
}
const href = function (icon) {
    return mode === 'inline' ? 'data:image/png;base64,' + fs.readFileSync(path.join(root, icon)).toString('base64') : './' + icon;
};
fs.writeFileSync(file, html.replace(LINK, '<link rel="apple-touch-icon" href="./' + ICON + '">'));
// the script that sets the icon carries the embedded copy
const scriptFile = path.join(root, 'favicon/touch-icon-inline.js');
const script = fs.readFileSync(scriptFile, 'utf8');
if (!ICON_LINE.test(script)) {
    console.error('favicon/touch-icon-inline.js: no ICON line found');
    process.exit(1);
}
fs.writeFileSync(scriptFile, script.replace(ICON_LINE, 'const ICONS = [' + COLORED.map(href).map(h => "'" + h + "'").join(', ') + '];'));
const png = fs.readFileSync(path.join(root, ICON));

for (const name of ['apple-touch-icon.png', 'apple-touch-icon-precomposed.png']) {
    fs.copyFileSync(path.join(root, ICON), path.join(root, name));
}
console.log('apple-touch-icon: ' + (mode === 'inline' ? 'inline data: URI (' + png.length + ' bytes)' : './' + ICON));
