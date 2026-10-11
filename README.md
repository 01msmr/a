# a.msmr.co

Persönliche Startseite: Links in Sections, als Kacheln. Statisches HTML, CSS und
Vanilla-JS, dazu zwei kleine PHP-Skripte für die Daten. Kein Framework, kein Build.

Gebaut für Maus und Tastatur am Desktop, iPad und iPhone und für den Browser am TV.

## Aufbau

| Datei | Aufgabe |
|---|---|
| `index.html` | Gerüst: Leiste mit Nav-Chips, Zahnrad, Automatik-Kreis und Sections-Dropdown, Inhalt, Overlay. Im `<head>` stehen die Skripte für Zoom und Farbschema (laufen vor dem ersten Paint) |
| `app.js` | Rendern, Navigation, Einstellungen, Edit-Mode |
| `styles.css` | alles Aussehen; Farbschemata, Zoom und Raster hängen an Variablen und Klassen |
| `links.php` | liefert `edit/links.json` aus (öffentlich) |
| `edit/save.php` | schreibt die Daten (Basic-Auth) |
| `links.default.json` | Saat, nur beim allerersten Aufruf |
| `tools/dev-router.php` | Demo-Server mit `no-store`, nur lokal |
| `favicon/` | Icons und Manifest |
| `docs/` | Server, Schreibschutz, Deploy; Entwurf zu Icons und Einstellungen |
| `CHANGELOG.md` | was wann und warum geändert wurde |

Die Daten liegen in `edit/links.json` auf dem Server und **nicht im Repo**
(`.gitignore`). Ein Push ändert sie also nie. Details: [docs/htaccess-setup.md](docs/htaccess-setup.md).

## Lokal ansehen

```
php -S 0.0.0.0:8080 tools/dev-router.php
```

Dann `http://localhost:8080/`. Der Router hängt eine Versionsnummer an CSS und JS,
damit der Browser nie eine alte Kopie zeigt.

## Daten

`edit/links.json` ist ein Array von Sections:

```json
[
  { "id": "sec1", "title": "srv", "icon": "fa-server", "color": "cyan",
    "links": [ { "name": "pass.msmr.co", "url": "https://pass.msmr.co", "tot": true } ] }
]
```

- `icon` ist eine Font-Awesome-Klasse (6.7.2, CDN) oder `icon-squircle`, ein eigenes Icon.
- `tot` markiert einen beim letzten Test nicht erreichbaren Link (roter Punkt bzw. Quadrat).
- `color` wird nicht angezeigt. Die Sektionsfarbe kommt aus der Palette `SEC_COLORS`
  in `app.js` **nach Position**. Ein Einfügen oder Verschieben von Sections ändert also
  die Farben der folgenden.
- Die Section `app` (`id: "app"`) gehört fest als 3. Section in die Reihe. Fehlt sie in
  den gespeicherten Daten, setzt `mitApp()` sie leer ein; sie steht erst nach dem
  nächsten Speichern in der Datei.

## Bedienung

### Maus

- Section unter der Maus, ihr Titel und ihr Nav-Chip leuchten gemeinsam. Die ganze
  Section füllt sich in der Sektionsfarbe, die Kachel unter dem Cursor kehrt um
  (Fläche weiß, Text in der Sektionsfarbe). Der Strich-Cursor wird in der Kachel gezeichnet.
- Der Nav-Chip folgt der Section unter der Maus, sonst der obersten sichtbaren.

### Tastatur

- Pfeil hoch / runter: vorige / nächste Section. Pfeil links / rechts: Kachel zu Kachel,
  über Section-Grenzen. Nach einem Section-Wechsel geht links auf die letzte Kachel.
- Nach einer Mausbewegung starten die Pfeile an der Section oder Kachel unter der Maus.
- Tab läuft durch die Kacheln. Die Pfeile gelten auch mit Fokus auf Nav-Chips und Zahnrad,
  nicht im Dropdown und nicht im Edit-Mode.
- Es zählt immer nur die zuletzt benutzte Eingabe (Maus **oder** Tastatur), die andere
  wird für die Hervorhebung ignoriert.
- `+` / `-` ändern den Zoom, `0` setzt ihn auf S. Strg/Cmd bleiben dem Browser-Zoom.

### Einstellungen (Zahnrad in der Leiste)

