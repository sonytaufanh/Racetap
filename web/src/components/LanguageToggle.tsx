import { LANG_LABELS, LANGS } from '../i18n/types';
import { useI18n } from '../i18n/I18nProvider';

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { lang, setLang } = useI18n();

  return (
    <div className={`lang-toggle ${className}`.trim()} role="group" aria-label="Language">
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          className={`lang-option${lang === code ? ' is-active' : ''}`}
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
        >
          {LANG_LABELS[code]}
        </button>
      ))}
    </div>
  );
}
