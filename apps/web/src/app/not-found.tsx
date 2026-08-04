import { buttonVariants, cn, NotFoundState } from '@warrantypass/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Brand } from '@/components/brand';

export default function NotFound(): ReactNode {
  return (
    <main id="main-content" className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-xl text-center">
        <Brand />
        <div className="mt-8">
          <NotFoundState
            title="This page is not in your wallet"
            description="The address may be incorrect, or the page may have moved as WarrantyPass grows."
          />
        </div>
        <Link href="/" className={cn(buttonVariants({ variant: 'primary' }), 'mt-6')}>
          Return home
        </Link>
      </div>
    </main>
  );
}
