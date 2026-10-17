# a.msmr.co

Persönliche Startseite: Links in Sections, als Kacheln. Statisches HTML, CSS und
Vanilla-JS, dazu zwei kleine PHP-Skripte für die Daten. Kein Framework, kein Build.

Gebaut für Maus und Tastatur am Desktop, iPad und iPhone und für den Browser am TV.

## Aufbau

| Datei | Aufgabe |
|---|---|
| `index.html` | Gerüst: Leiste mit Nav-Chips, Zahnrad und Sections-Dropdown (ein Button, alle in einer Flex-Zeile), Inhalt, Overlays. Im `<head>` stehen die Skripte für Zoom und Farbschema (laufen vor dem ersten Paint) |
| `app.js` | Rendern, Navigation, Einstellungen, Edit-Mode |
| `styles.css` | alles Aussehen; Farbschemata, Zoom und Raster hängen an Variablen und Klassen |
| `links.php` | liefert `edit/links.json` aus (öffentlich) |
| `edit/save.php` | schreibt die Daten (Basic-Auth) |
| `links.default.json` | Saat, nur beim allerersten Aufruf |
| `tools/dev-router.php` | Demo-Server mit `no-store`, nur lokal |
| `tools/smoke.js` | Rauchtest ohne Browser (jsdom): lädt die Seite, schaltet den Edit-Mode ein, prüft Nav-Aufbau, Klick-Sperre, gekoppelte Hervorhebung und das Umsortieren von Sections; schlägt bei Seitenfehlern und Endlosschleifen fehl. `npm install --no-save jsdom && node tools/smoke.js` |
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
- `tot` markiert einen beim letzten Test nicht erreichbaren Link (roter Punkt; im Raster ein Quadrat, am Desktop ein Dreieck mit 6 px Katheten, 1 px nach innen gerückt und mit weißem 1-px-Rand, in der oberen rechten Ecke). Ausnahmen, die nie als tot gelten, stehen zentral in `never-dead.json` (`allIpAddresses`: jede IP-Adresse; `hosts`: Rechnernamen, derzeit `orderbox` und `kitchen.toolbox-bodensee.de`); `edit/pruefen.php` und die Seite (`isNeverDead` in `app.js`, auch für schon gespeicherte Markierungen) lesen dieselbe Datei.
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
  (Fläche weiß, Text in der Sektionsfarbe). Der Strich-Cursor sitzt im gleitenden Kachel-Licht und
  wandert mit.
- Der aktive Nav-Chip folgt der Scrollposition (die oberste sichtbare Section), nie der Maus; die Section unter der Maus zeigt an ihrem Chip die weiche Hover-Fläche.
- **Klick-Sperre:** Nach einem Klick auf einen Titel, einen Nav-Chip oder einen Eintrag der
  Sections-Liste scrollt die Section nach oben, und der ruhende Zeiger liegt danach über etwas
  anderem. Bis der Zeiger sich um mehr als 4 px bewegt oder ein anderer Klick kommt, bleibt die
  angeklickte Section Ziel von Leuchtfenster und Chip (`sperreAn`, `body.gesperrt`), Kachel-Licht
  und Kachel-Hover bleiben aus, andere Chips zeigen keinen Hover, und der Zeiger ist der normale
  Punkt. Nur nach einem Titelklick hebt auch ein Tastendruck die Sperre auf.

### Tastatur

- Pfeil hoch / runter: vorige / nächste Section. Pfeil links / rechts: Kachel zu Kachel,
  über Section-Grenzen. Nach einem Section-Wechsel geht links auf die letzte Kachel.
- Nach einer Mausbewegung starten die Pfeile an der Section oder Kachel unter der Maus.
- Tab läuft durch die Kacheln. Die Pfeile gelten auch mit Fokus auf Nav-Chips und Zahnrad,
  nicht im Dropdown und nicht im Edit-Mode. Im geöffneten Dropdown bewegen die Pfeile den Fokus
  zwischen den Einträgen, Enter wählt; der Fokus hat dort keine eigene Hervorhebung.
- Es zählt immer nur die zuletzt benutzte Eingabe (Maus **oder** Tastatur), die andere
  wird für die Hervorhebung ignoriert.
- `+` / `-` ändern den Zoom, `0` setzt ihn auf S. Strg/Cmd bleiben dem Browser-Zoom.

### Einstellungen (Zahnrad in der Leiste)

