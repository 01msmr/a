# Änderungen

Neueste zuerst. Eine Überschrift pro Arbeitssitzung. Ältere Stände stehen im
`git log`; hier beginnt die Aufzeichnung mit der Sitzung vom 25./26. Juli 2026.

## 2026-10-15 — Aktiver Titel beim Nav-Hover, Raster höchstens 6 Spalten

- **Titelfarbe:** Beim Hover auf den Chip der aktiven Section behielt deren Titel nicht die Farbe der aktiven Section. Die Hover-Regeln für Titel und Unterkante greifen jetzt nur noch bei `.name.mit-hover:not(.active)`.
- **Raster, volle Breite:** Die Kacheln einer Section bleiben bei höchstens 6 Spalten (`minmax(max(var(--kachel), 100% / 6), 1fr)`) und füllen die Breite, statt mit ihr mehr Spalten zu bekommen.

---

## 2026-10-11 — Nur noch zwei Werte je Einstellung

Jede Einstellung hat zwei Werte, der Knopf schaltet zum anderen, keine Vorschau beim Hover. Zoom nur S/M ohne Erkennung (gespeichertes `l` zählt als `m`). Farbschema nur hell/dunkel; die Automatik ist ein eigener Kreis am Ende der Leiste (leer/gefüllt).

- **Text-Modus:** Zahnrad heißt „set“, der Automatik-Knopf „auto“ (aktiv = umgekehrt); im Icon-Modus Zahnrad und Kreis.
- **Sections-Liste:** Statt des nativen Menüs öffnet das Auswahlfeld in beiden Modi eine eigene Liste (`#jumper-pop`): im Text-Modus Namen, im Icon-Modus Icons; Stapel in Feldbreite wie das Einstellungs-Overlay, nicht umgekehrt, ohne Übergänge. Drücken, ziehen, loslassen wählt einen Eintrag. Grund: das native macOS-Menü zeigt keine Webschrift (Font-Awesome-Icons erschienen als „?“).
- **Auswahlfeld:** Bleibt ein `<select>`; im Icon-Modus zeigt es das Icon-Zeichen in der Farbe der Leisten-Icons. Beim Sprung über das Dropdown zeigt es bis zur Ankunft die gewählte Section (`selSprung`), nicht die durchscrollten.
- **APP-Icon:** überall Font Awesomes `fa-square` statt der Squircle-Maske (die bleibt nur im Navigations-Knopf der Einstellungen). Ein Versuch, das Feld auf einen Button umzubauen, wurde verworfen.
- **Titelzeile:** Die ganze Zeile einer Section ist der Link (`a::after` über die Zeile), nicht im Edit-Mode.
- **Desktop:** Das Dropdown hat 0,375 rem Abstand zum rechten Seitenrand.
- **Cache:** `styles.css` und `app.js` hängen `?v=…` an (in `index.html`); der Server schickt keine Cache-Header, ein altes `app.js` zu neuem `index.html` ließ die Seite leer. Bei Änderungen die Version hochzählen.

---

## 2026-10-09 bis 11 — Sektionsfarben, Zoom, Farbschema, Einstellungs-Overlay, Raster

Aus einem Feinschliff der Nav und der Kacheln wurde eine umfassende Überarbeitung der
Oberfläche. Geprüft wurde im Headless-Browser (Vivaldi über CDP) mit Messwerten und
Screenshots, nicht nach Augenmaß; Telefon, iPad, Dunkelmodus im Raster und die
Fernbedienung am TV blieben ungeprüft.

### Sektionsfarben und Hervorhebung

Jede Section hat eine Farbe (`--c`, 15 Töne aus `SEC_COLORS`, nach Position). Daraus
leiten sich ab: `--c-hov` (28 % Deckkraft), `--on-c` (Schrift auf der Farbe) und
`--c-text` (die Sektionsfarbe mit auf einen Bereich begrenzter Helligkeit, damit sie auf
Weiß bzw. Dunkel lesbar bleibt).

