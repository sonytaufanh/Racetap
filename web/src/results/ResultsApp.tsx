import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  COLUMNS,
  DEFAULT_COLUMNS,
  certLink,
  rankText
} from './columns';
import {
  EMPTY_FILTERS,
  distanceLabel,
  filterParticipants,
  pageWindow,
  parseScoresData,
  showTime,
  sortParticipants
} from './model';
import type {
  ColumnKey,
  EventConfig,
  Participant,
  ResultsPayload,
  ScoresData,
  SortState
} from './types';
import type { Filters } from './model';

interface Props {
  payload: ResultsPayload;
}

const DEFAULT_HIDDEN_640: ColumnKey[] = ['ageGroup', 'ageRank'];
const DEFAULT_HIDDEN_480: ColumnKey[] = ['cert', 'genderRank', 'ageRank'];

function hiddenClasses(key: ColumnKey, config: EventConfig): string {
  const hide640 = config.hiddenBelow640 ?? DEFAULT_HIDDEN_640;
  const hide480 = config.hiddenBelow480 ?? DEFAULT_HIDDEN_480;
  const classes: string[] = [];

  if (hide640.includes(key)) classes.push('rt-hide-sm');
  if (hide480.includes(key)) classes.push('rt-hide-xs');

  return classes.join(' ');
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value !== ''))).sort();
}

function resolveAsset(assetBase: string, value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value) || value.startsWith('/')) {
    return value;
  }

  return `${assetBase}${value.replace(/^\.\//, '')}`;
}

