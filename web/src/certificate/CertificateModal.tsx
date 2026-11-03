import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { useToast } from '../components/Toast';
import { certificatePdfName, certificatePngName, downloadPdf, downloadPng } from './download';
import { ensureCertificateFonts, loadImage, renderCertificate } from './render';
import type { CertificateConfig, CertificateMeta } from './types';
import type { Participant } from '../results/types';

export interface CertificateModalProps {
  config: CertificateConfig;
  participant: Participant;
  meta: CertificateMeta;
  /** Absolute or asset-relative URL of the uploaded template. */
  templateUrl: string | null;
  onClose: () => void;
}

/**
 * Renders the certificate on a canvas and exports it as PNG or PDF. Drawing
 * happens in the browser so the file always matches the admin editor preview.
 */
export function CertificateModal({
  config,
  participant,
  meta,
  templateUrl,
  onClose
}: CertificateModalProps) {
  const { t } = useI18n();
  const toast = useToast();
  const stage = useRef<HTMLDivElement | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'png' | 'pdf' | null>(null);

  useEffect(() => {
    let active = true;

    const build = async () => {
      setLoading(true);
      setError('');

      try {
        const image = templateUrl ? await loadImage(templateUrl) : null;

        await ensureCertificateFonts(config);

        if (!active) {
          return;
        }

        setCanvas(renderCertificate(config, participant, meta, image));
      } catch (renderError) {
        if (active) {
          setError(renderError instanceof Error ? renderError.message : t('rx.cert.failed'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void build();

    return () => {
      active = false;
    };
  }, [config, participant, meta, templateUrl, t]);

  useEffect(() => {
    const host = stage.current;

    if (!host || !canvas) {
      return;
    }

    canvas.className = 'rt-cert-canvas';
    host.replaceChildren(canvas);

    return () => {
      host.replaceChildren();
    };
  }, [canvas]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const save = useCallback(
    async (kind: 'png' | 'pdf') => {
      if (!canvas) {
        return;
      }

      setBusy(kind);

      try {
        if (kind === 'png') {
          await downloadPng(canvas, certificatePngName(config, participant));
        } else {
          await downloadPdf(canvas, config.pdf, certificatePdfName(config, participant));
        }

        toast.success(t('rx.cert.saved'));
      } catch (saveError) {
        toast.error(saveError instanceof Error ? saveError.message : t('rx.cert.failed'));
      } finally {
        setBusy(null);
      }
    },
    [canvas, config, participant, t, toast]
  );

  return (
    <div
      className="rt-cert-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={t('rx.certificate')}
      onClick={onClose}
    >
      <div className="rt-cert-dialog" onClick={(event) => event.stopPropagation()}>
        <header className="rt-cert-head">
          <div className="rt-cert-title">
            <i className="fas fa-certificate" aria-hidden="true" /> {t('rx.certificate')}
            <span className="rt-cert-who">
              {participant.name}
              {participant.bib ? ` · BIB ${participant.bib}` : ''}
            </span>
          </div>
          <button type="button" className="rt-cert-close" onClick={onClose} aria-label={t('common.close')}>
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <div className="rt-cert-body">
          {loading ? (
            <div className="rt-cert-state">
              <i className="fas fa-spinner fa-spin" aria-hidden="true" />
              <span>{t('rx.cert.rendering')}</span>
            </div>
          ) : error ? (
            <div className="rt-cert-state is-error">
              <i className="fas fa-triangle-exclamation" aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="rt-cert-stage" ref={stage} />
          )}
        </div>

        <footer className="rt-cert-foot">
          <button
            type="button"
            className="rt-cert-btn"
            disabled={!canvas || busy !== null}
            onClick={() => void save('png')}
          >
            <i className="fas fa-image" aria-hidden="true" />
            {busy === 'png' ? t('rx.cert.working') : t('rx.cert.downloadPng')}
          </button>
          <button
            type="button"
            className="rt-cert-btn is-secondary"
            disabled={!canvas || busy !== null}
            onClick={() => void save('pdf')}
          >
            <i className="fas fa-file-pdf" aria-hidden="true" />
            {busy === 'pdf' ? t('rx.cert.working') : t('rx.cert.downloadPdf')}
          </button>
        </footer>
      </div>
    </div>
  );
}
