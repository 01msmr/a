# Section icons, edit mode entry and view settings

> **Status 2026-10-17:** This is the original draft of 25 July 2026 and stays as a record. The
> implementation has since deviated from it: Edit mode only starts via the gear (the double click on the
> title bar is gone). The settings live in an overlay at the gear, not in an area only in
> edit mode, and there are more of them (Zoom, Theme with auto, Color, Navigation, View, Align, Edit). The section dropdown
> is a button with its own list. Authoritative are the [README](../../../README.md) and the [CHANGELOG](../../../CHANGELOG.md).

Date: 2026-07-25

## Goal

Three extensions of the start page `a.msmr.co`:

1. Edit mode becomes reachable via the section dropdown (before, only by double click on the title bar).
2. Every section gets a Font Awesome icon. The navigation bar shows either icons or the 3-letter abbreviations.
3. The page can be shown left-aligned or centered.

The two view options are switched in a settings area at the top of the page that is only visible in edit mode.

## Icon assignment

Font Awesome 6 Free, Solid style. The assignment is part of the data, not of the view.

| id | Abbreviation | Content | FA class |
|----|--------------|---------|----------|
| sec1 | srv | Servers, self-hosted services, admin panels | `fa-server` |
| sec2 | tec | Tech news | `fa-microchip` |
| sec3 | riid | Newspapers and magazines | `fa-newspaper` |
| sec4 | tbx.li | Toolbox subpages | `fa-toolbox` |
| sec5 | wrk | Work, company services | `fa-briefcase` |
| sec6 | mee | Social, banking, private mail | `fa-user` |
| sec7 | see | TV and streaming | `fa-tv` |
| sec8 | hiir | Radio streams | `fa-radio` |
| sec9 | bsy | own projects | `fa-lightbulb` |
| sec10 | dis | Forums and communities | `fa-comments` |
| sec11 | art | Art | `fa-palette` |
| sec12 | eat | Restaurants and delivery services | `fa-utensils` |
| sec13 | shp | Shops and price comparison | `fa-cart-shopping` |
| sec14 | pol | Politics and associations | `fa-landmark` |
| sec15 | mdf | Markdorf | `fa-location-dot` |

## Data model

`links.json` stays an array of sections. New per section is the field `icon`:

```json
{
  "id": "sec1",
  "title": "srv",
  "icon": "fa-server",
  "color": "cyan",
  "links": [ { "url": "...", "name": "..." } ]
}
```

`save.php` stays unchanged — it writes the request body as is.

**Critical:** `collectData()` reads the DOM back into JSON. Without an adjustment the first save click would delete all `icon` fields. The `<h3>` therefore carries `data-icon`, and `collectData()` writes the field along.

## Settings

Two view settings, stored in `localStorage`:

| Key | Values | Default |
|-----|--------|---------|
| `a.navMode` | `short` \| `icons` | `short` |
| `a.align` | `left` \| `center` | `left` |

Deliberately not in `links.json`: they are device preferences. They take effect immediately, need no `save.php` and no token, and allow a different choice on the phone than on the desktop.

Consequence: A setting also persists when edit mode is left with **Cancel**. Cancel only discards link changes. That is intended.

It is implemented via two classes on `<body>`: `nav-icons` and `align-center`. The assignment happens before `links.json` is loaded, so the page does not flash with the wrong layout.

## Presentation

**Navigation bar (`.secname`):** Every chip contains both variants in the markup — `<i class="fa-solid fa-…">` and `<span class="secshort">srv</span>`. Depending on `body.nav-icons` exactly one is visible. Switching thus needs no re-rendering. The `title` attribute carries the section name in both modes.

**Section header (`h3.name`):** **always** shows icon and title, independent of the mode.

**Dropdown (`#section-jumper`):** stays text, unchanged. Native `<option>` elements do not show icon fonts reliably.

**Alignment:** The mode `left` is the unchanged existing state — no rule is added. `align-center` moves title bar, section titles and tiles into a centered column of 1250 px. No `text-align` is touched: all texts stay left-aligned, only the column as a whole is centered.

What is centered is **the content, not the container box**: `#container` keeps its full width, because with `overflow-x: hidden` it cuts off anything wider — a continuous divider line would otherwise be clipped. The column is created via `margin-inline: auto` on `.group` and `.settings-row` as well as symmetric padding on `.name`:

```css
body.align-center .name {
    padding-left:  max(0.2em, (100% - 1250px) / 2);
    padding-right: max(0px,   (100% - 1250px) / 2);
}
```

**Divider lines:** The line under each section title is the `border-bottom` of `.name` and runs across the full page width in **both** modes. Only its text moves into the column.

So that padding and border do not exceed the column width, `.title`, `.name` and `.settings-row` carry `box-sizing: border-box` — without that the header row stuck out beyond the content by padding plus border.

**Title bar:** becomes a wrapping flex row (`display: flex; flex-wrap: wrap`). The dropdown thus sits behind the section chips as long as the width suffices, and drops one row down when space is short. The chip bar shrinks via its existing `overflow: hidden`, the dropdown always stays reachable. The mobile bar keeps its `flex-wrap: nowrap` and thus the horizontal scrolling.