Das Zahnrad ist der letzte Eintrag der Nav. Ein Klick öffnet einen schmalen senkrechten
Stapel mit einem Knopf je Einstellung. Der Klick schaltet reihum weiter. In Ruhe zeigt das
Icon den **Zustand**, unter dem Zeiger das **Ergebnis des Klicks**.

| Einstellung | Werte | Icon |
|---|---|---|
| Zoom | S, M | `S`, `M` |
| Farbschema | hell, dunkel | Sonne, Mond |
| Navigation | Text, Icons | Squircle mit `t` = Text |
| Ansicht | Chips, Raster | vier runde Kacheln bzw. vier eckige Umrisse |
| Ausrichtung | links, Mitte | `l`, `c` (im Raster: volle Breite, Mitte) |
| Bearbeiten | aus, an | zwei Chevrons; Diskette während der Bearbeitung |

Mit der Maus geht auch: Zahnrad drücken, auf einen Knopf ziehen, loslassen. Das schaltet nur
diesen Knopf. Esc oder ein Klick daneben schließt. Mit Maus schließt sich das Overlay 3 s
nach dem Verlassen von selbst, ohne Zeiger (Touch, TV) nie.

Wo die Wahl liegt (je Gerät in `localStorage`, nichts davon wird mit den Links gespeichert):

| Schlüssel | Inhalt |
|---|---|
| `msmr.zoom` | `{"v":1,"level":"s"|"m"}`; ohne Eintrag gilt S |
| `msmr.theme` | `light` oder `dark`; ohne Eintrag folgt die Seite dem System |
| `a.navMode` | `short` oder `icons` |
| `a.align` | `left` oder `center` |
| `a.view` | `chips` oder `grid` |

**Zoom:** keine Erkennung, Standard ist S. Größen stehen in `rem` und folgen
dem Zoom (Kacheln, Leiste, Schatten, roter Punkt). Die `device-width`-Media-Queries für
iPad und iPhone bleiben Gerätemerkmale und folgen dem Zoom nicht.

### Raster-Ansicht

Eckige Kacheln ohne Glanz, 1 px Linien. In inaktiven Sections sind sie grau, in der
eingefärbten Section hell. „Links“ heißt hier volle Breite, auch die Leiste läuft dann
über die ganze Seite. Ein toter Link zeigt ein rotes Quadrat in der Ecke. Der Edit-Mode
nutzt weiter das Chip-Layout.

## Bearbeiten

Setzt eine Anmeldung voraus: einmal pro Browser `https://a.msmr.co/edit/` aufrufen
(siehe [docs/htaccess-setup.md](docs/htaccess-setup.md)).

- Einstieg: Zahnrad → unterster Knopf, oder Doppelklick auf die Leiste.
- Name und URL der Kacheln sind direkt bearbeitbar, `×` löscht (umkehrbar bis zum Speichern),
  `+` fügt hinzu.
- Der Griff `⠿` zieht eine Kachel, auch **in eine andere Section** (nur mit Maus).
- Beenden: derselbe Knopf (jetzt eine Diskette). Ohne Änderung wird die Seite einfach neu
  geladen. Mit Änderung fragt sie, ob gespeichert wird; bei „Nein“, ob verworfen wird;
  bei erneutem „Nein“ bleibt die Bearbeitung offen.
- Eine Section ohne Links wird beim Speichern nicht geschrieben.

## Geräte

Phone und iPad haben eigene Layouts über `device-width`-Media-Queries (Höhenraster in
Viertelschritten, untere Leiste mit Sprungtasten). Details im [CHANGELOG](CHANGELOG.md).

## Deploy

Plesk zieht `main` automatisch. Die echten Daten und die Passwortdatei sind nicht im Repo.
Welche Dateien nicht ins Webverzeichnis gehören, steht in
[docs/htaccess-setup.md](docs/htaccess-setup.md).

## Lizenz

GNU GPL v3, siehe [LICENSE](LICENSE).

Am Ende der Leiste (hinter dem Zahnrad) schaltet ein Kreis die Farbschema-Automatik: leer = feste Wahl, gefüllt = folgt dem System. Der Farbschema-Knopf im Overlay stellt dann hell/dunkel fest ein.

Im Text-Modus heißen Zahnrad und Automatik-Knopf „set“ und „auto“. Das Sections-Dropdown öffnet in beiden Modi eine eigene Liste (Namen bzw. Icons); drücken, ziehen, loslassen wählt. In `index.html` hängt an `styles.css` und `app.js` eine Version (`?v=…`): bei Änderungen hochzählen, sonst mischen Browser alte und neue Dateien.
