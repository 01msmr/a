# Section-Icons, Edit-Mode-Einstieg und Ansichts-Einstellungen

Datum: 2026-07-25

## Ziel

Drei Erweiterungen der Startseite `a.msmr.co`:

1. Der Edit-Mode wird über das Section-Dropdown erreichbar (bisher nur per Doppelklick auf die Titelzeile).
2. Jede Section bekommt ein Font-Awesome-Icon. Die Navigationsleiste zeigt wahlweise Icons oder die 3-Letter-Kürzel.
3. Die Seite lässt sich linksbündig oder zentriert darstellen.

Die beiden Ansichts-Optionen werden in einem Einstellungs-Bereich am Seitenanfang geschaltet, der nur im Edit-Mode sichtbar ist.

## Icon-Zuordnung

Font Awesome 6 Free, Solid-Style. Die Zuordnung ist Bestandteil der Daten, nicht der Ansicht.

| id | Kürzel | Inhalt | FA-Klasse |
|----|--------|--------|-----------|
| sec1 | srv | Server, self-hosted Dienste, Admin-Panels | `fa-server` |
| sec2 | tec | Tech-News | `fa-microchip` |
| sec3 | riid | Zeitungen und Magazine | `fa-newspaper` |
| sec4 | tbx.li | Toolbox-Unterseiten | `fa-toolbox` |
| sec5 | wrk | Arbeit, Firmendienste | `fa-briefcase` |
| sec6 | mee | Social, Banking, private Mail | `fa-user` |
| sec7 | see | TV und Streaming | `fa-tv` |
| sec8 | hiir | Radiostreams | `fa-radio` |
| sec9 | bsy | eigene Projekte | `fa-lightbulb` |
| sec10 | dis | Foren und Communities | `fa-comments` |
| sec11 | art | Kunst | `fa-palette` |
| sec12 | eat | Restaurants und Lieferdienste | `fa-utensils` |
| sec13 | shp | Shops und Preisvergleich | `fa-cart-shopping` |
| sec14 | pol | Politik und Verbände | `fa-landmark` |
| sec15 | mdf | Markdorf | `fa-location-dot` |

## Datenmodell

`links.json` bleibt ein Array von Sections. Neu ist pro Section das Feld `icon`:

```json
{
  "id": "sec1",
  "title": "srv",
  "icon": "fa-server",
  "color": "cyan",
  "links": [ { "url": "...", "name": "..." } ]
}
```

`save.php` bleibt unverändert — es schreibt den Request-Body unbesehen.

**Kritisch:** `collectData()` liest den DOM zurück in JSON. Ohne Anpassung würde der erste Speichern-Klick alle `icon`-Felder löschen. Das `<h3>` trägt deshalb `data-icon`, und `collectData()` schreibt das Feld mit.

## Einstellungen

Zwei Ansichts-Einstellungen, gespeichert in `localStorage`:

| Schlüssel | Werte | Default |
|-----------|-------|---------|
| `a.navMode` | `short` \| `icons` | `short` |
| `a.align` | `left` \| `center` | `left` |

Bewusst nicht in `links.json`: Es sind Geräte-Präferenzen. Sie wirken sofort, brauchen kein `save.php` und kein Token, und erlauben am Handy eine andere Wahl als am Desktop.

Folge daraus: Eine Einstellung bleibt auch bestehen, wenn der Edit-Mode mit **Abbrechen** verlassen wird. Abbrechen verwirft nur Link-Änderungen. Das ist beabsichtigt.

Umgesetzt wird das über zwei Klassen an `<body>`: `nav-icons` und `align-center`. Die Zuweisung erfolgt vor dem Laden von `links.json`, damit die Seite nicht mit falschem Layout aufblitzt.

## Darstellung

**Navigationsleiste (`.secname`):** Jeder Chip enthält beide Varianten im Markup — `<i class="fa-solid fa-…">` und `<span class="secshort">srv</span>`. Sichtbar ist je nach `body.nav-icons` genau eine. Umschalten braucht damit kein Re-Rendern. Das `title`-Attribut trägt in beiden Modi den Section-Namen.

**Section-Header (`h3.name`):** zeigt **immer** Icon und Titel, unabhängig vom Modus.

**Dropdown (`#section-jumper`):** bleibt unverändert Text. Native `<option>`-Elemente stellen Icon-Fonts nicht zuverlässig dar.

**Ausrichtung:** Der Modus `left` ist der unveränderte Bestand — es kommt keine Regel hinzu. `align-center` rückt Titelzeile, Section-Titel und Kacheln in eine mittige Spalte von 1250 px. Es wird kein `text-align` angefasst: Sämtliche Texte bleiben linksbündig, zentriert wird nur die Spalte als Ganzes.

