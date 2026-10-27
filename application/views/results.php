
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Race Results | Racetap</title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
          rel="stylesheet">

    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@400;500;600;700;800&display=swap"
          rel="stylesheet">

    <link rel="stylesheet"
          href="<?= base_url('assets/css/custom.css'); ?>">

    <link rel="stylesheet"
          href="<?= base_url('assets/css/race-results.css'); ?>">
</head>

<body>

<header class="results-header">
    <div class="container">
        <h1>Race Results</h1>
    </div>
</header>

<main class="container pb-5">
    <section class="results-card">

        <?php if (!empty($error)): ?>

            <div class="error-message">
                <strong>Data belum dapat ditampilkan.</strong>
                <div class="mt-1">
                    <?= html_escape($error); ?>
                </div>
            </div>

        <?php else: ?>

            <?php
            /*
             * Daftar kolom yang boleh ditampilkan.
             * Nama field disesuaikan dengan kemungkinan nama dari API.
             */
            $displayColumns = [
                'Category' => [
                    'category',
                    'race_category',
                    'racecategory'
                ],
                'BIB' => [
                    'bib',
                    'bib_number',
                    'bibnumber',
                    'bib_no',
                    'bibno'
                ],
                'Name' => [
                    'name',
                    'full_name',
                    'fullname',
                    'runner_name',
                    'runnername'
                ],
                'Gender' => [
                    'gender',
                    'sex'
                ],
                'Status' => [
                    'status',
                    'result_status',
                    'resultstatus'
                ],
                'Age Group' => [
                    'age_group',
                    'agegroup',
                    'category_age'
                ],
                'Gun Time' => [
                    'gun_time',
                    'guntime'
                ],
                'Net Time' => [
                    'net_time',
                    'nettime',
                    'chip_time',
                    'chiptime'
                ],
                'Overall Rank' => [
                    'overall_rank',
                    'overallrank',
                    'overall_position',
                    'overallposition'
                ],
                'Gender Rank' => [
                    'gender_rank',
                    'genderrank',
                    'gender_position',
                    'genderposition'
                ],
                'Age Rank' => [
                    'age_rank',
                    'agerank',
                    'age_position',
                    'ageposition'
                ]
            ];

            /*
             * Normalisasi nama field agar:
             * bib_number, bibNumber, dan BIB Number
             * dapat dicocokkan.
             */
            $normalizeKey = function ($key) {
                return strtolower(
                    preg_replace('/[^a-zA-Z0-9]/', '', (string) $key)
                );
            };

            /*
             * Mencari nama kolom aktual dari hasil flatten_row()
             * yang dibuat controller.
             */
            $actualColumns = [];

            foreach ($displayColumns as $label => $aliases) {
                $actualColumns[$label] = null;

                foreach ($aliases as $alias) {
                    foreach (($columns ?? []) as $column) {
                        if ($normalizeKey($column) === $normalizeKey($alias)) {
                            $actualColumns[$label] = $column;
                            break 2;
                        }
                    }
                }
            }

            /*
             * Mengambil nilai dari baris berdasarkan nama kolom aktual.
             */
            $getValue = function ($row, $label) use ($actualColumns) {
                $column = $actualColumns[$label] ?? null;

                if ($column !== null && array_key_exists($column, $row)) {
                    $value = $row[$column];

                    if (is_scalar($value)) {
                        return trim((string) $value) !== ''
                            ? (string) $value
                            : '-';
                    }
                }

                return '-';
            };

            /*
             * Parameter pagination.
             * Semua link menggunakan endpoint results yang sama.
             */
            $currentPage = max(1, (int) ($page ?? 1));
            $pageSize = max(1, (int) ($per_page ?? 25));
            $numberOfPages = max(1, (int) ($total_pages ?? 1));
            $totalParticipants = max(0, (int) ($total_count ?? 0));

            $currentPage = min($currentPage, $numberOfPages);

            $baseUrl = site_url('hasil');

            $queryParams = [
                'per_page' => $pageSize
            ];

            if (isset($selected_category) && $selected_category !== '') {
                $queryParams['category'] = $selected_category;
            }

            /*
             * Membuat URL pagination dengan parameter page.
             */
            $pageUrl = function ($targetPage) use ($baseUrl, $queryParams) {
                $params = $queryParams;
                $params['page'] = (int) $targetPage;

                return $baseUrl . '?' . http_build_query($params);
            };

            $firstNumber = $totalParticipants > 0
                ? (($currentPage - 1) * $pageSize) + 1
                : 0;

            $lastNumber = min(
                $currentPage * $pageSize,
                $totalParticipants
            );

            $startPage = max(1, $currentPage - 2);
            $endPage = min($numberOfPages, $currentPage + 2);
            ?>

            <!-- HEADER DAN FILTER -->
            <div class="results-toolbar">
                <div>
                    <h5 class="mb-1">Hasil Lomba</h5>

                    <div class="results-count">
                        Total peserta:
                        <?= number_format($totalParticipants, 0, ',', '.'); ?>

                        <?php if ($totalParticipants > 0): ?>
                            <br>
                            Menampilkan
                            <?= $firstNumber; ?>–<?= $lastNumber; ?>
                        <?php endif; ?>

                        <br>
                        Urutan: waktu tercepat
                    </div>
                </div>

                <div class="d-flex flex-wrap gap-2 align-items-center">

                    <form method="get"
                          action="<?= html_escape($baseUrl); ?>"
                          class="d-flex flex-wrap gap-2 align-items-center">

                        <select name="category"
                                class="form-select"
                                aria-label="Filter kategori"
                                onchange="this.form.submit()"
                                style="min-width: 170px;">

                            <option value="">Semua Kategori</option>

                            <?php foreach (($categories ?? []) as $category): ?>
                                <option
                                    value="<?= html_escape($category); ?>"
                                    <?= (isset($selected_category) &&
                                         $selected_category === $category)
                                            ? 'selected'
                                            : ''; ?>>

                                    <?= html_escape($category); ?>
                                </option>
                            <?php endforeach; ?>

                        </select>

                        <select name="per_page"
                                class="form-select"
                                aria-label="Jumlah peserta per halaman"
                                onchange="this.form.submit()"
                                style="width: 130px;">

                            <?php foreach ([25, 50, 100] as $limit): ?>
                                <option
                                    value="<?= $limit; ?>"
                                    <?= $pageSize === $limit ? 'selected' : ''; ?>>

                                    <?= $limit; ?> / halaman
                                </option>
                            <?php endforeach; ?>

                        </select>

                    </form>

                    <input
                        type="search"
                        id="searchResults"
                        class="form-control search-input"
                        placeholder="Cari di halaman ini..."
                        aria-label="Cari hasil lomba">

                </div>
            </div>

            <!-- TABEL HASIL LOMBA -->
            <?php if (!empty($results)): ?>

                <div class="table-responsive">
                    <table class="table table-hover" id="resultsTable">

                        <thead>
                            <tr>
                                <?php foreach ($displayColumns as $label => $aliases): ?>
                                    <th><?= html_escape($label); ?></th>
                                <?php endforeach; ?>
                            </tr>
                        </thead>

                        <tbody>
                            <?php foreach ($results as $result): ?>
                                <tr>
                                    <?php foreach ($displayColumns as $label => $aliases): ?>
                                        <?php $value = $getValue($result, $label); ?>

                                        <td>
                                            <?php if ($label === 'Name' && $value !== '-'): ?>

                                                <a href="<?= html_escape(
                                                    site_url('results/detail/' .
                                                    (int) ($result['_index'] ?? 0))
                                                ); ?>"
                                                   class="runner-name">
                                                    <?= html_escape($value); ?>
                                                </a>

                                            <?php else: ?>

                                                <?= html_escape($value); ?>

                                            <?php endif; ?>
                                        </td>
                                    <?php endforeach; ?>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>

                    </table>
                </div>

                <div id="noSearchResults" class="empty-message d-none">
                    Data yang dicari tidak ditemukan.
                </div>

                <!-- PAGINATION -->
                <?php if ($numberOfPages > 1): ?>

                    <nav class="mt-4"
                         aria-label="Navigasi halaman hasil lomba">

                        <ul class="pagination justify-content-center flex-wrap">

                            <!-- Tombol sebelumnya -->
                            <li class="page-item <?= $currentPage <= 1 ? 'disabled' : ''; ?>">
                                <?php if ($currentPage > 1): ?>
                                    <a class="page-link"
                                       href="<?= html_escape(
                                           $pageUrl($currentPage - 1)
                                       ); ?>"
                                       aria-label="Halaman sebelumnya">
                                        &laquo;
                                    </a>
                                <?php else: ?>
                                    <span class="page-link">&laquo;</span>
                                <?php endif; ?>
                            </li>

                            <!-- Halaman pertama -->
                            <?php if ($startPage > 1): ?>
                                <li class="page-item">
                                    <a class="page-link"
                                       href="<?= html_escape($pageUrl(1)); ?>">
                                        1
                                    </a>
                                </li>

                                <?php if ($startPage > 2): ?>
                                    <li class="page-item disabled">
                                        <span class="page-link">...</span>
                                    </li>
                                <?php endif; ?>
                            <?php endif; ?>

                            <!-- Nomor halaman -->
                            <?php for (
                                $i = $startPage;
                                $i <= $endPage;
                                $i++
                            ): ?>

                                <li class="page-item <?= $i === $currentPage ? 'active' : ''; ?>">
                                    <a class="page-link"
                                       href="<?= html_escape($pageUrl($i)); ?>"
                                       <?= $i === $currentPage
                                            ? 'aria-current="page"'
                                            : ''; ?>>
                                        <?= $i; ?>
                                    </a>
                                </li>

                            <?php endfor; ?>

                            <!-- Halaman terakhir -->
                            <?php if ($endPage < $numberOfPages): ?>

                                <?php if ($endPage < $numberOfPages - 1): ?>
                                    <li class="page-item disabled">
                                        <span class="page-link">...</span>
                                    </li>
                                <?php endif; ?>

                                <li class="page-item">
                                    <a class="page-link"
                                       href="<?= html_escape(
                                           $pageUrl($numberOfPages)
                                       ); ?>">
                                        <?= $numberOfPages; ?>
                                    </a>
                                </li>

                            <?php endif; ?>

                            <!-- Tombol berikutnya -->
                            <li class="page-item <?= $currentPage >= $numberOfPages ? 'disabled' : ''; ?>">
                                <?php if ($currentPage < $numberOfPages): ?>
                                    <a class="page-link"
                                       href="<?= html_escape(
                                           $pageUrl($currentPage + 1)
                                       ); ?>"
                                       aria-label="Halaman berikutnya">
                                        &raquo;
                                    </a>
                                <?php else: ?>
                                    <span class="page-link">&raquo;</span>
                                <?php endif; ?>
                            </li>

                        </ul>
                    </nav>

                <?php endif; ?>

            <?php else: ?>

                <div class="empty-message">
                    <?php if (
                        $totalParticipants === 0 &&
                        !empty($selected_category)
                    ): ?>
                        Tidak ada peserta pada kategori yang dipilih.
                    <?php else: ?>
                        Belum ada data hasil lomba yang dapat ditampilkan.
                    <?php endif; ?>
                </div>

            <?php endif; ?>

        <?php endif; ?>

    </section>

    <div class="text-center mt-4 results-footer">
        Race timing &amp; results by Racetap
    </div>
</main>

<script>
document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('searchResults');
    const table = document.getElementById('resultsTable');
    const noResults = document.getElementById('noSearchResults');

    if (!searchInput || !table) {
        return;
    }

    searchInput.addEventListener('input', function () {
        const keyword = this.value.toLowerCase().trim();
        const rows = table.querySelectorAll('tbody tr');
        let visibleCount = 0;

        rows.forEach(function (row) {
            const text = row.textContent.toLowerCase();
            const visible = text.includes(keyword);

            row.style.display = visible ? '' : 'none';

            if (visible) {
                visibleCount++;
            }
        });

        if (noResults) {
            noResults.classList.toggle(
                'd-none',
                visibleCount !== 0
            );
        }
    });
});
</script>

</body>
</html>
