'use client';

import { Button, ErrorState } from '@warrantypass/ui';
import type { ReactNode } from 'react';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): ReactNode {
  return (
    <html lang="en">
      <body>
        <main
          id="main-content"
          className="grid min-h-dvh place-items-center bg-[#f7f8f6] px-4 py-10"
        >
          <div className="w-full max-w-xl">
            <ErrorState
              title="WarrantyPass could not load this page"
              description="Your data has not been changed. Try loading the page again."
              actionLabel="Try again"
              onAction={reset}
            />
            <div className="mt-4 text-center">
              <Button variant="link" onClick={() => window.location.assign('/')}>
                Return home
              </Button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