Das Zahnrad ist ein Nav-Knopf (`.nav-btn`) neben dem Sections-Dropdown. Ein Klick öffnet einen
schmalen senkrechten Stapel mit einem Knopf je Einstellung. Der Klick schaltet reihum weiter. Der Knopf zeigt den **Zustand**. Im Text-Modus ist
das ein kurzes englisches Wort, im Icon-Modus ein Icon. Der Hover-Hinweis (`title`) nennt
„jetzt/nächster Wert“, beim Theme alle Werte mit dem aktuellen in Klammern.

| Einstellung | Werte | Text-Modus | Icon-Modus |
|---|---|---|---|
| Zoom | S, M | `S`, `M` | `S`, `M` |
| Theme | auto, light, dark | `aut`, `light`, `dark` | Kreis (auto), Sonne, Mond; in auto klein das Icon des Systemwerts unten rechts |
| Color | bunt, blass | `col`, `pale` | Kreis in einer Section-Farbe |
| Navigation | text, icons | `text` | Squircle |
| View | chips, grid | `chip`, `grid` | vier runde Kacheln bzw. eckige Umrisse |
| Align | left, center | `left`, `cen` (im Raster `full`) | `fa-align-left`, `fa-align-center` |
| Edit | aus, an | `edit`, `save` | zwei Chevrons; Diskette während der Bearbeitung |

Mit der Maus geht auch: Zahnrad drücken, auf einen Knopf ziehen, loslassen. Das schaltet nur
diesen Knopf. Esc oder ein Klick daneben schließt. Mit Maus schließt sich das Overlay 3 s
nach dem Verlassen von selbst, ohne Zeiger (Touch, TV) nie.

**Overlays (Einstellungen und Sections-Liste):** Sie wachsen beim Öffnen in der Höhe vom Zahnrad
bzw. Dropdown weg und schrumpfen beim Schließen (auch beim automatischen) zurück (125 ms, bei
reduzierter Bewegung 90 ms). Nur die Höhe animiert. Beim Öffnen schalten die Farben zuerst um, beim
Schließen erst am Ende. Das Zahnrad schaltet ohne Übergang um und kehrt erst zurück, wenn das
Overlay eingezogen ist. Die Breite folgt dem Zahnrad bzw. Dropdown, die Knopfhöhe ist im Raster
dieselbe wie bei Chips (`navKnopfHoehe`).

Wo die Wahl liegt (je Gerät in `localStorage`, nichts davon wird mit den Links gespeichert):

| Schlüssel | Inhalt |
|---|---|
| `msmr.zoom` | `{"v":1,"level":"s"|"m"}`; ohne Eintrag gilt S |
| `msmr.theme` | `light` oder `dark`; ohne Eintrag gilt „auto“: das Skript im `<head>` setzt `data-theme` auf den Wert des Systems und folgt Änderungen |
| `a.farbe` | `bunt` oder `blass` |
| `a.navMode` | `short` oder `icons` |
| `a.align` | `left` oder `center` |
| `a.view` | `chips` oder `grid` |

**Zoom:** keine Erkennung, Standard ist S. Größen stehen in `rem` und folgen
dem Zoom (Kacheln, Leiste, Schatten, roter Punkt). Die `device-width`-Media-Queries für
iPad und iPhone bleiben Gerätemerkmale und folgen dem Zoom nicht.

### Raster-Ansicht

Eckige Kacheln ohne Glanz, 1 px Linien. In inaktiven Sections sind sie grau, in der
eingefärbten Section hell. „Links“ heißt hier volle Breite, auch die Leiste läuft dann
über die ganze Seite; die Kacheln der Sections bleiben bei höchstens 6 Spalten und werden breiter, auf schmalen Bildschirmen (Smartphone) stehen mindestens zwei nebeneinander. Leere Felder der letzten Zeile tragen die Linien der Kacheln. Ein toter Link zeigt ein rotes Quadrat in der Ecke (am Desktop ein Dreieck mit 6 px Katheten). Der Edit-Mode
nutzt weiter das Chip-Layout.

### Leuchtfenster und Ghost headers

