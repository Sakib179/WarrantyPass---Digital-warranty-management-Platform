import Link from 'next/link';
import type { ReactNode } from 'react';

import { Brand } from './brand';

const groups = [
  {
    heading: 'Product',
    links: [
      ['How it works', '/#how-it-works'],
      ['For businesses', '/#for-business'],
      ['Plans', '/#plans'],
      ['Security', '/#security'],
    ],
  },
  {
    heading: 'Accounts',
    links: [
      ['Customer sign in', '/login'],
      ['Create customer account', '/register'],
      ['Business sign in', '/business/login'],
      ['Apply as a business', '/business/register'],
    ],
  },
  {
    heading: 'Support',
    links: [
      ['Help centre', '#'],
      ['Privacy', '#'],
      ['Terms', '#'],
      ['Contact', '#'],
    ],
  },
] as const;

export function SiteFooter(): ReactNode {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_2fr] lg:px-8">
        <div>
          <Brand />
          <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--text-muted)]">
            A trusted home for verified and personal warranty records across Bangladesh.
          </p>
          <p className="mt-5 text-sm text-[var(--text-subtle)]">
            Timezone: Asia/Dhaka · Currency: BDT
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {groups.map((group) => (
            <div key={group.heading}>
              <h2 className="text-sm font-bold text-[var(--text)]">{group.heading}</h2>
              <ul className="mt-4 space-y-3">
                {group.links.map(([label, href]) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-[var(--text-muted)] hover:text-[var(--primary)]"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-[var(--text-subtle)] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© 2026 WarrantyPass. Built for Bangladesh.</p>
          <p>Part 1 technical foundation · Authentication is not active yet.</p>
        </div>
      </div>
    </footer>
  );
}
