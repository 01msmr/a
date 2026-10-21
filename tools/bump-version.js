// Raises the cache version (?v=2026-10-21l) on every file of index.html and styles.css with one value: node tools/bump-version.js [value]
// Without a value: the same day gets the next letter (…l -> …m), a new day starts as the date alone. tools/smoke.js fails on mixed values.
const fs = require('fs');
const path = require('path');

const VERSION = /\?v=([0-9]{4}-[0-9]{2}-[0-9]{2}[a-z]*)/g;

// letters: '' -> b, b -> c, z -> aa, aa -> ab
function nextLetters(s) {
    if (!s) return 'b';
    const a = s.split('');
    for (let i = a.length - 1; i >= 0; i--) {
        if (a[i] !== 'z') { a[i] = String.fromCharCode(a[i].charCodeAt(0) + 1); return a.join(''); }
        a[i] = 'a';
    }
    return 'a' + a.join('');
}

function nextVersion(current, today) {
    const date = current.slice(0, 10), letters = current.slice(10);
    if (today > date) return today;
    return date + nextLetters(letters);   // the same day, or a clock that went back: keep the later date
}

function currentVersion(html) {
    const found = [...new Set([...html.matchAll(VERSION)].map(m => m[1]))];
    if (!found.length) throw new Error('index.html has no ?v= value');
    if (found.length > 1) throw new Error('index.html has more than one ?v= value: ' + found.join(', '));
    return found[0];
}

// sets every ?v= of the page to `to`
function bump(html, to) {
    const from = currentVersion(html);
    let count = 0;
    return { html: html.replace(VERSION, () => (count++, '?v=' + to)), from, to, count };
}

module.exports = { nextVersion, currentVersion, bump };

if (require.main === module) {
    const files = ['index.html', 'styles.css'].map(f => path.join(__dirname, '..', f));   // styles.css @imports the other sheets with the same version
    const arg = process.argv[2];
    const today = new Date().toISOString().slice(0, 10);
    const texts = files.map(f => fs.readFileSync(f, 'utf8'));
    const to = arg || nextVersion(currentVersion(texts.join('\n')), today);
    files.forEach((f, i) => {
        const r = bump(texts[i], to);
        fs.writeFileSync(f, r.html);
        console.log(`${path.basename(f)}: ${r.count} x ?v= ${r.from} -> ${r.to}`);
    });
}