Die leuchtende Section (Hover, Nav-Chip, Tastatur, sonst die oberste) ist ein Fenster, das zur
nächsten gleitet und dabei wächst bzw. schrumpft (200 ms, beschleunigt, endet hart; bei
reduzierter Bewegung 60 ms). Die Farbe wechselt hart an den Section-Kanten. `app.js`
(`fensterInit`) malt den Teil des Fensters als Hintergrund jeder Section und setzt `.gedeckt`
auf Titel, Gruppe und Kacheln, deren Mitte im Fenster liegt (`.gedeckt-u` für die untere
Rasterlinie an der Unterkante); das CSS färbt nur noch über diese Klassen. Die Maße liegen im
Inhalt, Scrollen ändert sie nicht.

Liegt der Titel der Ziel-Section (Nav-Chip unter der Maus oder Sprung nach Klick, Dropdown,
Pfeiltasten) außerhalb der Ansicht, klebt eine Kopie (`#ghost-header-layer`, `ghostHeaderRender`) am oberen
bzw. unteren Rand, bis der echte Titel dort ankommt und weiterläuft; sie bleibt, bis das Fenster
die Titelzeile ganz deckt, und blendet dann 60 ms aus. Die Kopien bilden einen Stapel aus allen Sections zwischen der Ansicht und dem Ziel, nach Entfernung geordnet: die nächste
liegt unten, das Ziel oben (am oberen Rand sind die früheren Sections weiter weg, am unteren die späteren). Wandert das Ziel weiter
weg, gleitet nur seine Kopie ein, die dazwischen liegen schon fertig darunter. Wandert es näher, gleiten die Kopien darüber
nur hinaus und legen die darunter frei, ohne vorher herunterzugleiten; sprang das Ziel über mehrere, gleiten sie gemeinsam hinaus.
Ein Wechsel dauert 400 ms; das nächste Ziel wartet darauf, und nur das letzte zählt: langsames Überfahren zeigt jeden Schritt,
schnelles lässt Zwischenschritte aus. Ist das Ziel die aktive oder eine sichtbare Section, gleiten alle hinaus; wechselt der Rand, ebenso. Ein- und Hinausgleiten laufen mit ease-out; Schatten und Linie blenden am Ende des
Hinausgleitens schnell aus. Darunterliegende Kopien behalten ihre Farbe, haben aber weder Schatten noch Linie (es gibt immer nur
einen, sonst würde er mit jeder Kopie dunkler); steht der echte Titel einer solchen Kopie in der Ansicht, verschwindet sie. Die Kopie wirft einen weichen Schatten von
66 % einer Kachelhöhe auf den Inhalt. Nach einem Klick läuft er aus, je näher der echte Titel
seiner Stelle kommt. Im Edit-Mode und auf dem Smartphone gibt es keine Kopie: dort bleiben die Titel an ihrer Section und scrollen mit ihr aus der Ansicht.

### Kachel-Licht

Die Hover-Fläche der Kachel (Chips und Raster) ist ein einzelnes Element (`#kachel-licht`,
`licht*` in `app.js`), das von Kachel zu Kachel gleitet (90 ms). Aus dem Nichts kommt es in
voller Größe von außen über die Eintrittskante durch ein festes Rechteck ohne Rundung in die
Kachel (90 ms, linear) und verlässt sie über die Austrittskante genauso; die gerundete Fläche
selbst wird nie skaliert. Die Kachelschrift kehrt um (`.da`), sobald das Licht sie zu 95 % deckt.
Die Zelle unter dem Licht trägt die Section-Farbe sofort (`.kachel-zelle`). Gezeichnet wird im
Inhalt, das Licht scrollt mit und folgt bei Bewegung und Scrollen der Kachel unter dem Zeiger.

### Zeiger

- **Strich:** auf Nav-Chips ohne Richtung (Section schon oben) und Kachelrändern in Zeilenhöhe, auf
  Section-Hintergrund und Titel in Section-Höhe mit 33 % Deckkraft (`#strich-sec`, hinter Titel,
  Kacheln und Licht). Auf einer Kachel sitzt der Strich im Kachel-Licht.
- **Punkt:** in einer Section (nicht auf Chip oder Kachel) das kleine Quadrat, weiß im hellen und
  invertiert im dunklen Modus (`--curs-sec`); auch im Titel, der ganz oben steht.
- **Chevron:** auf Titeln, Nav-Chips und Einträgen der Sections-Liste zeigt ein Chevron nach oben oder unten,
  wohin ein Klick scrollt (`chipRichtung`; im Titel immer nach oben). Er ist ein echter Bildzeiger
  (SVG-Data-URI, 25 px, je Thema in `--curs-auf` und `--curs-ab`; `app.js` setzt nur
  `data-pfeil` auf `html`), also immer über allem, auch über Popovers.
