'use client';

import type { ReactNode } from 'react';

/**
 * Permanent black theme provider.
 * No light/dark toggle — Cortex always uses the dark theme.
 * Simply renders children with the "dark" class on <html>.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
