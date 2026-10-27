<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Admin Race</title>
<style>
body{font-family:Arial,sans-serif;margin:24px;color:#222}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{padding:10px;border:1px solid #ddd;text-align:left;vertical-align:top}th{background:#f4f4f4}.btn{display:inline-block;padding:7px 10px;border:1px solid #aaa;border-radius:4px;text-decoration:none;color:#222;background:#fafafa;cursor:pointer}form.inline{display:inline}.success{background:#e9f7ee;padding:10px}.error{background:#fdecec;padding:10px}.muted{color:#666;font-size:13px}
</style>
</head>
<body>
<h1>Data Race</h1>
<p>Login sebagai <strong><?= html_escape($this->session->userdata('admin_display_name')) ?></strong>
<form class="inline" method="post" action="<?= site_url('admin/logout') ?>" style="display:inline">
<input type="hidden" name="<?= $this->security->get_csrf_token_name() ?>" value="<?= $this->security->get_csrf_hash() ?>">
<button class="btn" type="submit">Logout</button>
</form></p>
<p>Admin cukup memasukkan nama race dan URL API. Slug dibuat otomatis, sedangkan interval sinkronisasi otomatis diatur oleh konfigurasi sistem.</p>
<?php if ($this->session->flashdata('success')): ?><p class="success"><?= html_escape($this->session->flashdata('success')) ?></p><?php endif; ?>
<?php if ($this->session->flashdata('error')): ?><p class="error"><?= html_escape($this->session->flashdata('error')) ?></p><?php endif; ?>
<p><a class="btn" href="<?= site_url('admin/races/create') ?>">+ Tambah Race / Import API</a></p>
<table>
<thead><tr><th>Race</th><th>API</th><th>Status Sinkronisasi</th><th>Status</th><th>Aksi</th></tr></thead>
<tbody>
<?php if (empty($races)): ?><tr><td colspan="5">Belum ada race.</td></tr><?php endif; ?>
<?php foreach ($races as $race): ?>
<tr>
<td><strong><?= html_escape($race->name) ?></strong><br><span class="muted">Slug: <?= html_escape($race->slug) ?></span><br><a href="<?= site_url('race/' . rawurlencode($race->slug)) ?>" target="_blank" rel="noopener">Lihat halaman hasil</a></td>
<td style="max-width:280px;overflow-wrap:anywhere"><?= html_escape($race->api_url) ?></td>
<td><?= html_escape($race->last_sync_status ? $race->last_sync_status : 'Belum pernah') ?><br><span class="muted"><?= html_escape($race->last_sync_at ? $race->last_sync_at : '-') ?></span><br><span class="muted"><?= html_escape($race->last_sync_message ? $race->last_sync_message : '') ?></span><br><span class="muted">Data diproses terakhir: <?= (int) $race->last_sync_count ?></span></td>
<td><?= $race->is_active ? 'Aktif' : 'Nonaktif' ?></td>
<td>
<a class="btn" href="<?= site_url('admin/races/edit/' . $race->id) ?>">Edit</a>
<form class="inline" method="post" action="<?= site_url('admin/races/sync/' . $race->id) ?>">
<input type="hidden" name="<?= $this->security->get_csrf_token_name() ?>" value="<?= $this->security->get_csrf_hash() ?>">
<button class="btn" type="submit">Import / Sinkronisasi</button>
</form>
<form class="inline" method="post" action="<?= site_url('admin/races/toggle/' . $race->id) ?>">
<input type="hidden" name="<?= $this->security->get_csrf_token_name() ?>" value="<?= $this->security->get_csrf_hash() ?>">
<button class="btn" type="submit"><?= $race->is_active ? 'Nonaktifkan' : 'Aktifkan' ?></button>
</form>
</td>
</tr>
<?php endforeach; ?>
</tbody>
</table>
</body>
</html>
