import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Brand } from '@/components/brand';

export function AuthShell({
  children,
  eyebrow,
  title,
  description,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}): ReactNode {
  return (
    <main id="main-content" className="min-h-dvh bg-[var(--surface-muted)]">
      <div className="mx-auto grid min-h-dvh max-w-7xl lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="hidden border-r border-[var(--border)] bg-[#123c35] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <Brand href="/" />
          <div className="max-w-md">
            <span className="grid size-12 place-items-center rounded-2xl bg-white/10">
              <ShieldCheck aria-hidden="true" size={25} />
            </span>
            <h2 className="mt-6 text-3xl font-bold tracking-tight">
              Warranty records with a source you can understand.
            </h2>
            <p className="mt-4 leading-7 text-emerald-50/75">
              Business-issued warranties and personal uploads remain clearly separated across the
              WarrantyPass experience.
            </p>
          </div>
          <p className="text-sm text-emerald-50/60">Private by default · Built for Bangladesh</p>
        </aside>
        <section className="flex min-w-0 flex-col">
          <div className="flex h-18 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 sm:px-8 lg:justify-end">
            <div className="lg:hidden">
              <Brand href="/" />
            </div>
            <Link
              href="/"
              className="rounded-lg text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--primary)]"
            >
              Back to home
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
            <div className="w-full max-w-lg">
              <p className="text-sm font-bold tracking-widest text-[var(--primary)] uppercase">
                {eyebrow}
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 leading-7 text-[var(--text-muted)]">{description}</p>
              <div className="mt-8">{children}</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
