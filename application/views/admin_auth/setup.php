<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Setup Admin Race</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f2f4f7;font-family:Arial,sans-serif;color:#222;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.card{width:100%;max-width:480px;background:#fff;padding:28px;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.08)}h1{margin:0 0 8px;font-size:24px}.muted{color:#666;font-size:14px}label{display:block;margin:16px 0 6px;font-weight:bold}input{width:100%;padding:12px;border:1px solid #cbd0d8;border-radius:6px;font-size:15px}.btn{width:100%;padding:12px;margin-top:20px;background:#173b68;color:#fff;border:0;border-radius:6px;font-size:15px;cursor:pointer}.error{padding:10px;background:#fdecec;color:#8c1c1c;border-radius:6px}
</style>
</head>
<body><main class="card">
<h1>Setup Akun Admin</h1><p class="muted">Buat akun admin pertama. Halaman ini otomatis terkunci setelah akun pertama berhasil dibuat. Gunakan password minimal 12 karakter.</p>
<?php if (!empty($error)): ?><p class="error"><?= html_escape($error) ?></p><?php endif; ?>
<?php if (validation_errors()): ?><div class="error"><?= validation_errors() ?></div><?php endif; ?>
<?= form_open('admin/setup') ?>
<label for="display_name">Nama Admin</label><input id="display_name" name="display_name" type="text" maxlength="120" required value="<?= html_escape(set_value('display_name')) ?>">
<label for="username">Username</label><input id="username" name="username" type="text" minlength="4" maxlength="80" pattern="[A-Za-z0-9_-]+" autocomplete="username" required value="<?= html_escape(set_value('username')) ?>">
<label for="password">Password</label><input id="password" name="password" type="password" minlength="12" maxlength="200" autocomplete="new-password" required>
<label for="password_confirm">Konfirmasi Password</label><input id="password_confirm" name="password_confirm" type="password" minlength="12" maxlength="200" autocomplete="new-password" required>
<button class="btn" type="submit">Buat Akun Admin</button>
<?= form_close() ?>
</main></body></html>
