<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hasil <?= html_escape($race->name) ?></title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{font-family:Arial,sans-serif;margin:20px;color:#222}h1{margin-bottom:4px}.muted{color:#666;font-size:13px}.filters{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}.filters input,.filters select{padding:9px;border:1px solid #bbb;border-radius:4px}table{border-collapse:collapse;width:100%;font-size:14px}th,td{padding:9px;border-bottom:1px solid #ddd;text-align:left}th{background:#f3f3f3}.pagination a,.pagination strong{display:inline-block;padding:7px 10px;margin:3px;border:1px solid #ccc;text-decoration:none;color:#222}.name-link{border:0;background:none;padding:0;color:#075db5;text-decoration:underline;cursor:pointer;font:inherit}.modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);padding:8vh 15px;overflow:auto}.modal-card{background:white;max-width:560px;margin:auto;padding:20px;border-radius:8px}.close{float:right;cursor:pointer;font-size:22px}.detail-row{padding:8px 0;border-bottom:1px solid #eee}.empty{padding:20px;background:#f7f7f7}
</style>
</head>
<body>
<h1><?= html_escape($race->name) ?></h1>
<p class="muted">Data hasil lomba dari database lokal. Terakhir sinkronisasi: <?= html_escape($race->last_sync_at ? $race->last_sync_at : 'belum tersedia') ?></p>
<form class="filters" method="get" action="<?= site_url('race/' . rawurlencode($race->slug)) ?>">
<input type="search" name="q" value="<?= html_escape($q) ?>" placeholder="Cari nama atau BIB">
<select name="category"><option value="">Semua kategori</option><?php foreach ($categories as $cat): ?><option value="<?= html_escape($cat->category) ?>" <?= $category === $cat->category ? 'selected' : '' ?>><?= html_escape($cat->category) ?></option><?php endforeach; ?></select>
<button type="submit">Cari</button>
</form>
<p class="muted"><?= number_format((int) $total) ?> peserta</p>
<?php if (empty($results)): ?><div class="empty">Data peserta belum tersedia atau tidak ditemukan.</div><?php else: ?>
<div style="overflow-x:auto"><table>
<thead><tr><th>Kategori</th><th>BIB</th><th>Nama</th><th>Gender</th><th>Age Group</th><th>Gun Time</th><th>Net Time</th><th>Overall</th><th>Gender</th><th>Age Rank</th><th>Status</th></tr></thead>
<tbody><?php foreach ($results as $r): ?>
<tr>
<td><?= html_escape($r->category) ?></td><td><?= html_escape($r->bib) ?></td>
<td><button class="name-link" type="button" onclick='showDetail(<?= json_encode(array("category"=>$r->category,"bib"=>$r->bib,"name"=>$r->name,"gender"=>$r->gender,"age_group"=>$r->age_group,"gun_time"=>$r->gun_time,"net_time"=>$r->net_time,"overall_rank"=>$r->overall_rank,"gender_rank"=>$r->gender_rank,"age_rank"=>$r->age_rank,"status"=>$r->status), JSON_HEX_TAG|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_HEX_AMP) ?>)'><?= html_escape($r->name) ?></button></td>
<td><?= html_escape($r->gender) ?></td><td><?= html_escape($r->age_group) ?></td><td><?= html_escape($r->gun_time) ?></td><td><?= html_escape($r->net_time) ?></td><td><?= html_escape($r->overall_rank) ?></td><td><?= html_escape($r->gender_rank) ?></td><td><?= html_escape($r->age_rank) ?></td><td><?= html_escape($r->status) ?></td>
</tr>
<?php endforeach; ?></tbody></table></div>
<?= $pagination ?>
<?php endif; ?>
<div id="detailModal" class="modal" onclick="if(event.target===this)closeDetail()"><div class="modal-card"><span class="close" onclick="closeDetail()">&times;</span><h2 id="detailTitle">Detail Peserta</h2><div id="detailContent"></div></div></div>
<script>
function showDetail(data){
 document.getElementById('detailTitle').textContent=data.name||'Detail Peserta';
 var labels={category:'Kategori',bib:'BIB',gender:'Gender',age_group:'Age Group',gun_time:'Gun Time',net_time:'Net Time',overall_rank:'Overall Rank',gender_rank:'Gender Rank',age_rank:'Age Rank',status:'Status'};
 var content=document.getElementById('detailContent'); content.innerHTML='';
 Object.keys(labels).forEach(function(key){
  var row=document.createElement('div'); row.className='detail-row';
  var strong=document.createElement('strong'); strong.textContent=labels[key]+': ';
  row.appendChild(strong); row.appendChild(document.createTextNode(data[key]===null||data[key]===''?'—':String(data[key])));
  content.appendChild(row);
 });
 document.getElementById('detailModal').style.display='block';
}
function closeDetail(){document.getElementById('detailModal').style.display='none';}
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeDetail();});
</script>
</body>
</html>