The horizontal padding of the bar equals its corner radius (1 em). The chips are borderless rectangles over the full height; without this padding a chip background sticks out beyond the rounding at the ends — visible especially with the inverted active chip.

**Active section:** The topmost visible section is shown in three ways — its chip and its section header swap foreground and background color (`--sect-col` as the area, `--front-body` for text **and** icon), and the dropdown is set to it, where the native ✓ marks it. The divider under the header is dropped, the area already separates. It is determined while the container scrolls: the last section whose top edge has passed the container edge.

**Hover:** Chip and section header get the passive color `--text-col` as the area, the text stays unchanged — no inversion. Both rules carry `:not(.active)`, so the active state is kept when hovering over it and the order in the file does not matter. On the chip the text color has to be reset explicitly to `--sect-col`, because `li a:hover, a.secname:hover` from the existing code would otherwise switch to `--text-hov` (white).

Two specificity traps here: `section:hover .name` is (0,2,1) and beats a simple `.name:hover` (0,2,0) — the rules therefore need `section` in front. And a child can never paint over the border of its parent; the light 1 px gap between title bar and docked header can only be solved by having the bar color its bottom border too (`body.docked`, set when the active header sits flush under the bar).

It is caught up **0.15 s after the last scroll movement** (a timer that is reset on every scroll event). When scrolling through, the highlight should not wander through the chips.

In the **closed** dropdown deliberately no ✓ appears. A native `<select>` renders only the text of the selected option there; the character could only be written into the option text — with a double check mark in the open menu and a text rebuild on every scroll. That would be a hack and is left out.

## Deleting links

A click on `×` does not remove the entry but marks it (`li.removed`): struck through, dimmed, and the `×` becomes `↺`. Another click undoes it. The entry only disappears for good on saving, because `collectData()` collects via `li:not(.btn-add):not(.removed)`.

So deleting is undoable until saving, without a blocking dialog, and before saving it is visible what drops out. The `×` is 22 px large with 2 px padding, 3 px radius and a red background on hover.

## Edit mode entry

The dropdown gets `edit` as the **first** entry, without a separator. On load the entry is thus preselected but triggers nothing: `change` only fires on a real user selection, and `syncActive()` sets the select to the visible section immediately on rendering.

On selection edit mode starts, afterwards the selection falls back to the active section — the dropdown stays a display of the current place throughout. Edit mode hangs on a body class and is untouched by this. The existing double click on the title bar remains as a second way.

**`autocomplete="off"` on the select is mandatory.** Otherwise Chrome restores the last selected option on reload and triggers edit mode again. Since Cancel and Save both call `location.reload()`, edit mode would otherwise come back right after leaving it.

## Settings panel

A `div.settings-panel` as the first child of `#container`, visible via CSS only in `body.edit-mode`.

```
⚙ SETTINGS
───────────────────────────────────────
 Navigation with icons  (•  )
 Page left-aligned      (  •)
                    [ Cancel ] [ Save ]
```

Both settings are iOS-style on/off switches: a `checkbox` with `opacity: 0` above a styled track, state via `input:checked + .switch-track`. Colors come from the existing CSS variables and thus carry light and dark mode.

The rows share the column width with `.group`. Their left padding of `0.36em` brings labels and buttons onto the edge of the **link text**, not of its background area — the anchors themselves still have `padding-left`. So that `em` has the same basis as for `.group`, the row carries no `font-size` of its own; that sits on the children.

Cancel and Save are left-aligned in the same column.

Cancel and Save sit exclusively here. The former fixed bar at the bottom right (`#edit-bar`) is dropped without replacement.

**Scroll behavior:** `#container` scrolls with `scroll-snap-type: y mandatory`. If the panel is faded in above it, the container snaps back to its previous snap target and pushes the settings out of view — even against a later `scrollIntoView`. In edit mode snapping is therefore switched off (`body.edit-mode #container { scroll-snap-type: none }`); free scrolling is the wanted behavior while editing anyway. Scrolling to the panel happens one frame after fading in.

## Font Awesome

Included via CDN in `index.html`, analogous to the already existing Google Fonts inclusion:

```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" />
```

Only the CSS is included; Font Awesome loads the woff2 files itself.

## Affected files

| File | Change |
|------|--------|
| `links.json` | `icon` field for all 15 sections |
| `index.html` | Font Awesome CDN link |
| `app.js` | Icon rendering, dropdown entry, panel, prefs, active section, `collectData()` |
| `styles.css` | Icon switching, column alignment, panel styles, header-row padding |

## Cleaned up

On this occasion CSS rules were removed that occur nowhere in `app.js` and `index.html` — leftovers of earlier versions: `.secnum`, `.bottomspace`, `.gear-btn`, `.navprev`/`.navnext` (4 blocks), the table structure `.group .links .row .cell` (5 blocks) as well as `.paired-section`/`.full-page-section`. Plus the negative offset `left: -0.2em` on `.home-link`, which pulled the logo into the corner.

## Scope limits

Not part of this work:

- Icon selection via the interface. The assignment is in `links.json` and is changed there.
- Editing section titles, colors or order.
- Visibility on the iPhone in portrait: the navigation bar is hidden there via CSS, icon mode accordingly has no effect. The alignment works everywhere.
