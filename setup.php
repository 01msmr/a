<?php
$htpasswd = __DIR__ . '/edit/.htpasswd';
$msg = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user = trim($_POST['user'] ?? '');
    $pass = $_POST['pass'] ?? '';
    if ($user && $pass) {
        $hash = password_hash($pass, PASSWORD_BCRYPT);
        if (file_put_contents($htpasswd, "$user:$hash\n") !== false) {
            $msg = '<p style="color:green">✓ .htpasswd erstellt. Diese Datei jetzt löschen!</p>';
        } else {
            $msg = '<p style="color:red">Fehler: Datei konnte nicht geschrieben werden.</p>';
        }
    }
}
?><!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Setup</title></head><body>
<h3>htpasswd einrichten</h3>
<?= $msg ?>
<form method="post">
  <input name="user" placeholder="Benutzername" required><br><br>
  <input name="pass" type="password" placeholder="Passwort" required><br><br>
  <button type="submit">Erstellen</button>
</form>
</body></html>