export default function ResultsApp({ payload }: Props) {
  const { config } = payload;
  const [data, setData] = useState<ReturnType<typeof parseScoresData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortState | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Participant | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const floatRef = useRef<HTMLDivElement | null>(null);
  const floatInnerRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);

  const pageSize = config.pageSize ?? 100;
  const columns = useMemo<ColumnKey[]>(() => config.columns ?? DEFAULT_COLUMNS, [config.columns]);
  const activeFilters = useMemo(
    () => config.filters ?? ['item', 'gender', 'ageGroup'],
    [config.filters]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(payload.dataUrl, { credentials: 'same-origin' });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = (await response.json()) as ScoresData;
      setData(parseScoresData(json));
    } catch (cause) {
      setData(null);
      setError(cause instanceof Error ? cause.message : 'Failed to load results.');
    } finally {
      setLoading(false);
    }
  }, [payload.dataUrl]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data) return;

    const title = data.raceTitle || config.title || config.slug;
    document.title = config.metaTitle ?? `Hasil Lomba ${title} | RaceTap`;
  }, [data, config.slug, config.title, config.metaTitle]);

  useEffect(() => {
    if (!selected) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null);
    };

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [selected]);

  const syncScroll = useCallback(() => {
    const wrapper = wrapperRef.current;
    const floating = floatRef.current;
    const inner = floatInnerRef.current;
    const table = tableRef.current;

    if (!wrapper || !floating || !inner || !table) return;

    inner.style.width = `${table.offsetWidth}px`;
    floating.scrollLeft = wrapper.scrollLeft;
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const wrapper = wrapperRef.current;
      const floating = floatRef.current;

      if (wrapper && floating) floating.scrollLeft = wrapper.scrollLeft;
    };

    const onFloatScroll = () => {
      const wrapper = wrapperRef.current;
      const floating = floatRef.current;

      if (wrapper && floating) wrapper.scrollLeft = floating.scrollLeft;
    };

    const wrapper = wrapperRef.current;
    const floating = floatRef.current;

    wrapper?.addEventListener('scroll', onScroll);
    floating?.addEventListener('scroll', onFloatScroll);
    window.addEventListener('resize', syncScroll);
    syncScroll();

    return () => {
      wrapper?.removeEventListener('scroll', onScroll);
      floating?.removeEventListener('scroll', onFloatScroll);
      window.removeEventListener('resize', syncScroll);
    };
  }, [syncScroll, data, page, filters, sort, columns]);

  useEffect(() => {
    syncScroll();
  }, [syncScroll, data, page, filters, sort, columns]);

  const itemOptions = useMemo(() => {
    const fromData = data ? uniqueSorted(data.participants.map((p) => p.itemName)) : [];

    return fromData;
  }, [data]);

  const ageOptions = useMemo(
    () => (data ? uniqueSorted(data.participants.map((p) => p.ageGroup)) : []),
    [data]
  );

  const age2Options = useMemo(
    () => (data ? uniqueSorted(data.participants.map((p) => p.ageGroup2)) : []),
    [data]
  );

  const filtered = useMemo(() => {
    if (!data) return [];

    return sortParticipants(filterParticipants(data.participants, filters), sort);
  }, [data, filters, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);
  const showingEnd = Math.min(start + pageSize, filtered.length);

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
    setPage(1);
  };

  const toggleSort = (key: ColumnKey) => {
    const definition = COLUMNS[key];

    if (!definition.sortable) return;

    setSort((previous) => {
      if (previous && previous.key === key) {
        return { key, dir: previous.dir === 'asc' ? 'desc' : 'asc' };
      }

      return { key, dir: 'asc' };
    });
    setPage(1);
  };

  const banner = resolveAsset(payload.assetBase, config.banner);
  const distance = data ? distanceLabel(data.items, config) : config.distanceOverride ?? '-';
  const title = data?.raceTitle || config.title || config.slug;

  if (config.maintenance) {
    return (
      <div className="rt-results">
        {banner ? (
          <div className="banner">
            <img src={banner} alt={config.bannerAlt ?? `Header Hasil Lomba ${title}`} />
          </div>
        ) : null}
        <header className="hero">
          <div className="hero-bg" />
          <div className="hero-content">
            <div className="hero-badge">LIVE RESULTS</div>
            <h1>{title}</h1>
            <p className="hero-date">{data?.raceDate ?? ''}</p>
          </div>
        </header>
        <main className="main-content">
          <div className="table-wrapper" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <p style={{ fontWeight: 600, fontSize: '1rem' }}>
              {config.maintenanceMessage ??
                'Data hasil masih dalam proses pembaruan, Silakan periksa kembali beberapa saat lagi.'}
            </p>
          </div>
        </main>
        <footer className="footer">
          <p>
            Powered by <strong>racetap.id</strong> &mdash; {title}
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="rt-results">
      {banner ? (
        <div className="banner">
          <img src={banner} alt={config.bannerAlt ?? `Header Hasil Lomba ${title}`} loading="lazy" />
        </div>
      ) : null}

      <header className="hero">
        <div className="hero-bg" />
        <div className="hero-content">
          <div className="hero-badge">LIVE RESULTS</div>
          <h1>{title}</h1>
          <p className="hero-date">{data?.raceDate ?? ''}</p>
          <div className="hero-stats">
            <div className="stat-card">
              <span className="stat-number">{data?.participants.length ?? 0}</span>
              <span className="stat-label">Participants</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{data?.categories ?? 0}</span>
              <span className="stat-label">Categories</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{distance}</span>
              <span className="stat-label">Distance</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{data?.finishers ?? 0}</span>
              <span className="stat-label">Finishers</span>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="controls-bar">
          <div className="search-box">
            <i className="fas fa-search" />
            <input
              type="text"
              placeholder="Search name or bib..."
              autoComplete="off"
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
            />
          </div>
          <div className="filter-group">
            {activeFilters.includes('item') ? (
              <select value={filters.item} onChange={(event) => updateFilter('item', event.target.value)}>
                <option value="">All Distances</option>
                {itemOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            ) : null}
            {activeFilters.includes('gender') ? (
              <select value={filters.gender} onChange={(event) => updateFilter('gender', event.target.value)}>
                <option value="">All Genders</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            ) : null}
            {activeFilters.includes('ageGroup') ? (
              <select
                value={filters.ageGroup}
                onChange={(event) => updateFilter('ageGroup', event.target.value)}
              >
                <option value="">Age Group</option>
                {ageOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            ) : null}
            {activeFilters.includes('ageGroup2') ? (
              <select
                value={filters.ageGroup2}
                onChange={(event) => updateFilter('ageGroup2', event.target.value)}
              >
                <option value="">Age Group 2</option>
                {age2Options.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loader" />
            <p>Loading results...</p>
          </div>
        ) : null}

        {!loading && error !== '' ? (
          <div className="error-state">
            <i className="fas fa-exclamation-triangle" />
            <p>Failed to load results.</p>
            <button className="btn-retry" type="button" onClick={() => void load()}>
              Retry
            </button>
          </div>
        ) : null}

        {!loading && error === '' && data ? (
          <div>
            <div className="table-wrapper" ref={wrapperRef}>
              <table id="participantsTable" ref={tableRef}>
                <thead>
                  <tr>
                    {columns.map((key) => {
                      const definition = COLUMNS[key];
                      const active = sort && sort.key === key;
                      const icon = active ? `fa-sort-${sort.dir === 'asc' ? 'up' : 'down'}` : 'fa-sort';

                      return (
                        <th
                          key={key}
                          className={[
                            definition.sortable ? 'sortable' : '',
                            hiddenClasses(key, config)
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={definition.sortable ? () => toggleSort(key) : undefined}
                          scope="col"
                        >
                          {definition.label}
                          {definition.sortable ? <i className={`fas ${icon}`} /> : null}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} onClick={() => setSelected(row)}>
                      {columns.map((key) => {
                        const hidden = hiddenClasses(key, config);

                        return (
                          <td key={key} className={hidden || undefined}>
                            {renderCell(row, key)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="floating-scroll" ref={floatRef}>
              <div ref={floatInnerRef} />
            </div>

            <div
              className="table-footer"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <span>
                {filtered.length > 0
                  ? `Showing ${start + 1}-${showingEnd} of ${filtered.length}`
                  : 'Showing 0 of 0'}
              </span>
              <div className="pagination">
                {filtered.length > 0 ? (
                  <>
                    <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                      &laquo;
                    </button>
                    {pageWindow(currentPage, totalPages)[0] > 1 ? (
                      <>
                        <button type="button" onClick={() => setPage(1)}>
                          1
                        </button>
                        {pageWindow(currentPage, totalPages)[0] > 2 ? (
                          <span className="page-info">...</span>
                        ) : null}
                      </>
                    ) : null}
                    {pageWindow(currentPage, totalPages).map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={value === currentPage ? 'active' : undefined}
                        onClick={() => setPage(value)}
                      >
                        {value}
                      </button>
                    ))}
                    {pageWindow(currentPage, totalPages).slice(-1)[0] < totalPages ? (
                      <>
                        {pageWindow(currentPage, totalPages).slice(-1)[0] < totalPages - 1 ? (
                          <span className="page-info">...</span>
                        ) : null}
                        <button type="button" onClick={() => setPage(totalPages)}>
                          {totalPages}
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      &raquo;
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </main>

      <footer className="footer">
        <p>
          Powered by <strong>racetap.id</strong> &mdash; {title}
        </p>
      </footer>

      {selected ? (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setSelected(null)}>
              <i className="fas fa-times" />
            </button>
            <ParticipantModal participant={selected} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function renderCell(participant: Participant, key: ColumnKey) {
  switch (key) {
    case 'item':
      return participant.itemName;
    case 'bib':
      return participant.bib;
    case 'name':
      return (
        <a
          href={certLink(participant.id)}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit', textDecoration: 'none' }}
          onClick={(event) => event.stopPropagation()}
        >
          {participant.name}
        </a>
      );
    case 'cert':
      return (
        <a
          href={certLink(participant.id)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          <i className="fas fa-certificate" style={{ color: 'var(--primary)', fontSize: '1.1rem' }} />
        </a>
      );
    case 'gender':
      return (
        <span className={`gender-badge ${participant.sex === 'F' ? 'female' : 'male'}`}>
          <i className={`fas fa-${participant.sex === 'F' ? 'venus' : 'mars'}`} /> {participant.genderLabel}
        </span>
      );
    case 'ageGroup':
      return participant.ageGroup || '-';
    case 'ageGroup2':
      return participant.ageGroup2 || '-';
    case 'gunTime':
      return showTime(participant.totalScore);
    case 'netTime':
      return showTime(participant.netScore);
    case 'overallRank':
      return rankText(participant.itemNetRank);
    case 'genderRank':
      return rankText(participant.netRanking);
    case 'ageRank':
      return rankText(participant.ageNetRank);
    case 'age2Rank':
      return rankText(participant.age2NetRank);
    case 'status':
      return (
        <span className={`status-badge ${participant.status.tone}`}>
          <i className={`fas fa-${participant.finisher === 1 ? 'check-circle' : 'times-circle'}`} />{' '}
          {participant.status.label}
        </span>
      );
    default:
      return null;
  }
}

function ParticipantModal({ participant }: { participant: Participant }) {
  const rank = participant.itemNetRank;

  return (
    <>
      <div className="modal-header">
        <div className="modal-header-content">
          <div className="modal-rank-badge">
            <i className="fas fa-trophy" /> {rank === null ? '-' : `#${rank}`} Overall
          </div>
          <div className="modal-name">{participant.name}</div>
        </div>
      </div>
      <div className="modal-body">
        <div className="modal-info-grid">
          <Info label="Bib" value={participant.bib} />
          <Info label="Gender" value={participant.genderLabel} />
          <Info label="Distance" value={participant.itemName} />
          <Info label="Status" value={participant.status.label} />
          <Info label="Age Group" value={participant.ageGroup} />
          {participant.ageGroup2 ? <Info label="Age Grp 2" value={participant.ageGroup2} /> : null}
          {participant.team ? <Info label="Team" value={participant.team} /> : null}
          {participant.city ? <Info label="City" value={participant.city} /> : null}
        </div>

        <div className="modal-section-title">Timing</div>
        <div className="modal-time-grid">
          <TimeItem label="Net Time" value={showTime(participant.netScore)} />
          <TimeItem label="Gun Time" value={showTime(participant.totalScore)} />
          <TimeItem label="Start Time" value={showTime(participant.startTime)} />
          <TimeItem label="Pace" value={participant.pace || '-'} />
          {participant.cp1 ? <TimeItem label="CP1" value={participant.cp1} /> : null}
          {participant.cp2 ? <TimeItem label="CP2" value={participant.cp2} /> : null}
          {participant.cp1Cp2 ? <TimeItem label="CP1 - CP2" value={participant.cp1Cp2} /> : null}
        </div>

        <div className="modal-section-title">Rankings</div>
        <div className="modal-time-grid">
          <TimeItem
            label="Overall Rank"
            value={participant.itemNetRank === null ? '-' : `#${participant.itemNetRank}`}
          />
          <TimeItem
            label="Gender Rank"
            value={participant.netRanking === null ? '-' : `#${participant.netRanking}`}
          />
          <TimeItem
            label="Age Group Rank"
            value={participant.ageNetRank === null ? '-' : `#${participant.ageNetRank}`}
          />
        </div>

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--gray)' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 10 }}>Certificate</p>
          <a
            className="btn-cert"
            href={certLink(participant.id)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className="fas fa-certificate" /> Download Certificate
          </a>
          <p style={{ fontSize: '0.78rem', color: 'var(--dark-light)', textAlign: 'center', marginTop: 8 }}>
            Klik tombol untuk melihat &amp; mengunduh certificate
          </p>
        </div>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="modal-info-item">
      <div className="modal-info-label">{label}</div>
      <div className="modal-info-value">{value}</div>
    </div>
  );
}

function TimeItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="modal-time-item">
      <span className="modal-time-label">{label}</span>
      <span className="modal-time-value">{value}</span>
    </div>
  );
}


