// Every js/*.js says in its second line which globals it defines ("// Defines globals: a, b"); this checks that the line is true, in both directions.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { globalsByFile, root } = require('./page-env.js')();

for (const file of Object.keys(globalsByFile).filter(f => f.startsWith('js/'))) {
    test('header of ' + file + ': "Defines globals" lists exactly the globals the file defines', () => {
        const head = fs.readFileSync(path.join(root, file), 'utf8').split('\n').slice(0, 3);
        const line = head.find(l => l.startsWith('// Defines globals:'));
        assert.ok(line, 'no "// Defines globals:" line in the first three lines');
        const listed = line.replace('// Defines globals:', '').split(',').map(s => s.trim()).filter(Boolean).sort();
        const real = globalsByFile[file].slice().sort();
        assert.deepEqual(real, listed, 'defined but not listed: ' + real.filter(n => !listed.includes(n)) + ' | listed but not defined: ' + listed.filter(n => !real.includes(n)));
    });
}