Die **aktive oder gehoverte Section füllt sich ganz** in ihrer Farbe, Schrift weiß (im
Dunkeln `#111`). Die Kachel unter dem Cursor kehrt um: helle Fläche, Text in der
Sektionsfarbe, der gezeichnete Strich-Cursor ebenfalls. Die Titel-Hervorhebung der aktiven
Section entfiel; der Nav-Chip folgt im Maus-Modus der Section unter der Maus.

Es zählt **nur die zuletzt benutzte Eingabe**. `body.tastatur` (gesetzt bei Tab und Pfeilen,
entfernt bei Mausbewegung) schaltet zwischen Hover-Regeln und Fokus-Regeln um. Im
Maus-Modus tritt die „aktuelle“ Section zurück, solange eine andere gehovert wird —
vorher waren zwei gleichzeitig eingefärbt.

Behoben: Beim Tastatur-Sprung bekam die Ziel-Section zuerst den Fokus und erst später
`.aktuell`. In der Lücke galt nur die allgemeine Regel, die Titel, Unterkante und Text auf
`--title-col` setzt, im Dunkeln also ein weißes Aufblitzen. Die Einfärbung gilt jetzt auch
bei `section:focus-visible`.

### app als dritte Section

`mitApp()` in `app.js` setzt die Section `app` an Position 3, wenn sie in den Daten fehlt;
ein früher gespeichertes „APP“ und das Handy-Icon werden beim Laden auf `app` und den
Squircle umgestellt. Der Titel steht kleingeschrieben da, die Großbuchstaben macht
`text-transform` wie bei den anderen. Das Icon `icon-squircle` ist eine Superellipse mit
Exponent 5 (Apples App-Icons; ein mathematisches Squircle hätte 4), als CSS-Maske aus einem
SVG gezeichnet — Font Awesome hat keine solche Form.

### Zoom S / M / L

`html` bekommt `font-size: calc(100% * var(--zoom))` mit 1, 1,25 und 1,6. Kachelbreite,
Zeilen- und Leistenhöhe, Abstände, Schatten und der rote Punkt stehen in `rem`; Haarlinien
bleiben `1px`. Die Wahl liegt je Gerät in `localStorage["msmr.zoom"]`, ohne Eintrag gilt ein
automatischer Standard (TV, breit ohne Maus, Tablet). Ein Inline-Skript im `<head>` setzt
sie vor dem ersten Paint. API: `msmrZoom.get/set/step/cycle/reset`. Tasten `+`, `-`, `0`.

Die Nav-Chips bekamen `flex: 1 1 0`, damit sie bei großem Zoom nicht in eine zweite Zeile
brechen. Die `device-width`-Media-Queries bleiben in `px`.

### Farbschema auto / hell / dunkel

Die Variablen stehen für Hell (Standard), für die Systemvorgabe Dunkel und für die
ausdrückliche Wahl `data-theme="dark"`. Dunkel steht deshalb zweimal in `styles.css` — eine
Media Query kennt kein Attribut. Die Wahl liegt in `localStorage["msmr.theme"]`, ohne Eintrag
folgt die Seite dem System. Im Dunkeln hat die Hover-Kachel die Seitenfarbe als Fläche und
der Glanz ist auf 60 % gesenkt (`--glanz`).

### Einstellungen im Overlay

Zahnrad als letzter Nav-Eintrag, davor die Chips, danach das Dropdown. Ein Klick öffnet
einen senkrechten Stapel aus Icon-Knöpfen (ein natives `popover="manual"`), jeder schaltet
reihum. Das Icon zeigt in Ruhe den Zustand und unter dem Zeiger das Ergebnis des Klicks; nach
einem Klick den neuen Zustand, bis der Zeiger den Knopf verlassen hat. Der Stapel ist so
breit wie das Zahnrad, das dieselben Breitenregeln wie die Nav-Chips teilt, und invertiert
sich solange er offen ist. Drücken, auf einen Knopf ziehen und Loslassen schaltet nur diesen
Knopf. Mit Maus schließt er sich 3 s nach dem Verlassen, ohne Zeiger nie.