- In Feldern, Dropdown-Liste, Einstellungen und im Edit-Mode bleibt der Systemzeiger; Touch bleibt ohne Zeiger.
- Im Titel zeigt nur der Chevron die Position (kein Section-Strich); im obersten, aktiven Titel gelten stattdessen Punkt und Strich; bei Tastaturnavigation (`body.tastatur`) bleiben Strich, Chevron und Geist-Titel unter dem ruhenden Mauszeiger aus.

### Nav und Sections-Dropdown

Chips (`a.secname`), Zahnrad und Dropdown (`.nav-btn`) stehen in einer Flex-Zeile
(`#section-nav-list`), der Rest gehört allen gleichermaßen (`flex: 1 1 auto`). Reicht der Platz
nicht, läuft die Zeile nach links über (`justify-content: flex-end`): Zahnrad und Dropdown am Ende
bleiben erreichbar. Das Dropdown ist ein `<button>` (`aria-haspopup`, `aria-expanded`) mit Icon und
dem Wort „sec“, der Chevron dreht sich offen nach oben.

Auf dem iPhone hochkant weichen die Chips; in der unteren Leiste folgen Dropdown und Stepper dicht auf den Titel, das Zahnrad steht ganz rechts am Rand
(`#section-nav-list` ist dort `display: contents`, Reihenfolge per `order`).

Chips und Einträge der Sections-Liste teilen sich die Klasse `a.sec-btn` (gebaut von `secKnopf`):
gleiche Grundgestalt, gleiche Hover-, Aktiv- und Druckeffekte (flach, ohne Schatten in der Liste, gesteuert
über `--sb-*`-Variablen). Hover auf einem Eintrag leuchtet wie Hover auf dem Chip: `koppleHover`
koppelt Chip, Titel und Eintrag einer Section (`.mit-hover`). Der aktive Chip folgt nur der Scrollposition, nie der Maus: liegt die Maus irgendwo in einer nicht aktiven Section (Titel, Hintergrund, Kachel), zeigt deren Chip die weiche Hover-Fläche (`.sec-hover`, Klasse am Chip, solange die Maus in der Section ist), und der aktive Chip bleibt unverändert. Die aktive Section ist in der offenen
Liste gefüllt und ins Sichtfeld gescrollt. Namen verlieren eine Endung (`tbx.li` → `tbx`).

### Touch (Smartphone)

- **Kein Hover:** die Zeigerart (`zeigerArt`, `istTouch()`) wird beim `pointerdown` gesetzt, echte Mausbewegung stellt zurück; `body.touch` spiegelt sie ins CSS schaltet alle
  `:hover`- und `:active`-Effekte ab, die iOS sonst nach einem Tap hängen lässt; `koppleHover` und das
  Leuchtfenster ignorieren Touch-Hover. Ein Tap wirkt wie ein Klick: er aktiviert die Section
  (Chip, Titel, Hintergrund, Kachel; `sperreAn` beim Klick), ein Wisch aktiviert nichts und hebt die Sperre auf.
- **Sections-Dropdown:** Einträge 2,75 rem hoch, Tap wählt sofort; Antippen, Ziehen und Loslassen öffnet die Liste
  und wählt den Eintrag unter dem Finger in einem Zug (`touch-action: none` am Feld).
- **Scrollen:** die aktive Section wird während des Wischens alle 80 ms nachgezogen und am Ende über `scrollend`
  und `bisRuhe` (zwei stille Frames) bestätigt; sie gilt 24 px vor dem Einrasten als aktiv. Während des Wischens
  (`html.wischt`, endet erst mit dem Finger oben; nicht am `body`: dessen Klassenwechsel löst die Neuvermessung aus)
  haben die Chips keine Hover-Optik. Das Leuchtfenster ist beim Scrollen eine Funktion der Scrollposition
  (`fensterScroll`): zwischen zwei Section-Oberkanten geht es vom Rahmen der einen zu dem der nächsten über (Oberkante =
  Scrollposition), am Einrastpunkt deckt es genau die Section. Es läuft so mit Finger, Auslauf, Stepper- und Chip-Sprüngen,
  ohne eigene Zeit (kein Vorauseilen, Zurückbleiben oder Zucken). Nur ein Tap auf eine Section animiert es (feste Dauer). Beim Übergang vom Tap-Ziel in die Kopplung klingt der Abstand zum Rahmen der Scrollposition in 280 ms ab (Smoothstep), das Fenster springt nicht. Auf Touch ist das Kachel-Licht aus: es gibt keinen Zeiger, und von iOS nachgeschobene Mausereignisse zählen nicht (sonst blieb das Licht an der Berührungsstelle auf dem Bildschirm hängen, während darunter gescrollt wurde). Hochkant auf dem iPhone ist `scroll-snap-stop`
  normal: ein Wisch darf mehrere Sections überspringen.

