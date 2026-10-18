# Plan: migrating `js/` to ES modules (later, optional)

Status: not started. Written 2026-10-18 after `app.js` was split into classic scripts (`js/*.js`, see `CLAUDE.md`).

## Why not now

The 14 files share 38 top-level `var` names (below) and about 150 functions as globals, and register their event listeners while loading. A direct conversion would turn that coupling into circular imports or one large shared object. Touch, glide and glow behavior is tuned on iOS and only the jsdom smoke test guards it. So the split came first; modules come file by file, only if the benefit (explicit dependencies, editor and type-checker support, importing one unit in a test) is worth it.

## Order

1. Leaves with few readers: `links`, `prefs` (after moving the shared state out, see below), `edit`.
2. Middle: `render`, `settings`, `grid`, `navigation`, `active-section`, `boot`.
3. Last, the coupled cluster: `touch`, `glow`, `ghost-header`, `light`, `cursor`. Convert together or behind one `state` module.

## Per file

1. Add `type="module"` to its tag; module scripts are deferred and strict, so check for implicit globals, `this` at top level and load-order assumptions.
2. `export` what other files use (see the `Uses:` header lines and the table); `import` what it uses.
3. Anything still read through `window.` or a bare global from an unconverted file gets a temporary `window.x = x` line; remove when the reader converts.
4. Replace shared mutable globals by exports of an object (`export const lock = {…}`), never by reassigned `export let`.
5. Run `node tools/smoke.js` (update it to evaluate modules, e.g. via dynamic `import()` in jsdom or a small loader), then check on iPhone and desktop. Ship each file alone.

## Moves to do first

- `glow` is defined in `touch.js` but belongs to `glow.js`; `syncActive`, `lock`, `jumperValue`, `selJump` sit in `prefs.js` as shared state. Give them an owner (a small `state.js`) before converting their readers.
- `mouseTile`/`mouseMoved`/`mousePoint` live in `navigation.js` but are set from `links.js`; decide the owner.

## Open decision: cache busting

Classic tags carry `?v=`. Imports inside modules do not, so old and new files could mix. Options: an import map with versioned URLs (still no build), or a small hash step. Decide when the first module ships.

## Done when

Each step passes `node tools/smoke.js` and the manual iOS/desktop check, and `CLAUDE.md` names the module order and the cache-busting rule.

## Shared top-level `var`s today

Readers are textual matches in other files (comments excluded); verify when migrating.

| Name | Defined in | Read in |
|---|---|---|
| `PREF_DEFAULTS` | `prefs` | (only own file) |
| `syncActive` | `prefs` | `render`, `active-section`, `touch` |
| `lock` | `prefs` | `active-section`, `touch`, `glow`, `light`, `cursor` |
| `jumperValue` | `prefs` | `render`, `active-section` |
| `selJump` | `prefs` | `render`, `active-section` |
| `SEC_COLORS` | `render` | (only own file) |
| `stillRaf` | `active-section` | (only own file) |
| `measures` | `touch` | `glow`, `ghost-header`, `light`, `cursor` |
| `glow` | `touch` | `glow`, `ghost-header`, `light`, `grid`, `navigation` |
| `PHONE_QUERY` | `touch` | (only own file) |
| `pointerKind` | `touch` | (only own file) |
| `tapStart` | `touch` | (only own file) |
| `touchTap` | `touch` | (only own file) |
| `pendingTap` | `touch` | (only own file) |
| `swiping` | `touch` | `active-section`, `glow` |
| `fingerDown` | `touch` | (only own file) |
| `tailLast` | `touch` | (only own file) |
| `tailAnim` | `touch` | (only own file) |
| `ghostHeader` | `ghost-header` | (only own file) |
| `light` | `light` | `active-section`, `touch`, `settings` |
| `lightMouse` | `light` | `touch` |
| `lightPlanRaf` | `light` | (only own file) |
| `cursor` | `cursor` | `touch`, `light`, `settings` |
| `gridBase` | `grid` | (only own file) |
| `gridTimer` | `grid` | (only own file) |
| `jumpTarget` | `navigation` | `active-section` |
| `mouseTile` | `navigation` | `links` |
| `mouseMoved` | `navigation` | `settings` |
| `mousePoint` | `navigation` | `render`, `touch`, `settings` |
| `neverDead` | `links` | `boot` |
| `neverDeadReq` | `boot` | (only own file) |
| `linksReq` | `boot` | (only own file) |
| `SETTINGS` | `settings` | (only own file) |
| `dragged` | `edit` | (only own file) |
| `prepared` | `edit` | (only own file) |
| `startPlace` | `edit` | (only own file) |
| `startList` | `edit` | (only own file) |
| `draggedSection` | `edit` | (only own file) |
