import { Skeleton } from '@warrantypass/ui';
import type { ReactNode } from 'react';

export default function Loading(): ReactNode {
  return (
    <main
      id="main-content"
      className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8"
      aria-busy="true"
    >
      <span className="sr-only">Loading WarrantyPass</span>
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-5 w-full max-w-lg" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-36" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </main>
  );
}