Der frühere Einstellungsblock im Edit-Mode und die zwei Knopfleisten unten rechts
entfielen. Die Einstellungen Navigation (Text/Icons) und Ausrichtung (links/Mitte) sind
vom Edit-Mode ins Overlay gewandert.

### Raster-Ansicht

Neue Einstellung „Ansicht“: eckige Kacheln ohne Glanz, 1 px Linien auf den Gitterlinien
(grau in inaktiven Sections, hell in der eingefärbten), kein Strich unter dem Titel und kein
Polster unter der Gruppe. Bei Hover hebt sich der Titel mit 28 % in der Schriftfarbe von der
Fläche ab. „Links“ heißt hier volle Breite, auch die Leiste. Der tote Link ist ein rotes
Quadrat bündig in der Ecke. Der Edit-Mode bleibt beim Chip-Layout.

### Bearbeiten

Einstieg über das Overlay (zwei Chevrons; während der Bearbeitung eine Diskette) oder
Doppelklick auf die Leiste. Speichern/Abbrechen und der Eintrag „edit“ im Dropdown
entfielen. Das Beenden fragt: speichern? sonst verwerfen? sonst weiterbearbeiten; ohne
Änderung lädt die Seite einfach neu. Links lassen sich in andere Sections ziehen (nur mit
Maus); der Speichern-Dialog meldet dann die Ziel-Section als geändert.

### Tastatur

- Pfeile gelten auch mit Fokus auf Nav-Chips oder Zahnrad.
- Nach einer Mausbewegung starten sie an der Section bzw. Kachel unter der Maus statt am
  Scrollstand. Davor sprang „nach unten“ zur ersten Section.
- Pfeil links nach einem Section-Wechsel geht auf die letzte Kachel der Section.

### Weiteres

- Favicon ist jetzt `apple-icon-180x180.png`; `favicon-32x32.png` existierte nicht. Pfade im
  Manifest sind relativ zum Manifest.
- `tools/dev-router.php`: Demo-Server mit `no-store` und Versionsnummer an CSS/JS. Eine
  zeitweilige Cache-`.htaccess` ist wieder entfernt, die echte Seite lädt korrekt.
- Die Seite hat keine Rundung des Rahmens mehr (`div.seite` füllt das Fenster); die
  Eckenrundung der Vivaldi-Webview ist eine Browsereinstellung.

### Fallstricke, die bleiben

- **Spezifität bei den Hover-Regeln.** Die Einfärbung steht in mehreren Selektorlisten
  (Maus, Fokus, aktuell). Wer eine Eigenschaft ändert, muss alle drei erwischen.
- **`:where(:not(:has(...)))`** hält die Spezifität der „aktuell“-Regeln klein; ein
  normales `:not()` würde sie über die Hover-Regeln heben.
- **`custom property` mit Farbe im `:root`.** `--teiler` o. Ä. mit `var(--c)` im `:root`
  wertet nicht pro Section aus; solche Mischungen gehören direkt in die Regel.
- **`sed -i` auf macOS** braucht `-i ''`; Python-Ersetzungen mit `assert` sind sicherer.
- **Screenshots im Headless-Browser** zeigen die Seite am rechten Rand doppelt und
  lassen das Overlay manchmal aus; Messwerte (`getComputedStyle`, `elementFromPoint`) sind
  verlässlicher als das Bild.

## 2026-07-26 — Höhenraster, gekürzte Namen, Fokus, tote Links

Der Tag begann mit zwei Wünschen fürs iPad und wuchs zu einer Überarbeitung
der mobilen Darstellung. Geprüft wurde durchgehend mit einem lokalen
Testserver und Messungen im Browser statt nach Augenmaß — mehrere Befunde
haben Annahmen widerlegt, die vorher plausibel aussahen.

### Höhenraster

Sections belegen jetzt ein **ganzes Vielfaches eines Viertels der
Inhaltshöhe**: am iPad einen Platz, überlange zwei; am iPhone zwei oder vier.
Damit steht nie eine angeschnittene Section am unteren Rand.

