<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= isset($race) && $race ? 'Edit' : 'Tambah' ?> Race</title>
<style>
body{font-family:Arial,sans-serif;margin:24px;max-width:760px;color:#222}label{display:block;font-weight:bold;margin:18px 0 6px}input[type=text],input[type=url]{box-sizing:border-box;width:100%;padding:10px;border:1px solid #bbb;border-radius:4px}.btn{display:inline-block;padding:9px 13px;border:1px solid #aaa;border-radius:4px;text-decoration:none;color:#222;background:#fafafa;cursor:pointer;margin-top:18px}.error{background:#fdecec;padding:10px}
</style>
</head>
<body>
<h1><?= isset($race) && $race ? 'Edit Race' : 'Tambah Race' ?></h1>
<p>Isi dua kolom berikut. Slug halaman hasil dibuat otomatis oleh sistem.</p>
<?php if (validation_errors()): ?><div class="error"><?= validation_errors() ?></div><?php endif; ?>
<?php if (!empty($error)): ?><div class="error"><?= html_escape($error) ?></div><?php endif; ?>
<?= form_open(current_url()) ?>
<label for="name">Nama Race</label>
<input type="text" id="name" name="name" maxlength="190" required value="<?= html_escape(set_value('name', isset($race) && $race ? $race->name : '')) ?>" placeholder="Contoh: UKSW Salatiga 10K">
<label for="api_url">URL API Feibot</label>
<input type="url" id="api_url" name="api_url" maxlength="1000" required value="<?= html_escape(set_value('api_url', isset($race) && $race ? $race->api_url : '')) ?>" placeholder="https://time.feibot.com/api/runner-scores/uyQJeG7H9S">
<p class="muted">Setelah disimpan, buka daftar race lalu tekan “Import / Sinkronisasi” untuk menarik data peserta ke database lokal.</p>
<button class="btn" type="submit">Simpan Race</button>
<a class="btn" href="<?= site_url('admin/races') ?>">Batal</a>
<?= form_close() ?>
</body>
</html>
