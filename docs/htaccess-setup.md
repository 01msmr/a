# Schreibzugriff absichern (Basic-Auth vor /edit/)

Ziel: Das Verzeichnis `/edit/` ist nur nach Anmeldung erreichbar. Die Seite selbst bleibt öffentlich.

```
a.msmr.co/
├── index.html      öffentlich
├── app.js          öffentlich
├── links.json      öffentlich
└── edit/           ← geschützt
    ├── .htaccess
    ├── save.php
    └── config.php
```

`save.php` schreibt eine Ebene höher nach `links.json` und legt das Backup daneben. `config.php` mit dem Token liegt im geschützten Verzeichnis und ist damit doppelt abgeschirmt.

Die Passwortdatei gehört **nicht** ins Repo — `.htpasswd` steht in `.gitignore`.

## Weg A — netcup-Panel (empfohlen)

Im Webhosting-Controlpanel den **Verzeichnisschutz** für `/edit/` einrichten. Das Panel legt `.htaccess` und Passwortdatei selbst an, mit korrektem Pfad und gehashtem Passwort.

Die mitgelieferte `edit/.htaccess` dann **nicht** hochladen, sonst überschreibt sie die des Panels.

Vorteil: keine Pfadsuche, keine Kommandozeile. Deshalb liegt `save.php` überhaupt in einem eigenen Verzeichnis — Verzeichnisschutz greift immer auf Ordner, nie auf einzelne Dateien.

## Weg B — von Hand

**1. Absoluten Pfad ermitteln.** Einmalig `pfad.php` ins Webverzeichnis legen:

```php
<?php echo __DIR__;
```

Aufrufen, Pfad notieren, **Datei löschen**. Ergibt sie etwa `/var/www/vhosts/msmr.co/a.msmr.co`, gehört die Passwortdatei nach `/var/www/vhosts/msmr.co` — außerhalb des Webverzeichnisses.

**2. Passwortdatei erzeugen.** Auf dem Mac:

```
/usr/sbin/htpasswd -B -c ~/.htpasswd DEINBENUTZERNAME
```

`-B` erzwingt bcrypt, `-c` legt neu an. Das Passwort wird interaktiv abgefragt und landet nicht in der Shell-History. Datei ins Elternverzeichnis hochladen.

**3. Pfad eintragen.** In `edit/.htaccess` die Zeile `AuthUserFile /PFAD/ZUM/ELTERNVERZEICHNIS/.htpasswd` durch den echten Pfad ersetzen, dann hochladen.

## Prüfen

`https://a.msmr.co/edit/` im Browser aufrufen:

- **Anmeldedialog erscheint** → Schutz greift.
- **Kein Dialog, Verzeichnis wird angezeigt** → `.htaccess` wird nicht ausgewertet oder der Pfad stimmt nicht.
- **500er** → fast immer ein falscher Pfad in `AuthUserFile`.

Nach der Anmeldung `https://a.msmr.co/edit/save.php` aufrufen: Es muss `Method Not Allowed` erscheinen. Die Meldung kommt aus `save.php` selbst, weil ein GET ankam — sie beweist, dass die Anmeldung durch ist.

Danach die Startseite laden und einmal speichern.

## Wichtig zum Ablauf

`fetch()` löst **keinen** Anmeldedialog aus. Ein 401 kommt in der Seite nur als Fehlermeldung an. Deshalb gilt pro Browser einmal: `/edit/` direkt aufrufen und anmelden. Danach hängt der Browser die Zugangsdaten automatisch an alle weiteren Anfragen derselben Realm an, auch an die von `app.js`.

Erscheint beim Speichern „Nicht angemeldet", ist genau das die Ursache.

## Was das schützt — und was nicht

Geschützt ist das Schreiben. Apache lehnt unangemeldete Anfragen ab, bevor PHP startet; `save.php` wird gar nicht erst ausgeführt.

Nicht geschützt ist der Edit-Mode im Browser: Wer will, schaltet ihn über die Konsole frei. Das verändert nur die Anzeige im eigenen Browser, gespeichert wird ohne Anmeldung nichts.

Der Token-Vergleich in `save.php` bleibt als zweite Ebene bestehen. Dass derselbe Token in `app.js` steht, ist damit nicht mehr kritisch — ohne Anmeldung erreicht niemand das Skript.

## Voraussetzungen

- Apache 2.4 mit ausgewertetem `.htaccess`.
- HTTPS. Basic-Auth überträgt die Zugangsdaten nur base64-kodiert; über HTTP wären sie bei jedem Aufruf mitlesbar.