`raster()` in `app.js` rundet die Höhen auf, die Rastereinheit kommt aus der
CSS-Eigenschaft `--raster` der jeweiligen Media Query. Wo sie fehlt — am
Desktop — behalten die Sections ihre eigenen Höhen. CSS allein konnte das
nicht: Aufrunden auf ein Vielfaches hängt am Inhalt.

Die Schwelle liegt bei 20 Links pro Platz und passt sich von selbst an: Fällt
eine zweiplätzige Section darunter, bekommt sie wieder einen Platz.

`max-height: 46vh` ist entfallen, `height: 100%` wurde zu `min-height`. Beides
waren Decken ohne `overflow` — Inhalt lief darüber hinaus in die nächste
Section.

### Kacheln

Lange Namen brechen nicht mehr um, sondern werden mit `…` gekürzt. Dadurch
sind alle Kacheln auf einem Gerät exakt gleich groß. Vorher lief die zweite
Zeile über die nächste Reihe, überall dort wo die Kachelbreite fest ist.

Die Spaltenzahl folgt der verfügbaren Breite statt einer festen Zahl
(`repeat(auto-fill, minmax(190px, 1fr))`): am iPad vier im Hoch-, sechs im
Querformat, ohne eigene Regel je Orientierung. Bei 190 px Mindestbreite bleibt
**kein einziger der 162 Namen gekürzt**.

Der vertikale Zwischenraum entfiel — `margin` und `gap` lagen übereinander und
kosteten 8 px je Reihe. Section-Köpfe sind mobil von 54 auf 35 px geschrumpft;
das bringt keine zusätzliche Kachelreihe, nur eine kompaktere Seite.

### Leiste und Überlappungen

Die untere Leiste am iPhone verdeckte 14–23 px Inhalt: Sie war 64–73 px hoch,
`.container` hielt aber nur 50 px frei. Ursache war ein `padding` von 0.5em
oben und unten. Jetzt bestimmt der Chip die Höhe, und `raster()` setzt den
Freiraum auf die gemessene Leistenhöhe — er stimmt damit immer.

Im Querformat brach dieselbe Leiste auf 113 px um und verdeckte 63 px. Grund
war eine Doppelregel: `.title` war zweimal definiert, und die spätere
überstimmte allein durch ihre Position das `flex-wrap: nowrap` der
Smartphone-Query. Zusammengeführt.

`#container` bekommt seine Höhe jetzt per Flexbox statt als geschätzte 94 %.
Zusammen mit der 50 px hohen Leiste ergab die Schätzung unterhalb von 833 px
Seitenhöhe einen Überschuss — deshalb ließ sich die Seite am iPad **nur im
Querformat** um wenige Pixel schieben.

Gummiband nur noch auf einer Ebene: `overscroll-behavior: contain` am Inhalt,
`none` an Seite und Dokument.

### Sprungtasten am iPhone

Zwei gefüllte Chevron-Tasten hinter dem Dropdown springen eine Section vor
oder zurück, mit Umlauf von der letzten zur ersten. Sie benutzen dieselbe
`jumpBy()` wie die Pfeiltasten; die schlagen weiterhin an den Enden an.

### Fokus und Kontrast

Der kontrastreiche Zustand hing ausschließlich an `section:hover` — auf einem
Touchgerät nicht erreichbar. Er gilt jetzt ebenso für `:focus`,
`:focus-within` und `.aktuell`, letzteres von `syncActive()` an die oberste
sichtbare Section vergeben. Damit greift er auch beim Scrollen von Hand und
beim Laden der Seite.

Nach einem Sprung wird die Section fokussiert. Drei Zeitpunkte sind nötig,
weil jeder für sich unzuverlässig ist: sofort im Klick, im nächsten Frame und
bei `hashchange`. Das Ziel wird dabei **jedes Mal neu** aus dem Hash bestimmt
— beim Klick auf einen Nav-Chip steht dort noch der alte Wert.

### Tote Links

Alle 162 URLs wurden geprüft. 13 sind nachweislich tot (404 oder Domain
verschwunden) und tragen jetzt `"tot": true`; sie erscheinen rot, im
Aktivzustand mit roter Fläche. Nicht markiert wurden 5 Heimnetz-Adressen,
2 Zeitüberschreitungen und 10 Bot-Sperren (401/403/500/503).

