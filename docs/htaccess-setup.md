# Aufbau und Schreibschutz

```
a.msmr.co/
├── index.html   app.js   styles.css     öffentlich
├── links.php                            öffentlich, liefert die Liste aus
├── links.default.json                   Saat, nur beim allerersten Aufruf
└── edit/                                Basic-Auth, komplett dicht
    ├── .htaccess
    ├── .htpasswd
    ├── links.json                       die Datenbank
    ├── links.bak.json                   Backup der letzten Fassung
    └── save.php
```

## Wie die Daten fließen

`app.js` lädt die Liste über `links.php`. Das Skript liest `edit/links.json` und gibt sie als JSON aus. Existiert die Datei noch nicht, legt es sie aus `links.default.json` an.

Gespeichert wird über `edit/save.php`, das in dasselbe geschützte Verzeichnis schreibt und vorher eine Sicherung nach `links.bak.json` legt.

Der Vorteil dieser Aufteilung: Die Datenbank liegt hinter der Anmeldung und ist von außen nicht abrufbar, die Auslieferung nach außen erledigt ein öffentliches Skript. `links.json` und `links.bak.json` stehen deshalb in der `.gitignore` — die echten Daten leben auf dem Server, nicht im Repo.

## Was den Schreibzugriff schützt

Ausschließlich die Basic-Auth vor `/edit/`. Apache lehnt unangemeldete Anfragen ab, bevor PHP startet — `save.php` wird gar nicht erst ausgeführt. Einen Token gibt es nicht mehr; er wäre in einer öffentlichen JavaScript-Datei ohnehin wirkungslos gewesen.

Nicht geschützt ist der Edit-Mode im Browser: Wer will, schaltet ihn über die Konsole frei. Das verändert nur die Anzeige im eigenen Browser, gespeichert wird ohne Anmeldung nichts.

## Einmalige Anmeldung pro Browser

`fetch()` löst **keinen** Anmeldedialog aus. Ein 401 kommt in der Seite nur als Fehlermeldung an.

Deshalb einmal pro Browser `https://a.msmr.co/edit/` direkt aufrufen und anmelden. Danach hängt der Browser die Zugangsdaten automatisch an alle weiteren Anfragen derselben Realm an, auch an die von `app.js`.

Erscheint beim Speichern „Nicht angemeldet — /edit/ einmal direkt im Browser aufrufen", ist genau das die Ursache.

## Prüfen

- `https://a.msmr.co/edit/` → Anmeldedialog. Kommt keiner, wird die `.htaccess` nicht ausgewertet.
- Nach der Anmeldung `https://a.msmr.co/edit/save.php` → `Method Not Allowed`. Die Meldung kommt aus `save.php` selbst und beweist, dass die Anmeldung durch ist.
- `https://a.msmr.co/edit/links.json` → muss den Anmeldedialog zeigen, nicht die Daten.
- `https://a.msmr.co/links.php` → muss die Liste als JSON liefern, ohne Anmeldung.

## Passwort ändern

Die Passwortdatei liegt in `edit/.htpasswd`, der Pfad steht in `edit/.htaccess`. Neues Passwort auf dem Mac erzeugen und hochladen:

```
/usr/sbin/htpasswd -B ~/.htpasswd DEINBENUTZERNAME
```

`-B` erzwingt bcrypt. Ohne `-c`, sonst wird die Datei überschrieben statt ergänzt. Die Datei darf nie ins Repo — sie steht in der `.gitignore`.

## Voraussetzungen

- Apache 2.4 mit ausgewertetem `.htaccess`.
- HTTPS. Basic-Auth überträgt die Zugangsdaten nur base64-kodiert; über HTTP wären sie bei jedem Aufruf mitlesbar.
