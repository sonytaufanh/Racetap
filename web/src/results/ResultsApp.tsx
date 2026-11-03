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
  sortParticipants,
  timeToSeconds
} from './model';
import type {
  ColumnKey,
  Participant,
  ResultsPayload,
  ScoresData,
  SortState
} from './types';
import type { Filters } from './model';
import { useTheme } from '../lib/theme';
import { normalizeBib } from '../lib/format';
import { useI18n } from '../i18n/I18nProvider';
import { useToast } from '../components/Toast';
import { canIssueCertificate, loadPublicCertificate, type PublicCertificate } from '../certificate/api';
import { CertificateModal } from '../certificate/CertificateModal';
import type { CertificateMeta } from '../certificate/types';

interface Props {
  payload: ResultsPayload;
}

const LIVE_INTERVAL = 30000;
const PAGE_SIZES = [50, 100, 250, 500];

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

function isFinisher(participant: Participant): boolean {
  return participant.netScore !== '' && participant.netScore !== '00:00:00';
}

function formatClock(value: string): string {
  return value && value !== '00:00:00' ? value : '-';
}

function readFavorites(slug: string): Record<string, true> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(`racetap-results-fav:${slug}`);
    return raw ? (JSON.parse(raw) as Record<string, true>) : {};
  } catch {
    return {};
  }
}

function writeFavorites(slug: string, favorites: Record<string, true>): void {
  try {
    window.localStorage.setItem(`racetap-results-fav:${slug}`, JSON.stringify(favorites));
  } catch {
    // Storage can be disabled; favorites simply do not persist.
  }
}

interface UrlState {
  filters: Filters;
  sort: SortState | null;
  page: number;
  favoritesOnly: boolean;
  highlightBib: string;
}

function readUrlState(): UrlState {
  if (typeof window === 'undefined') {
    return { filters: EMPTY_FILTERS, sort: null, page: 1, favoritesOnly: false, highlightBib: '' };
  }

  const params = new URLSearchParams(window.location.search);
  const sortKey = params.get('sort') as ColumnKey | null;
  const sortDir = params.get('dir') === 'desc' ? 'desc' : 'asc';
  const highlightBib = normalizeBib(params.get('bib'));

  return {
    filters: {
      ...EMPTY_FILTERS,
      // A `?bib=` link (from a kiosk or a shared result) focuses that athlete.
      search: params.get('q') || highlightBib,
      item: params.get('item') || '',
      gender: params.get('gender') || '',
      ageGroup: params.get('age') || '',
      ageGroup2: params.get('age2') || ''
    },
    sort: sortKey && COLUMNS[sortKey] ? { key: sortKey, dir: sortDir } : null,
    page: Math.max(1, Number(params.get('page')) || 1),
    favoritesOnly: params.get('fav') === '1',
    highlightBib
  };
}

