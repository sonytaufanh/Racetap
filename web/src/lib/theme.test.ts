// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { currentTheme, initTheme, setTheme, toggleTheme } from './theme';

describe('theme', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('applies and persists an explicit theme', () => {
    setTheme('dark');

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem('racetap-theme')).toBe('dark');
    expect(currentTheme()).toBe('dark');
  });

  it('toggles between light and dark', () => {
    setTheme('light');
    toggleTheme();

    expect(currentTheme()).toBe('dark');

    toggleTheme();

    expect(currentTheme()).toBe('light');
  });

  it('restores the stored theme on init', () => {
    window.localStorage.setItem('racetap-theme', 'dark');
    initTheme();

    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