Zentriert wird dabei **der Inhalt, nicht die Container-Box**: `#container` behält seine volle Breite, weil er mit `overflow-x: hidden` alles Breitere abschneidet — eine durchgehende Trennlinie wäre sonst gekappt. Die Spalte entsteht über `margin-inline: auto` an `.group` und `.settings-row` sowie ein symmetrisches Polster an `.name`:

```css
body.align-center .name {
    padding-left:  max(0.2em, (100% - 1250px) / 2);
    padding-right: max(0px,   (100% - 1250px) / 2);
}
```

**Trennlinien:** Die Linie unter jedem Section-Titel ist das `border-bottom` von `.name` und läuft in **beiden** Modi über die volle Seitenbreite. Nur ihr Text rückt in die Spalte.

Damit Polster und Rahmen die Spaltenbreite nicht überschreiten, tragen `.title`, `.name` und `.settings-row` `box-sizing: border-box` — ohne das ragte die Kopfzeile um Polster plus Rahmen über den Inhalt hinaus.

**Titelzeile:** wird zur umbrechenden Flex-Zeile (`display: flex; flex-wrap: wrap`). Das Dropdown sitzt damit hinter den Section-Chips, solange die Breite reicht, und rutscht bei Platzmangel eine Zeile tiefer. Die Chip-Leiste schrumpft dabei über ihr bestehendes `overflow: hidden`, das Dropdown bleibt immer erreichbar. Die Mobile-Leiste behält ihr `flex-wrap: nowrap` und damit das horizontale Scrollen.

Das horizontale Polster der Leiste entspricht ihrem Eckenradius (1 em). Die Chips sind randlose Rechtecke über die volle Höhe; ohne dieses Polster ragt ein Chip-Hintergrund an den Enden über die Rundung hinaus — sichtbar besonders beim invertierten aktiven Chip.

**Aktive Section:** Die oberste sichtbare Section wird dreifach angezeigt — ihr Chip und ihr Section-Header tauschen Vorder- und Hintergrundfarbe (`--sect-col` als Fläche, `--front-body` für Text **und** Icon), und das Dropdown wird auf sie gesetzt, wo das native ✓ sie markiert. Der Trennstrich unter dem Header entfällt dabei, die Fläche trennt bereits. Ermittelt wird sie beim Scrollen des Containers: die letzte Section, deren Oberkante die Containerkante passiert hat.

**Hover:** Chip und Section-Header bekommen die Passiv-Farbe `--text-col` als Fläche, die Schrift bleibt unverändert — keine Umkehr. Beide Regeln tragen `:not(.active)`, damit der Aktiv-Zustand beim Überfahren erhalten bleibt und die Reihenfolge im File keine Rolle spielt. Am Chip muss die Schriftfarbe explizit auf `--sect-col` zurückgesetzt werden, weil `li a:hover, a.secname:hover` aus dem Bestand sonst auf `--text-hov` (weiß) schaltet.

Zwei Spezifitäts-Fallen dabei: `section:hover .name` ist (0,2,1) und sticht ein einfaches `.name:hover` (0,2,0) — die Regeln brauchen deshalb `section` davor. Und ein Kind kann den Rahmen seines Elternteils nie übermalen; der helle 1-px-Spalt zwischen Titelleiste und angedocktem Header lässt sich nur lösen, indem die Leiste ihren unteren Rahmen mitfärbt (`body.docked`, gesetzt wenn der aktive Header bündig unter der Leiste steht).

Nachgezogen wird **0,15 s nach der letzten Scroll-Bewegung** (Timer, der bei jedem Scroll-Event neu gesetzt wird). Beim Durchscrollen soll die Hervorhebung nicht durch die Chips wandern.

Im **geschlossenen** Dropdown erscheint bewusst kein ✓. Ein natives `<select>` rendert dort ausschließlich den Text der gewählten Option; das Zeichen ließe sich nur in den Options-Text schreiben — mit doppeltem Häkchen im geöffneten Menü und Textumbau bei jedem Scrollen. Das wäre ein Hack und unterbleibt.

## Löschen von Links

Ein Klick auf `×` entfernt den Eintrag nicht, sondern markiert ihn (`li.removed`): durchgestrichen, abgeblendet, und das `×` wird zum `↺`. Ein weiterer Klick nimmt das zurück. Endgültig verschwindet der Eintrag erst beim Speichern, weil `collectData()` über `li:not(.btn-add):not(.removed)` sammelt.

Damit ist Löschen bis zum Speichern umkehrbar, ohne blockierenden Dialog, und vor dem Speichern ist sichtbar, was wegfällt. Das `×` ist 22 px groß mit 2 px Polster, 3 px Radius und rotem Hintergrund beim Hover.

