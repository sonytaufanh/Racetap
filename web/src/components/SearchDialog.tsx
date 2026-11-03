import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Modal } from './Modal';
import { api, errorMessage } from '../lib/http';
import { useI18n } from '../i18n/I18nProvider';
import { formatNumber } from '../lib/format';

interface AthleteHit {
  name: string;
  bib: string;
  category: string;
  gender: string;
  age_group: string;
  net_time: string;
  gun_time: string;
  overall_rank: number | null;
  race_slug: string;
  race_name: string;
}

interface SearchPayload {
  query: string;
  results: AthleteHit[];
  truncated: boolean;
}

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [athletes, setAthletes] = useState<AthleteHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const { t, events: siteEvents } = useI18n();

  const events = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (term === '') {
      return siteEvents.slice(0, 6);
    }

    return siteEvents.filter(
      (event) =>
        event.name.toLowerCase().includes(term) || event.location.toLowerCase().includes(term)
    ).slice(0, 8);
  }, [query, siteEvents]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setAthletes([]);
      setProblem('');
      return;
    }

    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);

    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const term = query.trim();

    if (term.length < 2) {
      setAthletes([]);
      setBusy(false);
      return;
    }

    let active = true;
    const controller = new AbortController();
    setBusy(true);
    setProblem('');

    const timer = window.setTimeout(() => {
      api<SearchPayload>(`/search?q=${encodeURIComponent(term)}&limit=8`, { signal: controller.signal })
        .then((payload) => {
          if (active) {
            setAthletes(payload.results);
          }
        })
        .catch((cause: unknown) => {
          if (active && !controller.signal.aborted) {
            setProblem(errorMessage(cause));
            setAthletes([]);
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
  }, [open, query]);

  return (
    <Modal open={open} onClose={onClose} title={t('search.title')} size="md">
      <div className="rt-search-input mb-3">
        <i className="bi bi-search" />
        <input
          ref={inputRef}
          className="form-control"
          type="search"
          placeholder={t('search.placeholder')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && query.trim().length >= 2 && events.length > 0) {
              navigate(`/events/${events[0].slug}`);
              onClose();
            }
          }}
        />
      </div>

      <div className="rt-search-group-title mb-0">{t('search.events')}</div>
      {events.length === 0 ? (
        <p className="text-slate small mb-0">{t('search.noEvents')}</p>
      ) : (
        events.map((event) => (
          <Link
            key={event.slug}
            to={`/events/${event.slug}`}
            className="rt-search-item"
            onClick={onClose}
          >
            <span>
              <strong className="d-block text-navy">{event.name}</strong>
              <small>
                {event.location} · <i className="bi bi-stopwatch me-1" /> {t('search.resultsLink')}
              </small>
            </span>
            <i className="bi bi-arrow-right" />
          </Link>
        ))
      )}

      {query.trim().length >= 2 ? (
        <>
          <div className="rt-search-group-title">{t('search.athletes')}</div>
          {busy ? <p className="text-slate small mb-0">{t('search.searching')}</p> : null}
          {!busy && problem ? <p className="text-slate small mb-0">{problem}</p> : null}
          {!busy && !problem && athletes.length === 0 ? (
            <p className="text-slate small mb-0">{t('search.noAthletes')}</p>
          ) : null}
          {athletes.map((hit) => (
            <a
              key={`${hit.race_slug}-${hit.bib}-${hit.name}`}
              className="rt-search-item"
              href={`/results/${hit.race_slug}/`}
              onClick={onClose}
            >
              <span>
                <strong className="d-block text-navy">
                  {hit.name || '-'} <span className="text-slate">· {hit.bib || '-'}</span>
                </strong>
                <small>
                  {hit.race_name} · {hit.category || '-'} · Net {hit.net_time || '-'}
                  {hit.overall_rank ? ` · #${formatNumber(hit.overall_rank)}` : ''}
                </small>
              </span>
              <i className="bi bi-box-arrow-up-right" />
            </a>
          ))}
        </>
      ) : null}
    </Modal>
  );
}
