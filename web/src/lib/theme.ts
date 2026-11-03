import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'racetap-theme';
const EVENT = 'racetap:theme';

function preferred(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);

  if (saved === 'light' || saved === 'dark') {
    return saved;
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function apply(theme: Theme): void {
  document.documentElement.dataset.theme = theme;

  if (document.body) {
    document.body.dataset.theme = theme;
  }
}

export function initTheme(): void {
  apply(preferred());
}

export function setTheme(theme: Theme): void {
  window.localStorage.setItem(STORAGE_KEY, theme);
  apply(theme);
  window.dispatchEvent(new CustomEvent<Theme>(EVENT, { detail: theme }));
}

/**
 * Applies a theme without persisting it. Used by screens (e.g. the admin CMS)
 * that temporarily force a palette and restore the saved preference after.
 */
export function applyTheme(theme: Theme): void {
  apply(theme);
  window.dispatchEvent(new CustomEvent<Theme>(EVENT, { detail: theme }));
}

export function toggleTheme(): void {
  setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setLocalTheme] = useState<Theme>(() => (typeof window === 'undefined' ? 'light' : currentTheme()));

  useEffect(() => {
    const onChange = (event: Event) => setLocalTheme((event as CustomEvent<Theme>).detail);
    window.addEventListener(EVENT, onChange);

    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  const toggle = useCallback(() => {
    toggleTheme();
    setLocalTheme(currentTheme());
  }, []);

  return { theme, toggle };
}