export default function ResultsApp({ payload }: Props) {
  const { config } = payload;
  const initial = useMemo(readUrlState, []);
  const [data, setData] = useState<ReturnType<typeof parseScoresData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<Filters>(initial.filters);
  const [sort, setSort] = useState<SortState | null>(initial.sort);
  const [page, setPage] = useState(initial.page);
  const [perPage, setPerPage] = useState(config.pageSize ?? 100);
  const [selected, setSelected] = useState<Participant | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(initial.favoritesOnly);
  const [highlightBib, setHighlightBib] = useState(initial.highlightBib);
  const [favorites, setFavorites] = useState<Record<string, true>>(() => readFavorites(config.slug));
  const [favoriteTick, setFavoriteTick] = useState(0);
  const [live, setLive] = useState(false);
  const [updatedAt, setUpdatedAt] = useState('');
  const [certificate, setCertificate] = useState<PublicCertificate | null>(null);
  const [certificateFor, setCertificateFor] = useState<Participant | null>(null);
  // Statistics stay visible on wide screens; collapsed on phones so the page
  // does not grow long before the table.
  const [showStats, setShowStats] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth > 900
  );
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const floatRef = useRef<HTMLDivElement | null>(null);
  const floatInnerRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const { theme } = useTheme();
  const toast = useToast();
  const { t } = useI18n();

  const columns = useMemo<ColumnKey[]>(() => config.columns ?? DEFAULT_COLUMNS, [config.columns]);
  const activeFilters = useMemo(
    () => config.filters ?? ['item', 'gender', 'ageGroup'],
    [config.filters]
  );

  /**
   * `silent` refreshes (live mode) must not toggle the loading state, otherwise
   * the table disappears and reappears every interval.
   */
  const load = useCallback(
    async (options: { silent?: boolean } = {}) => {
      const silent = Boolean(options.silent);

      if (!silent) {
        setLoading(true);
      }

      setError('');

      try {
        const response = await fetch(payload.dataUrl, { credentials: 'same-origin' });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const json = (await response.json()) as ScoresData;
        setData(parseScoresData(json));
        setUpdatedAt(
          new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
      } catch (cause) {
        if (!silent) {
          setData(null);
          setError(cause instanceof Error ? cause.message : 'Failed to load results.');
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [payload.dataUrl]
  );

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Host certificate template for this event (results/<slug>/certificate.json),
   * authored in the admin. Absent or disabled simply means "keep using the
   * timing provider link", so failures are ignored on purpose.
   */
  useEffect(() => {
    const controller = new AbortController();

    loadPublicCertificate(payload.assetBase, controller.signal)
      .then((loaded) => setCertificate(loaded))
      .catch(() => undefined);

    return () => controller.abort();
  }, [payload.assetBase]);

  useEffect(() => {
    if (!live) {
      return;
    }

    const timer = window.setInterval(() => {
      void load({ silent: true });
    }, LIVE_INTERVAL);

    return () => window.clearInterval(timer);
  }, [live, load]);

  useEffect(() => {
    if (!data) return;

    const title = data.raceTitle || config.title || config.slug;
    document.title = config.metaTitle ?? `Hasil Lomba ${title} | RaceTap`;
  }, [data, config.slug, config.title, config.metaTitle]);

  useEffect(() => {
    // While the certificate modal is open it owns Escape, otherwise both modals
    // would close on a single key press.
    if (!selected || certificateFor) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null);
    };

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [selected, certificateFor]);

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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams();

    if (filters.search) params.set('q', filters.search);
    if (filters.item) params.set('item', filters.item);
    if (filters.gender) params.set('gender', filters.gender);
    if (filters.ageGroup) params.set('age', filters.ageGroup);
    if (filters.ageGroup2) params.set('age2', filters.ageGroup2);
    if (sort) {
      params.set('sort', sort.key);
      params.set('dir', sort.dir);
    }
    if (page > 1) params.set('page', String(page));
    if (favoritesOnly) params.set('fav', '1');
    if (highlightBib) params.set('bib', highlightBib);

    const query = params.toString();
    window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
  }, [filters, sort, page, favoritesOnly, highlightBib]);

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

    const filteredByControls = sortParticipants(filterParticipants(data.participants, filters), sort);

    if (!favoritesOnly) {
      return filteredByControls;
    }

    return filteredByControls.filter((participant) => favorites[String(participant.id)]);
  }, [data, filters, sort, favoritesOnly, favorites, favoriteTick]);

  const podium = useMemo(() => {
    if (!data) return [];

    const candidates = filterParticipants(data.participants, { ...filters, search: '' })
      .filter(isFinisher)
      .sort((a, b) => timeToSeconds(a.netScore) - timeToSeconds(b.netScore));

    return candidates.slice(0, 3);
  }, [data, filters]);

  const stats = useMemo(() => {
    const participants = filterParticipants(data?.participants ?? [], { ...filters, search: '' });
    const finishers = participants.filter(isFinisher);

    const genders = [
      { label: 'Male', count: finishers.filter((p) => p.sex !== 'F').length },
      { label: 'Female', count: finishers.filter((p) => p.sex === 'F').length }
    ];

    const ageBuckets = Array.from(
      finishers.reduce((map, participant) => {
        const key = participant.ageGroup || 'OPEN';
        map.set(key, (map.get(key) ?? 0) + 1);
        return map;
      }, new Map<string, number>())
    )
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const buckets = [
      { label: '< 40m', min: 0, max: 2400 },
      { label: '40–50m', min: 2400, max: 3000 },
      { label: '50–60m', min: 3000, max: 3600 },
      { label: '60–75m', min: 3600, max: 4500 },
      { label: '75–90m', min: 4500, max: 5400 },
      { label: '90–120m', min: 5400, max: 7200 },
      { label: '> 120m', min: 7200, max: Number.POSITIVE_INFINITY }
    ].map((bucket) => ({
      label: bucket.label,
      count: finishers.filter((p) => {
        const seconds = timeToSeconds(p.netScore);
        return seconds >= bucket.min && seconds < bucket.max;
      }).length
    }));

    return { total: participants.length, finishers: finishers.length, genders, ageBuckets, buckets };
  }, [data, filters]);

  const pageSize = perPage;
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

  const toggleFavorite = (participant: Participant) => {
    const key = String(participant.id);
    setFavorites((previous) => {
      const next = { ...previous };

      if (next[key]) {
        delete next[key];
      } else {
        next[key] = true;
      }

      writeFavorites(config.slug, next);
      return next;
    });
    setFavoriteTick((tick) => tick + 1);
  };

  const exportCsv = () => {
    const header = columns.map((key) => COLUMNS[key].label);
    const lines = [header.join(',')];

    filtered.forEach((participant) => {
      const values = columns.map((key) => {
        const cell = renderCell(participant, key);
        const text = typeof cell === 'string' ? cell : cellText(participant, key);
        return `"${String(text).replace(/"/g, '""')}"`;
      });

      lines.push(values.join(','));
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config.slug}-results.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t('rx.exported', { count: filtered.length }));
  };

  const share = async (participant: Participant) => {
    const url = `${window.location.origin}${window.location.pathname}?q=${encodeURIComponent(participant.bib || participant.name)}`;

    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('rx.shareCopied'));
    } catch {
      toast.error(t('rx.shareFailed'));
    }
  };

  const banner = resolveAsset(payload.assetBase, config.banner);
  const distance = data ? distanceLabel(data.items, config) : config.distanceOverride ?? '-';
  const title = data?.raceTitle || config.title || config.slug;

  const cellContext = useMemo<CellContext>(
    () => ({ certificate, onCertificate: (participant) => setCertificateFor(participant) }),
    [certificate]
  );

  const certificateMeta = useMemo<CertificateMeta>(
    () => ({
      eventName: certificate?.config.eventName || data?.raceTitle || config.title || config.slug,
      // The admin no longer types the date; fall back to the results file.
      eventDate: certificate?.config.eventDate || data?.raceDate || '',
      eventTitle: data?.raceTitle || config.title || config.slug
    }),
    [certificate, config.slug, config.title, data?.raceDate, data?.raceTitle]
  );

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
              {config.maintenanceMessage ?? t('rx.maintenance')}
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
    <div className="rt-results" data-theme={theme}>
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
              <span className="stat-label">{t('rx.participants')}</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{data?.categories ?? 0}</span>
              <span className="stat-label">{t('rx.categories')}</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{distance}</span>
              <span className="stat-label">{t('rx.distance')}</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{data?.finishers ?? 0}</span>
              <span className="stat-label">{t('rx.finishers')}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        {podium.length > 0 ? (
          <section className="podium" aria-label="Podium">
            {podium.map((participant, index) => (
              <div className={`podium-card podium-${index + 1}`} key={participant.id}>
                <span className="podium-medal">
                  <i className="fas fa-medal" /> #{index + 1}
                </span>
                <div className="podium-name">{participant.name}</div>
                <div className="podium-meta">
                  <span>{participant.itemName}</span>
                  <span>{participant.netScore}</span>
                </div>
              </div>
            ))}
          </section>
        ) : null}

        <div className="controls-bar">
          <div className="search-box">
            <i className="fas fa-search" />
            <input
              type="text"
              placeholder={t('rx.searchPlaceholder')}
              autoComplete="off"
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
            />
          </div>
          <div className="filter-group">
            {activeFilters.includes('item') ? (
              <select value={filters.item} onChange={(event) => updateFilter('item', event.target.value)}>
                <option value="">{t('rx.allDistances')}</option>
                {itemOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            ) : null}
            {activeFilters.includes('gender') ? (
              <select value={filters.gender} onChange={(event) => updateFilter('gender', event.target.value)}>
                <option value="">{t('rx.allGenders')}</option>
                <option value="M">{t('rx.male')}</option>
                <option value="F">{t('rx.female')}</option>
              </select>
            ) : null}
            {activeFilters.includes('ageGroup') ? (
              <select
                value={filters.ageGroup}
                onChange={(event) => updateFilter('ageGroup', event.target.value)}
              >
                <option value="">{t('rx.ageGroup')}</option>
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
                <option value="">{t('rx.ageGroup2')}</option>
                {age2Options.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </div>

        {itemOptions.length > 1 ? (
          <div className="quick-filters" role="group" aria-label="Filter jarak">
            <button
              type="button"
              className={`quick-chip${filters.item === '' ? ' is-active' : ''}`}
              onClick={() => updateFilter('item', '')}
            >
              {t('rx.allCategories')}
            </button>
            {itemOptions.map((value) => (
              <button
                key={value}
                type="button"
                className={`quick-chip${filters.item === value ? ' is-active' : ''}`}
                onClick={() => updateFilter('item', value)}
              >
                {value}
              </button>
            ))}
          </div>
        ) : null}

        {highlightBib ? (
          <div className="highlight-note">
            <i className="fas fa-crosshairs" /> {t('rx.highlight')} <strong>{highlightBib}</strong>
            <button
              type="button"
              className="btn-pill"
              onClick={() => {
                setHighlightBib('');
                updateFilter('search', '');
              }}
            >
              {t('rx.clear')}
            </button>
          </div>
        ) : null}

        <div className="results-actions">
          <button
            type="button"
            className={`btn-pill${favoritesOnly ? ' is-active' : ''}`}
            onClick={() => {
              setFavoritesOnly((previous) => !previous);
              setPage(1);
            }}
          >
            <i className="fas fa-star" /> {t('rx.favorites')} ({Object.keys(favorites).length})
          </button>
          <button type="button" className="btn-pill" onClick={() => setShowStats((value) => !value)}>
            <i className="fas fa-chart-column" /> {showStats ? t('rx.hideStats') : t('rx.showStats')}
          </button>
          <button type="button" className="btn-pill" onClick={exportCsv} disabled={filtered.length === 0}>
            <i className="fas fa-file-csv" /> {t('rx.exportCsv')}
          </button>
          <button type="button" className="btn-pill" onClick={() => window.print()}>
            <i className="fas fa-print" /> {t('rx.print')}
          </button>
          <button
            type="button"
            className={`btn-pill${live ? ' is-live' : ''}`}
            onClick={() => setLive((value) => !value)}
            title={`Refresh otomatis setiap ${LIVE_INTERVAL / 1000} detik`}
          >
            <i className="fas fa-tower-broadcast" /> {live ? t('rx.liveOn') : t('rx.liveOff')}
          </button>

          {updatedAt ? <span className="updated-at">{t('rx.updated', { time: updatedAt })}</span> : null}
        </div>

        {showStats && data ? (
          <div className="stats-panel">
            <div className="stats-summary">
              <div>
                <span>{t('rx.participants')}</span>
                <strong>{stats.total}</strong>
              </div>
              <div>
                <span>{t('rx.finishers')}</span>
                <strong>{stats.finishers}</strong>
              </div>
              <div>
                <span>{t('rx.finishRate')}</span>
                <strong>{stats.total > 0 ? `${Math.round((stats.finishers / stats.total) * 100)}%` : '-'}</strong>
              </div>
            </div>
            <div className="chart-block">
              <h3>{t('rx.gender')}</h3>
              {stats.genders.map((entry) => (
                <BarRow
                  key={entry.label}
                  label={entry.label}
                  value={entry.count}
                  max={Math.max(1, ...stats.genders.map((item) => item.count))}
                />
              ))}
            </div>
            <div className="chart-block">
              <h3>{t('rx.ageGroupChart')}</h3>
              {stats.ageBuckets.length === 0 ? <p className="chart-empty">{t('rx.noData')}</p> : null}
              {stats.ageBuckets.map((entry) => (
                <BarRow
                  key={entry.label}
                  label={entry.label}
                  value={entry.count}
                  max={Math.max(1, ...stats.ageBuckets.map((item) => item.count))}
                />
              ))}
            </div>
            <div className="chart-block">
              <h3>{t('rx.finishTime')}</h3>
              {stats.buckets.map((entry) => (
                <BarRow
                  key={entry.label}
                  label={entry.label}
                  value={entry.count}
                  max={Math.max(1, ...stats.buckets.map((item) => item.count))}
                />
              ))}
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="loading-state">
            <div className="loader" />
            <p>{t('rx.loading')}</p>
          </div>
        ) : null}

        {!loading && error !== '' ? (
          <div className="error-state">
            <i className="fas fa-exclamation-triangle" />
            <p>{t('rx.failed')}</p>
            <button className="btn-retry" type="button" onClick={() => void load()}>
              {t('rx.retry')}
            </button>
          </div>
        ) : null}

        {!loading && error === '' && data ? (
          <div>
            <div className="table-wrapper" ref={wrapperRef}>
              <table id="participantsTable" ref={tableRef}>
                <thead>
                  <tr>
                    <th className="rt-fav-col" scope="col" aria-label="Favorite">
                      <i className="fas fa-star" />
                    </th>
                    {columns.map((key) => {
                      const definition = COLUMNS[key];
                      const active = sort && sort.key === key;
                      const icon = active ? `fa-sort-${sort.dir === 'asc' ? 'up' : 'down'}` : 'fa-sort';

                      return (
                        <th
                          key={key}
                          className={definition.sortable ? 'sortable' : undefined}
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
                    <tr
                      key={row.id}
                      className={highlightBib && normalizeBib(row.bib) === highlightBib ? 'is-highlight' : undefined}
                      onClick={() => setSelected(row)}
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelected(row);
                        }
                      }}
                    >
                      <td className="rt-fav-col">
                        <button
                          type="button"
                          className={`fav-btn${favorites[String(row.id)] ? ' is-active' : ''}`}
                          aria-label="Simpan favorit"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleFavorite(row);
                          }}
                        >
                          <i className={`${favorites[String(row.id)] ? 'fas' : 'far'} fa-star`} />
                        </button>
                      </td>
                      {columns.map((key) => (
                        <td key={key}>{renderCell(row, key, cellContext)}</td>
                      ))}
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
                  ? t('rx.showing', { from: start + 1, to: showingEnd, total: filtered.length })
                  : t('rx.empty')}
              </span>
              <div className="table-footer-controls">
                <label className="rt-per-page">
                  {t('rx.perPage')}
                  <select
                    value={perPage}
                    onChange={(event) => {
                      setPerPage(Number(event.target.value));
                      setPage(1);
                    }}
                  >
                    {PAGE_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="page-info rt-page-of">
                  {t('rx.pageOf', { page: currentPage, total: totalPages })}
                </span>
              </div>
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
            <ParticipantModal
              participant={selected}
              favorite={Boolean(favorites[String(selected.id)])}
              onToggleFavorite={() => toggleFavorite(selected)}
              onShare={() => void share(selected)}
              hostedCertificate={canIssueCertificate(certificate, selected)}
              onCertificate={() => setCertificateFor(selected)}
            />
          </div>
        </div>
      ) : null}

      {certificate && certificateFor ? (
        <CertificateModal
          config={certificate.config}
          participant={certificateFor}
          meta={certificateMeta}
          templateUrl={certificate.templateUrl}
          onClose={() => setCertificateFor(null)}
        />
      ) : null}
    </div>
  );
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const width = Math.round((value / max) * 100);

  return (
    <div className="chart-row">
      <span className="chart-label">{label}</span>
      <span className="chart-track">
        <span className="chart-fill" style={{ width: `${width}%` }} />
      </span>
      <span className="chart-value">{value}</span>
    </div>
  );
}

function cellText(participant: Participant, key: ColumnKey): string {
  switch (key) {
    case 'name':
      return participant.name;
    case 'cert':
      return String(participant.id);
    case 'gender':
      return participant.genderLabel;
    case 'status':
      return participant.status.label;
    default:
      return '';
  }
}

/** Optional host-certificate wiring for the name/cert cells. */
export interface CellContext {
  certificate: PublicCertificate | null;
  onCertificate: (participant: Participant) => void;
}

export function renderCell(participant: Participant, key: ColumnKey, context?: CellContext) {
  const hosted = context ? canIssueCertificate(context.certificate, participant) : false;

  switch (key) {
    case 'item':
      return participant.itemName;
    case 'bib':
      return participant.bib;
    case 'name':
      if (hosted && context) {
        return (
          <button
            type="button"
            className="rt-cert-link"
            onClick={(event) => {
              event.stopPropagation();
              context.onCertificate(participant);
            }}
          >
            {participant.name}
          </button>
        );
      }

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
      if (hosted && context) {
        return (
          <button
            type="button"
            className="rt-cert-cell"
            aria-label={`Sertifikat ${participant.name}`}
            onClick={(event) => {
              event.stopPropagation();
              context.onCertificate(participant);
            }}
          >
            <i className="fas fa-certificate" style={{ color: 'var(--primary)', fontSize: '1.1rem' }} />
          </button>
        );
      }

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

function ParticipantModal({
  participant,
  favorite,
  onToggleFavorite,
  onShare,
  hostedCertificate,
  onCertificate
}: {
  participant: Participant;
  favorite: boolean;
  onToggleFavorite: () => void;
  onShare: () => void;
  hostedCertificate: boolean;
  onCertificate: () => void;
}) {
  const { t } = useI18n();
  const rank = participant.itemNetRank;
  const splits = [
    { label: 'CP1', value: participant.cp1 },
    { label: 'CP2', value: participant.cp2 },
    { label: 'CP3', value: participant.cp3 },
    { label: 'CP4', value: participant.cp4 },
    { label: 'CP5', value: participant.cp5 },
    { label: 'CP6', value: participant.cp6 }
  ].filter((split) => split.value);

  return (
    <>
      <div className="modal-header">
        <div className="modal-header-content">
          <div className="modal-rank-badge">
            <i className="fas fa-trophy" /> {rank === null ? '-' : `#${rank}`} {t('rx.overall')}
          </div>
          <div className="modal-name">{participant.name}</div>
        </div>
      </div>
      <div className="modal-body">
        <div className="modal-actions">
          <button type="button" className={`btn-pill${favorite ? ' is-active' : ''}`} onClick={onToggleFavorite}>
            <i className={`${favorite ? 'fas' : 'far'} fa-star`} /> {favorite ? t('rx.favorite') : t('rx.save')}
          </button>
          <button type="button" className="btn-pill" onClick={onShare}>
            <i className="fas fa-link" /> {t('rx.share')}
          </button>
          {hostedCertificate ? (
            <button type="button" className="btn-pill" onClick={onCertificate}>
              <i className="fas fa-certificate" /> {t('rx.certificate')}
            </button>
          ) : (
            <a className="btn-pill" href={certLink(participant.id)} target="_blank" rel="noopener noreferrer">
              <i className="fas fa-certificate" /> {t('rx.certificate')}
            </a>
          )}
        </div>

        <div className="modal-info-grid">
          <Info label={t('rx.bib')} value={participant.bib} />
          <Info label={t('rx.genderLabel')} value={participant.genderLabel} />
          <Info label={t('rx.distanceLabel')} value={participant.itemName} />
          <Info label={t('rx.status')} value={participant.status.label} />
          <Info label={t('rx.ageGroup')} value={participant.ageGroup} />
          {participant.ageGroup2 ? <Info label={t('rx.ageGroup2')} value={participant.ageGroup2} /> : null}
          {participant.team ? <Info label={t('rx.team')} value={participant.team} /> : null}
          {participant.city ? <Info label={t('rx.city')} value={participant.city} /> : null}
        </div>

        <div className="modal-section-title">{t('rx.timing')}</div>
        <div className="modal-time-grid">
          <TimeItem label={t('rx.netTime')} value={showTime(participant.netScore)} />
          <TimeItem label={t('rx.gunTime')} value={showTime(participant.totalScore)} />
          <TimeItem label={t('rx.startTime')} value={showTime(participant.startTime)} />
          <TimeItem label={t('rx.pace')} value={participant.pace || '-'} />
          {participant.diff ? <TimeItem label={t('rx.diff')} value={participant.diff} /> : null}
        </div>

        {splits.length > 0 ? (
          <>
            <div className="modal-section-title">{t('rx.splits')}</div>
            <div className="modal-time-grid">
              {splits.map((split) => (
                <TimeItem key={split.label} label={split.label} value={formatClock(split.value as string)} />
              ))}
              {participant.cp1Cp2 ? <TimeItem label="CP1 – CP2" value={participant.cp1Cp2} /> : null}
            </div>
          </>
        ) : null}

        <div className="modal-section-title">{t('rx.rankings')}</div>
        <div className="modal-time-grid">
          <TimeItem
            label={t('rx.overallRank')}
            value={participant.itemNetRank === null ? '-' : `#${participant.itemNetRank}`}
          />
          <TimeItem
            label={t('rx.genderRank')}
            value={participant.netRanking === null ? '-' : `#${participant.netRanking}`}
          />
          <TimeItem
            label={t('rx.ageRank')}
            value={participant.ageNetRank === null ? '-' : `#${participant.ageNetRank}`}
          />
        </div>

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--gray)' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 10 }}>{t('rx.certificate')}</p>
          {hostedCertificate ? (
            <button type="button" className="btn-cert" onClick={onCertificate}>
              <i className="fas fa-certificate" /> {t('rx.downloadCertificate')}
            </button>
          ) : (
            <a
              className="btn-cert"
              href={certLink(participant.id)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fas fa-certificate" /> {t('rx.downloadCertificate')}
            </a>
          )}
          <p style={{ fontSize: '0.78rem', color: 'var(--dark-light)', textAlign: 'center', marginTop: 8 }}>
            {t('rx.certificateHint')}
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
