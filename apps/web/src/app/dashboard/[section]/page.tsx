'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Icon } from '../_icons';
import { NAV_ITEMS } from '../_nav-items';

export default function SectionPlaceholder() {
  const params = useParams<{ section: string }>();
  const item = NAV_ITEMS.find((n) => n.href === `/dashboard/${params.section}`);
  const label = item?.label ?? 'Section';

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl bg-white p-10 text-center shadow-card">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Icon name={item?.icon ?? 'dashboard'} className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold text-ink">{label}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Cette section est en cours de construction. Le moteur (API) est déjà prêt côté serveur —
          l’interface arrive dans une prochaine itération.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand/5 px-4 py-1.5 text-xs font-semibold text-brand">
          <span className="h-2 w-2 rounded-full bg-energy" /> Bientôt disponible
        </div>
        <div className="mt-8">
          <Link href="/dashboard" className="text-sm font-semibold text-brand hover:underline">
            ← Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}
