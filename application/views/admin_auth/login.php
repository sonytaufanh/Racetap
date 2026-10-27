<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Login Admin Race</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f2f4f7;font-family:Arial,sans-serif;color:#222;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.card{width:100%;max-width:420px;background:#fff;padding:28px;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.08)}h1{margin:0 0 8px;font-size:24px}.muted{color:#666;font-size:14px}label{display:block;margin:16px 0 6px;font-weight:bold}input{width:100%;padding:12px;border:1px solid #cbd0d8;border-radius:6px;font-size:15px}.btn{width:100%;padding:12px;margin-top:20px;background:#173b68;color:#fff;border:0;border-radius:6px;font-size:15px;cursor:pointer}.error{padding:10px;background:#fdecec;color:#8c1c1c;border-radius:6px}.success{padding:10px;background:#e9f7ee;color:#176b35;border-radius:6px}
</style>
</head>
<body><main class="card">
<h1>Login Admin</h1><p class="muted">Sistem pengelolaan race dan sinkronisasi hasil peserta.</p>
<?php if (!empty($error)): ?><p class="error"><?= html_escape($error) ?></p><?php endif; ?>
<?php if ($this->session->flashdata('success')): ?><p class="success"><?= html_escape($this->session->flashdata('success')) ?></p><?php endif; ?>
<?php if (validation_errors()): ?><div class="error"><?= validation_errors() ?></div><?php endif; ?>
<?= form_open('admin/login') ?>
<label for="username">Username</label><input id="username" name="username" type="text" maxlength="80" autocomplete="username" required value="<?= html_escape(set_value('username')) ?>">
<label for="password">Password</label><input id="password" name="password" type="password" maxlength="200" autocomplete="current-password" required>
<button class="btn" type="submit">Masuk</button>
<?= form_close() ?>
</main></body></html>