`collectData()` schreibt die Markierung mit — ohne das hätte der erste
Speichern-Klick sie gelöscht. Eine geänderte URL hebt sie auf.

**Wichtig für den Betrieb:** `edit/links.json` ist nicht versioniert. Die
Markierungen erreichen den Server nur durch einmaliges Hochladen dieser Datei;
ein Deploy allein genügt nicht.

### Kleinigkeiten

`a.msmr.co` kürzt sich am iPhone und am iPad im Hochformat auf `a.`, quer
steht die volle Adresse. Section-Header-Links füllen die Restbreite neben dem
Icon. Die Icons sitzen auf der Grundlinie und überragen die Versalhöhe nicht.

---

## 2026-07-25 / 26 — Icons, Einstellungen, Schreibschutz, CSS-Kaskade

Elf Commits von `f36eea8` bis `ce4fdcf`, in einem Zug von 22:02 bis 00:43.
Die Sitzung hat drei Stränge: neue Oberfläche, ein neuer Ort für den
Schreibzugriff und zum Schluss zwei Aufräumarbeiten.

### Oberfläche

- **Section-Icons.** Jede Section trägt in `links.json` ein Feld `icon`
  (Font Awesome 6 Free, Solid). Der Section-Header zeigt immer Icon und Titel,
  die Navigationsleiste wahlweise Icons oder die 3-Letter-Kürzel.
  Die Zuordnung aller 15 Sections steht in
  [docs/superpowers/specs/2026-07-25-section-icons-settings-design.md](docs/superpowers/specs/2026-07-25-section-icons-settings-design.md).
- **Einstellungs-Panel** am Seitenanfang, nur im Edit-Mode sichtbar: zwei
  iOS-Schalter (Icons an/aus, linksbündig/zentriert) sowie Abbrechen und
  Speichern. Die untere Edit-Leiste entfällt dafür. Die beiden Ansichts-
  Einstellungen liegen im `localStorage`, nicht in `links.json` — Handy und
  Desktop dürfen unterschiedlich eingestellt sein.
- **Aktiv-Anzeige.** Die oberste sichtbare Section wird invers hervorgehoben,
  in Chip, Section-Header und Dropdown-Auswahl zugleich. Hover legt die
  Passiv-Farbe als Fläche unter und weicht dem Aktiv-Zustand.
- **Löschen ist umkehrbar** bis zum Speichern: der Eintrag wird durchgestrichen
  statt entfernt, das × wird zum ↺.
- **Pfeiltasten.** Nach Chip-Klick oder Dropdown-Auswahl wandert der Fokus auf
  `#container` (`tabindex -1`, `preventScroll`). Vorher blieb er auf dem Anker
  in der Titelleiste, und die Pfeiltasten scrollten von dort aus ins Leere.
  Beim Laden ist der Inhalt bereits fokussiert, mehrere Tastendrücke summieren
  sich.
- **Chip-Maße.** Im Icon-Modus quadratisch, Icon horizontal mittig; Leisten- und
  Chiphöhe in beiden Modi gleich, auf glatte Werte festgelegt; Icons 25 px.

### Schreibzugriff und Datenhaltung

- `save.php` und `config.php` liegen jetzt unter `edit/`, zusammen mit der
  Datenbank `links.json` und ihrem Backup. Der Verzeichnisschutz greift damit
  auf einen Ordner statt auf einzelne Dateien und lässt sich über das
  Hoster-Panel einrichten.
- Der Token entfällt ersatzlos — in einer öffentlichen JavaScript-Datei war er
  ohnehin wirkungslos. Die Basic-Auth vor `/edit/` ersetzt ihn vollständig.
- `links.php` liefert die Liste öffentlich aus und legt sie beim allerersten
  Aufruf aus `links.default.json` an. `links.json` und `links.bak.json` sind
  nicht mehr versioniert; die echten Daten leben auf dem Server.
