import { useLayoutEffect, type ReactNode } from 'react';
import { applyTheme, currentTheme, type Theme } from '../lib/theme';

/**
 * The admin CMS is light-only: the public site keeps its light/dark switch,
 * but every admin screen (including login/setup) renders in light mode
 * regardless of the visitor's saved theme.
 *
 * The lock is reference-counted so StrictMode's mount/cleanup/mount cycle (and
 * admin-to-admin navigation) never restores the saved theme mid-session.
 */
let lockCount = 0;
let savedTheme: Theme | null = null;

export function AdminTheme({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    lockCount += 1;

    if (savedTheme === null) {
      savedTheme = currentTheme();
    }

    applyTheme('light');

    return () => {
      lockCount -= 1;

      window.setTimeout(() => {
        if (lockCount > 0 || savedTheme === null) {
          return;
        }

        const previous = savedTheme;
        savedTheme = null;
        applyTheme(previous);
      }, 0);
    };
  }, []);

  return <>{children}</>;
}
