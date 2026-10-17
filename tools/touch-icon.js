// Switches the iOS home screen icon in index.html between two variants:
//   node tools/touch-icon.js inline   embed favicon/ico-light-180.png as a data: URI (workaround for iOS 27.2, whose
//                                     Add to Home Screen sheet fails to load the icon from a network URL)
//   node tools/touch-icon.js url      the default: link the file by URL
// Run "inline" again after changing the icon file, so the embedded copy stays the same as the file.
// It also copies the icon to /apple-touch-icon.png and /apple-touch-icon-precomposed.png (asked for by other iOS versions and browsers).
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const ICON = 'favicon/ico-light-180.png';
const mode = process.argv[2];
if (mode !== 'inline' && mode !== 'url') {
    console.error('usage: node tools/touch-icon.js inline|url');
    process.exit(1);
}

const file = path.join(root, 'index.html');
const html = fs.readFileSync(file, 'utf8');
const LINK = /<link rel="apple-touch-icon" href="[^"]*">/;
if (!LINK.test(html)) {
    console.error('index.html: no <link rel="apple-touch-icon" href="…"> found');
    process.exit(1);
}
const png = fs.readFileSync(path.join(root, ICON));
const href = mode === 'inline' ? 'data:image/png;base64,' + png.toString('base64') : './' + ICON;
fs.writeFileSync(file, html.replace(LINK, '<link rel="apple-touch-icon" href="' + href + '">'));

for (const name of ['apple-touch-icon.png', 'apple-touch-icon-precomposed.png']) {
    fs.copyFileSync(path.join(root, ICON), path.join(root, name));
}
console.log('apple-touch-icon: ' + (mode === 'inline' ? 'inline data: URI (' + png.length + ' bytes)' : './' + ICON));
