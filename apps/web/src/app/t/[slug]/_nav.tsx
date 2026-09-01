'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { key: '', label: 'Accueil' },
  { key: '/matches', label: 'Matchs' },
  { key: '/standings', label: 'Classement' },
  { key: '/teams', label: 'Équipes' },
  { key: '/bracket', label: 'Bracket' },
];

export function NavTabs({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/t/${slug}`;
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto">
      {TABS.map((tab) => {
        const href = `${base}${tab.key}`;
        const active = pathname === href;
        return (
          <Link
            key={tab.key}
            href={href}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              active
                ? 'border-energy text-white'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