## Edit-Mode-Einstieg

Das Dropdown erhält `edit` als **ersten** Eintrag, ohne Trenner. Beim Laden ist der Eintrag damit zwar vorausgewählt, löst aber nichts aus: `change` feuert nur bei echter Benutzerauswahl, und `syncActive()` setzt das Select beim Rendern sofort auf die sichtbare Section.

Bei Auswahl startet der Edit-Mode, danach fällt die Auswahl auf die aktive Section zurück — das Dropdown bleibt durchgehend Anzeige des aktuellen Orts. Der Edit-Mode hängt an einer Body-Klasse und bleibt davon unberührt. Der bestehende Doppelklick auf die Titelzeile bleibt als zweiter Weg erhalten.

**`autocomplete="off"` am Select ist zwingend.** Chrome stellt sonst beim Reload die zuletzt gewählte Option wieder her und löst dabei erneut den Edit-Mode aus. Da Abbrechen und Speichern beide `location.reload()` aufrufen, käme der Edit-Mode andernfalls direkt nach dem Verlassen zurück.

## Einstellungs-Panel

Ein `div.settings-panel` als erstes Kind von `#container`, per CSS nur in `body.edit-mode` sichtbar.

```
⚙ EINSTELLUNGEN
───────────────────────────────────────
 Navigation mit Icons   (•  )
 Seite linksbündig      (  •)
                    [ Abbrechen ] [ Speichern ]
```

Beide Einstellungen sind iOS-artige Ein/Aus-Schalter: eine `checkbox` mit `opacity: 0` über einer gestylten Spur, Zustand per `input:checked + .switch-track`. Farben kommen aus den bestehenden CSS-Variablen und tragen damit Hell- und Dunkelmodus.

Die Zeilen teilen sich die Spaltenbreite mit `.group`. Ihr linkes Polster von `0.36em` bringt Labels und Buttons auf die Kante des **Linktextes**, nicht auf die seiner Hintergrundfläche — die Anker haben selbst noch `padding-left`. Damit `em` dieselbe Basis hat wie bei `.group`, trägt die Zeile keine eigene `font-size`; die sitzt an den Kindern.

Abbrechen und Speichern stehen linksbündig in derselben Spalte.

Abbrechen und Speichern sitzen ausschließlich hier. Die frühere fixierte Leiste unten rechts (`#edit-bar`) entfällt ersatzlos.

**Scrollverhalten:** `#container` scrollt mit `scroll-snap-type: y mandatory`. Blendet man das Panel darüber ein, rastet der Container auf sein bisheriges Snap-Ziel zurück und schiebt die Einstellungen aus dem Bild — auch gegen ein nachgelagertes `scrollIntoView`. Im Edit-Mode wird Snapping deshalb abgeschaltet (`body.edit-mode #container { scroll-snap-type: none }`); beim Bearbeiten ist freies Scrollen ohnehin das gewünschte Verhalten. Das Anscrollen des Panels erfolgt einen Frame nach dem Einblenden.

## Font Awesome

Einbindung per CDN in `index.html`, analog zur schon vorhandenen Google-Fonts-Einbindung:

```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" />
```

Nur das CSS wird eingebunden; die Woff2-Dateien lädt Font Awesome selbst nach.

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `links.json` | `icon`-Feld für alle 15 Sections |
| `index.html` | Font-Awesome-CDN-Link |
| `app.js` | Icon-Rendering, Dropdown-Eintrag, Panel, Prefs, aktive Section, `collectData()` |
| `styles.css` | Icon-Umschaltung, Spaltenausrichtung, Panel-Styles, Kopfzeilen-Polster |

## Aufgeräumt

Bei der Gelegenheit entfernte CSS-Regeln, die in `app.js` und `index.html` nirgends vorkommen — Reste früherer Fassungen: `.secnum`, `.bottomspace`, `.gear-btn`, `.navprev`/`.navnext` (4 Blöcke), die Tabellenstruktur `.group .links .row .cell` (5 Blöcke) sowie `.paired-section`/`.full-page-section`. Dazu der negative Versatz `left: -0.2em` an `.home-link`, der das Logo in die Ecke zog.

## Abgrenzung

Nicht Teil dieser Arbeit:

- Icon-Auswahl über die Oberfläche. Die Zuordnung steht in `links.json` und wird dort geändert.
- Bearbeiten von Section-Titeln, -Farben oder -Reihenfolge.
- Sichtbarkeit auf dem iPhone im Hochformat: Die Navigationsleiste ist dort per CSS ausgeblendet, der Icon-Modus wirkt entsprechend nicht. Die Ausrichtung wirkt überall.
