// Shared by tools/smoke.js and tools/unit.test.js: loads index.html and its scripts into jsdom, with the browser features jsdom lacks stubbed.
// Returns { w, d, errors, rawHtml, root }: w is the window with every script evaluated, in the order of the <script> tags in index.html.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..') + path.sep;

module.exports = function loadPage() {
    const { JSDOM, VirtualConsole } = require('jsdom');
    const errors = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', e => errors.push(e.message));
    vc.on('error', (...a) => errors.push(a.join(' ')));

    const rawHtml = fs.readFileSync(root + 'index.html', 'utf8');
    const scripts = [...rawHtml.matchAll(/<script src="((?:js|favicon)\/[^"?]+\.js)[^>]*><\/script>/g)].map(m => m[1]);   // load order = order in index.html
    if (!scripts.length) throw new Error('no js/ scripts found in index.html');
    const html = rawHtml.replace(/<script src="(?:js|favicon)\/[^>]*><\/script>/g, '');
    const dom = new JSDOM(html, {
        url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
        beforeParse(w) {
            w.matchMedia = q => ({ matches: /hover: hover|pointer: fine/.test(q), addEventListener() { }, addListener() { } });
            w.ResizeObserver = class { observe() { } disconnect() { } };
            w.CSS = { supports: () => true };
            w.document.elementFromPoint = () => null;   // jsdom has no layout
            w.Element.prototype.scrollIntoView = function () { };   // likewise
            w.HTMLElement.prototype.showPopover = function () { };
            w.HTMLElement.prototype.hidePopover = function () { };
            w.fetchLog = [];
            w.fetch = async u => (w.fetchLog.push(String(u)), /links/.test(u))
                ? { ok: true, status: 200, json: async () => JSON.parse(fs.readFileSync(root + 'links.default.json', 'utf8')) }
                : { ok: true, status: 405, json: async () => ({}) };
        }
    });
    const w = dom.window;
    scripts.forEach(f => w.eval(fs.readFileSync(root + f, 'utf8')));
    return { w, d: w.document, errors, rawHtml, root };
};
