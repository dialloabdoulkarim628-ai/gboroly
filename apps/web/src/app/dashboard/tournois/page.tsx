'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { fmtDate, fmtFee, STATUS_META, type Tournament } from '@/lib/org-types';
import { Icon } from '../_icons';

function StatusBadge({ status }: { status: Tournament['status'] }) {
  const m = STATUS_META[status];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.className}`}>{m.label}</span>;
}

export default function TournoisPage() {
  const { activeOrg, apiFetch } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['tournaments', activeOrg?.id],
    queryFn: () => apiFetch<Tournament[]>('/tournaments'),
    enabled: !!activeOrg,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Mes tournois</h1>
          <p className="mt-1 text-sm text-muted">Créez, gérez et publiez vos compétitions.</p>
        </div>
        <Link
          href="/dashboard/tournois/nouveau"
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          <Icon name="plus" className="h-4 w-4" /> Créer un tournoi
        </Link>
      </div>

      {error && (
        <div className="rounded-2xl bg-danger/10 px-5 py-4 text-sm text-danger">
          {(error as Error).message}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-white shadow-card" />
          ))}
        </div>
      ) : !data?.length ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <Icon name="trophy" className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-ink">Aucun tournoi</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Créez votre premier tournoi pour commencer à inscrire des équipes.
          </p>
          <Link
            href="/dashboard/tournois/nouveau"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            <Icon name="plus" className="h-4 w-4" /> Créer un tournoi
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-card">
          {/* En-tête (desktop) */}
          <div className="hidden grid-cols-12 gap-4 border-b border-slate-100 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:grid">
            <div className="col-span-5">Tournoi</div>
            <div className="col-span-2">Statut</div>
            <div className="col-span-2">Début</div>
            <div className="col-span-2">Frais</div>
            <div className="col-span-1 text-right">Équipes</div>
          </div>
          <div className="divide-y divide-slate-100">
            {data.map((t) => (
              <Link
                key={t.id}
                href={`/dashboard/tournois/${t.id}`}
                className="grid grid-cols-1 items-center gap-2 px-5 py-4 transition-colors hover:bg-slate-50 sm:grid-cols-12 sm:gap-4"
              >
                <div className="col-span-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-navy text-sm font-bold text-white">
                    {t.name.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink">{t.name}</div>
                    <div className="truncate text-xs text-muted">
                      {[t.city, t.country].filter(Boolean).join(', ')}
                    </div>
                  </div>
                </div>
                <div className="col-span-2">
                  <StatusBadge status={t.status} />
                </div>
                <div className="col-span-2 text-sm text-ink">{fmtDate(t.startDate)}</div>
                <div className="col-span-2 text-sm text-ink">{fmtFee(t.registrationFee, t.currency)}</div>
                <div className="col-span-1 text-sm text-muted sm:text-right">
                  {t.maxTeams ? `≤ ${t.maxTeams}` : '—'}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
