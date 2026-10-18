# Structure and write protection

```
a.msmr.co/
├── index.html   styles.css   js/*.js    public
├── links.php                            public, serves the list
├── links.default.json                   seed, only on the very first request
├── never-dead.json                      addresses that never count as dead
├── apple-touch-icon.png                 copies of the home screen icon for iOS and other browsers
├── apple-touch-icon-precomposed.png
├── favicon/                             icons, manifest
└── edit/                                basic auth, completely closed
    ├── .htaccess
    ├── .htpasswd
    ├── links.json                       the database
    ├── links.bak.json                   backup of the last version
    ├── save.php
    └── check.php                        URL check (marks dead links)
```

## Local demo

For design work locally: `php -S 0.0.0.0:8080 tools/dev-router.php` in the project folder. The router serves everything with `no-store` and appends a version number to CSS and JS, so the browser never shows an old copy. It does not belong on the server.

## How the data flows

`js/boot.js` loads the list via `links.php`. The script reads `edit/links.json` and outputs it as JSON. If the file does not exist yet, it creates it from `links.default.json`.

Saving goes through `edit/save.php`, which writes into the same protected directory and first makes a backup to `links.bak.json`.

The advantage of this split: the database sits behind the sign-in and cannot be fetched from outside, delivery to the outside is done by a public script. `links.json` and `links.bak.json` are therefore in the `.gitignore` — the real data lives on the server, not in the repo.

## What protects write access

Only the basic auth in front of `/edit/`. Apache rejects unauthenticated requests before PHP starts — `save.php` is not even executed. There is no token any more; in a public JavaScript file it would have been ineffective anyway.

Edit mode in the browser is not protected: anyone who wants can unlock it via the console. That only changes the display in their own browser, nothing is saved without signing in.

## One-time sign-in per browser

`fetch()` does **not** trigger a sign-in dialog. A 401 only arrives in the page as an error message.

That is why you open `https://a.msmr.co/edit/` directly once per browser and sign in. After that the browser attaches the credentials automatically to all further requests of the same realm, including those of the scripts in `js/`.

If saving shows "Not signed in — open /edit/ once directly in the browser and sign in.", that is exactly the cause.

## Checking

- `https://a.msmr.co/edit/` → sign-in dialog. If none appears, the `.htaccess` is not being evaluated.
- After signing in, `https://a.msmr.co/edit/save.php` → `Method Not Allowed`. The message comes from `save.php` itself and proves that the sign-in is done.
- `https://a.msmr.co/edit/links.json` → must show the sign-in dialog, not the data.
- `https://a.msmr.co/links.php` → must deliver the list as JSON, without sign-in.

## URL check (dead links)

`https://a.msmr.co/edit/check.php` checks all URLs in `edit/links.json` and reports which ones are dead (404/410 or domain gone), unclear (401, 403, 429, 5xx: bot blocks and server moods) or skipped (own network, all IP addresses and the hosts in `never-dead.json`). Without parameters it only reports; `?write=1` writes `"dead": true` to the dead ones (and removes old marks) and saves the previous version as `links.bak.json`. It sits behind the same basic auth as `save.php`. It checks in parallel batches and prints its progress while it runs; a full run takes about a minute and a half. After the rename from `tot` to `dead` the page ignores old `"tot"` marks, so run it once with `?write=1`.

## Changing the password

The password file is in `edit/.htpasswd`, the path is in `edit/.htaccess`. Create a new password on the Mac and upload it:

```
/usr/sbin/htpasswd -B ~/.htpasswd YOURUSERNAME
```

`-B` forces bcrypt. Without `-c`, otherwise the file is overwritten instead of extended. The file must never go into the repo — it is in the `.gitignore`.

## Automatic deploy from GitHub

Plesk pulls `main` itself and puts the repo files into `httpdocs`. The live data survives that: `edit/links.json`, `edit/links.bak.json` and `edit/.htpasswd` are in the `.gitignore`, so they are not in the repo at all — Plesk only copies what is there and deletes nothing additional.

`edit/.htaccess` carries the real server path in the repo and is replaced by identical content.

So that documentation and project files do not end up publicly in the web directory, enter under **Additional deployment actions**:

```
rm -rf docs LICENSE CHANGELOG.md .github .gitignore
```

`edit` does **not** belong in this list. The GitHub Pages workflow removes it because no PHP runs there — on the real server it is the core of the application.

## Requirements

- Apache 2.4 with an evaluated `.htaccess`.
- HTTPS. Basic auth transmits the credentials only base64-encoded; over HTTP they could be read along on every request.