### Seiten auf dem Smartphone

Auf dem Smartphone (`istPhone()`, `PHONE_QUERY`) rasten nicht alle Sections ein, sondern **Seiten** (`seitenBilden` in `app.js`, beim
Messen in `fensterMessen`):

- Zwei aufeinanderfolgende **halbhohe** Sections (Höhe höchstens die halbe Inhaltshöhe) bilden eine Seite: ein Einrastpunkt, beide zugleich auf dem Bildschirm.
- Eine übrig bleibende halbhohe Section bleibt allein. Sie bekommt eine leere halbhohe Section dahinter (`margin-bottom`, auch als letzte), damit die Seite voll
  ist und eine folgende größere Section auf einer eigenen Seite beginnt (drei halbhohe, dann eine große: Seite 1 = zwei, Seite 2 = die dritte mit leerer unterer Hälfte, Seite 3 = die große).
- Eine größere Section beginnt immer eine eigene Seite; ist sie höher als der Bildschirm, scrollt sie darin frei (der Einrastpunkt liegt an ihrem Anfang).
- Einrastpunkt ist die erste Section jeder Seite (`.seitenstart`, `scroll-snap-align: start`). Das Leuchtfenster deckt beim Scrollen und beim Tippen die ganze Seite
  (`fenster.seiten`); Stepper, Pfeile und Dropdown springen von Seite zu Seite bzw. zum Anfang der Seite des Ziels (`seitenStart`, `jumpBy`).
- Im Edit-Mode gibt es keine Seiten.

### Zentrale Variablen

Im ersten `:root` von `styles.css` stehen die Stellgrößen; `app.js` liest sie einmal
(`maszLesen`): `--fenster-dauer` (200), `--fenster-dauer-kurz` (60), `--gleiten-potenz` (2),
`--licht-dauer` (90), `--licht-potenz` (1,4), `--licht-rand-dauer` (90), `--licht-deckung` (.95),
`--ghost-header-shadow` (.66), `--ghost-header-fade` (2), `--ghost-header-hold` (2500), `--strich-schwach` (.33),
`--strich-breite`, `--farbe-blass` (.4), `--pop-dauer` (125). Zeiten in ms.
Die Einstellung „Farbe“ skaliert die Sättigung aller Section-Farben (`oklch`) über `--farb-int`.

Die Farbwerte der Themen stehen je einmal im hellen Block (`:root`) und im dunklen
(`:root[data-theme="dark"]`); das Skript im `<head>` setzt `data-theme` immer, auch bei „auto“.
Dazu gehören auch die Zeiger (`--curs-img`, `--curs-sec`, `--curs-hov`, `--curs-auf`, `--curs-ab`).

## Bearbeiten

Setzt eine Anmeldung voraus: einmal pro Browser `https://a.msmr.co/edit/` aufrufen
(siehe [docs/htaccess-setup.md](docs/htaccess-setup.md)).

- Einstieg: Zahnrad → unterster Knopf.
- Name und URL der Kacheln sind direkt bearbeitbar, `×` löscht (umkehrbar bis zum Speichern),
  `+` fügt hinzu.
- Der Griff `⠿` zieht eine Kachel, auch **in eine andere Section** (nur mit Maus).
- Am Titel jeder Section sitzt ebenfalls ein Griff `⠿`: er zieht die ganze **Section** senkrecht,
  wie sie in der Ansicht untereinander stehen (nur mit Maus). Gespeichert wird die Reihenfolge im
  DOM; der Speicherdialog nennt „Reihenfolge der Sections“. Die Sektionsfarben folgen der Position.
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

## Hinweis zur Version

In `index.html` hängt an `styles.css` und `app.js` eine Version (`?v=…`): bei Änderungen
hochzählen, sonst mischen Browser alte und neue Dateien.
