import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { Providers } from '@/components/providers';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://warrantypass.bd'),
  title: {
    default: 'WarrantyPass — Your warranties, always within reach',
    template: '%s | WarrantyPass',
  },
  description:
    'Keep verified business warranties and your own warranty papers in one secure digital wallet.',
  applicationName: 'WarrantyPass',
  category: 'productivity',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f8f6' },
    { media: '(prefers-color-scheme: dark)', color: '#111713' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>): ReactNode {
  return (
    <html lang="en">
      <body>
        <a
          href="#main-content"
          className="fixed top-3 left-3 z-[100] -translate-y-20 rounded-lg bg-[var(--text)] px-4 py-2 text-sm font-semibold text-[var(--surface)] focus:translate-y-0"
        >
          Skip to main content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