- `app.js` meldet bei HTTP 401 verständlich, dass die einmalige Anmeldung unter
  `/edit/` fehlt — `fetch()` löst dafür keinen Anmeldedialog aus.
- **Saat auf den Live-Stand gehoben.** `links.default.json` war älter als der
  Server; übernommen wurde der Inhalt von `links.php` samt Icons, mit der
  Schlüsselreihenfolge name-vor-url, wie `collectData()` sie erzeugt.
- Aufbau, Prüfschritte und Grenzen stehen in
  [docs/htaccess-setup.md](docs/htaccess-setup.md).

### Speichern mit Rückfrage

- Vor dem Speichern erscheint eine Rückfrage mit zwei Listen — geändert und
  gelöscht, jeweils mit alter und neuer Fassung. Neu angelegte Einträge stehen
  in keiner der beiden: sie können nichts überschreiben.
- Grundlage ist ein Vergleich gegen den geladenen Stand. `render()` stempelt
  `data-name0` und `data-url0` an jeden Eintrag, `aenderungen()` vergleicht
  dagegen.
- Ein Speichervorgang ganz ohne Abweichung bricht mit Hinweis ab. Er hätte die
  Datei nur neu geschrieben und dabei das Backup mit einer identischen Fassung
  überschrieben. Neue Einträge und betätigte Einstellungs-Schalter zählen als
  Änderung und lassen ihn durch.

### CSS-Kaskade

- **44 `!important` auf 1**, ohne einen berechneten Wert zu verändern.
  Verifiziert über 46 Zustände × 18 Eigenschaften, zweimal, ohne Abweichung.
  Hover ließ sich messen, indem `:hover` im Stylesheet durch eine Klasse ersetzt
  wurde: gleiche Spezifität, gleiche Kaskade.
- Kern war die Farbkaskade: `section .group` setzte `text-col` und zwang `.group`
  zu einem `!important`. Ohne diesen Selektor greift `.group` von selbst, und die
  Spezifität allein reicht: `section a` < `section:hover a` < `li a:hover`,
  `.name.active a` schlägt beide über die Klassenzahl.
- Mehrfach definierte Regeln zusammengeführt: `li a` (3×), `a.secname` (2×),
  `.group` (2×). Ihre Wirkung hing zuvor allein an der Reihenfolge im File.
- Die Media-Query-`!important` wurden einzeln geprüft, indem die Bedingung auf
  `all` gesetzt und mit und ohne gemessen wurde — `max-device-width` hängt an
  der physischen Bildschirmgröße und ist über die Fenstergröße nicht auslösbar.
  Sechs trugen nichts und sind entfernt. Übrig bleibt eines: `.group` muss in
  der iPhone-Hochformat-Regel `margin-inline: auto` überstimmen.
- `li { margin }` entfällt. Es hatte allein den Zweck, die iPad-Regel zu
  überstimmen; dort wirkt jetzt `margin: 2px` wie geschrieben — Kacheln mit
  Abstand, Section 20 px höher. Einzige gewollte Verhaltensänderung der
  Aufräumarbeit, alle anderen Profile bleiben identisch.
- **GitHub-Pages-Workflow entfernt.** `CNAME` ist weg, `a.msmr.co` zeigt auf
  netcup, Plesk zieht `main` selbst. Pages friert auf dem letzten Stand ein und
  kann in den Repo-Einstellungen abgeschaltet werden.

### Fallstricke, die aus dieser Sitzung bleiben

- `collectData()` liest den DOM zurück in JSON. Jedes Feld, das dabei nicht
  ausgelesen wird, ist nach dem ersten Speichern-Klick weg. Deshalb trägt das
  `<h3>` sowohl `data-icon` als auch `data-color`.
- `autocomplete="off"` am Section-Dropdown ist nötig: Chrome stellt sonst beim
  Reload die alte Auswahl wieder her und löst damit den Edit-Mode neu aus.
- Neue Dateien im Repo-Wurzelverzeichnis landen beim Deploy öffentlich in
  `httpdocs`, wenn sie nicht in der Bereitstellungsaktion stehen.
