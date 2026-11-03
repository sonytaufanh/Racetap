import { useTheme } from '../lib/theme';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';

  return (
    <button
      type="button"
      className={`btn btn-light-custom btn-sm-custom theme-toggle ${className}`.trim()}
      onClick={toggle}
      aria-label={dark ? 'Aktifkan tema terang' : 'Aktifkan tema gelap'}
      title={dark ? 'Tema terang' : 'Tema gelap'}
    >
      <i className={`bi ${dark ? 'bi-sun' : 'bi-moon-stars'}`} />
    </button>
  );
}
