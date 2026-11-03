import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../lib/http';
import { useI18n } from '../i18n/I18nProvider';

interface AthleteHit {
  name: string;
  bib: string;
  category: string;
  net_time: string;
  overall_rank: number | null;
  race_slug: string;
  race_name: string;
}

interface SearchPayload {
  query: string;
  results: AthleteHit[];
  truncated: boolean;
}

/**
 * Inline "check my result" widget: searches the cross-event athlete index and
 * deep-links into the results viewer with the bib highlighted.
 */
export function QuickResultSearch({ className = '' }: { className?: string }) {
  const { t } = useI18n();
  const [term, setTerm] = useState('');
  const [hits, setHits] = useState<AthleteHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const query = term.trim();

    if (query.length < 2) {
      setHits([]);
      setBusy(false);
      setProblem('');
      return;
    }

    let active = true;
    const controller = new AbortController();
    setBusy(true);
    setProblem('');

    const timer = window.setTimeout(() => {
      api<SearchPayload>(`/search?q=${encodeURIComponent(query)}&limit=5`, { signal: controller.signal })
        .then((payload) => {
          if (active) {
            setHits(payload.results);
          }
        })
        .catch((cause: unknown) => {
          if (active && !controller.signal.aborted) {
            setProblem(errorMessage(cause));
            setHits([]);
          }
        })
        .finally(() => {
          if (active) {
            setBusy(false);
          }
        });
    }, 280);

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [term]);

  const query = term.trim();

  return (
    <div className={`quick-search ${className}`.trim()}>
      <div className="quick-search-head">
        <span className="quick-search-icon">
          <i className="bi bi-stopwatch" />
        </span>
        <div>
          <strong className="quick-search-title">{t('quick.heading')}</strong>
          <small className="quick-search-hint">{t('quick.hint')}</small>
        </div>
      </div>

      <div className="quick-search-field">
        <i className="bi bi-search" />
        <input
          ref={inputRef}
          type="search"
          autoComplete="off"
          value={term}
          placeholder={t('quick.placeholder')}
          aria-label={t('quick.heading')}
          onChange={(event) => {
            setTouched(true);
            setTerm(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && hits.length > 0) {
              event.preventDefault();
              window.location.assign(`/results/${hits[0].race_slug}/?bib=${encodeURIComponent(hits[0].bib)}`);
            }
          }}
        />
        {busy ? <span className="spinner-border spinner-border-sm quick-search-spinner" role="status" aria-hidden="true" /> : null}
      </div>

      {query.length > 0 && query.length < 2 ? <p className="quick-search-note">{t('quick.min')}</p> : null}
      {problem ? <p className="quick-search-note is-error">{t('quick.error')}</p> : null}

      {hits.length > 0 ? (
        <ul className="quick-search-results">
          {hits.map((hit) => (
            <li key={`${hit.race_slug}-${hit.bib}-${hit.name}`}>
              <Link
                to={`/results/${hit.race_slug}/?bib=${encodeURIComponent(hit.bib)}`}
                className="quick-search-result"
                onClick={() => setTerm('')}
              >
                <span>
                  <strong>{hit.name || '-'}</strong>
                  <small>
                    {hit.bib || '-'} · {hit.race_name} · {hit.category || '-'}
                  </small>
                </span>
                <span className="quick-search-open">
                  {hit.net_time || '-'} <i className="bi bi-arrow-right" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {touched && query.length >= 2 && !busy && !problem && hits.length === 0 ? (
        <p className="quick-search-note">{t('quick.empty')}</p>
      ) : null}
    </div>
  );
}
