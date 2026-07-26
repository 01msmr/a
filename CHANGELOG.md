# Änderungen

Neueste zuerst. Eine Überschrift pro Arbeitssitzung. Ältere Stände stehen im
`git log`; hier beginnt die Aufzeichnung mit der Sitzung vom 25./26. Juli 2026.

---

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
