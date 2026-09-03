'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { fmtDate, fmtFee, STATUS_META, type Checklist, type Tournament } from '@/lib/org-types';
import { Icon } from '../../_icons';

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5 font-semibold text-ink">{value}</div>
    </div>
  );
}

export default function TournoiDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { apiFetch, activeOrg } = useAuth();
  const qc = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);

  const t = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => apiFetch<Tournament>(`/tournaments/${id}`),
    enabled: !!activeOrg,
  });
  const checklist = useQuery({
    queryKey: ['checklist', id],
    queryFn: () => apiFetch<Checklist>(`/tournaments/${id}/checklist`),
    enabled: !!activeOrg,
  });

  const publish = useMutation({
    mutationFn: () => apiFetch<Tournament>(`/tournaments/${id}/publish`, { method: 'POST' }),
    onSuccess: () => {
      setNotice('🎉 Tournoi publié ! Il est désormais visible publiquement.');
      qc.invalidateQueries({ queryKey: ['tournament', id] });
      qc.invalidateQueries({ queryKey: ['checklist', id] });
      qc.invalidateQueries({ queryKey: ['tournaments', activeOrg?.id] });
    },
    onError: (e) => setNotice(`⚠️ ${(e as Error).message}`),
  });

  if (t.isLoading) return <div className="mx-auto max-w-4xl"><div className="h-40 animate-pulse rounded-2xl bg-white shadow-card" /></div>;
  if (t.error || !t.data)
    return (
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-10 text-center shadow-card">
        <p className="text-sm text-danger">{(t.error as Error)?.message ?? 'Tournoi introuvable'}</p>
        <Link href="/dashboard/tournois" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
          ← Mes tournois
        </Link>
      </div>
    );

  const tournament = t.data;
  const status = STATUS_META[tournament.status];
  const items = checklist.data?.items ?? [];
  const requiredUnmet = items.filter((i) => i.required && !i.met);
  const canPublish =
    (tournament.status === 'DRAFT' || tournament.status === 'READY') && requiredUnmet.length === 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/dashboard/tournois" className="text-sm font-semibold text-brand hover:underline">
          ← Mes tournois
        </Link>
      </div>

      {/* En-tête */}
      <div className="overflow-hidden rounded-2xl bg-navy text-white shadow-card">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-2xl font-extrabold">
            {tournament.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.className}`}>{status.label}</span>
            <h1 className="mt-1 truncate text-2xl font-extrabold">{tournament.name}</h1>
            <p className="text-sm text-white/70">{[tournament.city, tournament.country].filter(Boolean).join(', ')}</p>
          </div>
          {(tournament.status === 'PUBLISHED' || tournament.status === 'ONGOING' || tournament.status === 'COMPLETED') && (
            <Link
              href={`/t/${tournament.slug}`}
              className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/20"
            >
              Voir la page publique →
            </Link>
          )}
        </div>
      </div>

      {notice && <div className="rounded-2xl bg-brand/5 px-5 py-3 text-sm font-medium text-brand">{notice}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Infos */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl bg-white p-6 shadow-card">
            <h2 className="mb-4 text-lg font-bold text-ink">Informations</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Info label="Début" value={fmtDate(tournament.startDate)} />
              <Info label="Fin" value={fmtDate(tournament.endDate)} />
              <Info label="Frais" value={fmtFee(tournament.registrationFee, tournament.currency)} />
              <Info label="Max équipes" value={tournament.maxTeams ? String(tournament.maxTeams) : '—'} />
              <Info label="Visibilité" value={tournament.visibility === 'PUBLIC' ? 'Public' : 'Privé'} />
              <Info label="Devise" value={tournament.currency} />
            </div>
            {tournament.description && (
              <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-muted">{tournament.description}</p>
            )}
          </div>
        </div>

        {/* Publication */}
        <div className="rounded-2xl bg-white p-6 shadow-card">
          <h2 className="mb-1 text-lg font-bold text-ink">Publication</h2>
          <p className="mb-4 text-xs text-muted">Complétez les éléments requis pour publier.</p>
          <div className="space-y-2">
            {checklist.isLoading ? (
              <div className="h-24 animate-pulse rounded-xl bg-slate-50" />
            ) : (
              items.map((it) => (
                <div key={it.key} className="flex items-center gap-2 text-sm">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                      it.met ? 'bg-field text-white' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {it.met ? '✓' : '○'}
                  </span>
                  <span className={it.met ? 'text-ink' : 'text-muted'}>{it.label}</span>
                  {it.required && !it.met && (
                    <span className="ml-auto text-[10px] font-semibold uppercase text-danger">requis</span>
                  )}
                </div>
              ))
            )}
          </div>

          {tournament.status === 'DRAFT' || tournament.status === 'READY' ? (
            <button
              onClick={() => publish.mutate()}
              disabled={!canPublish || publish.isPending}
              className="mt-5 w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {publish.isPending ? 'Publication…' : 'Publier le tournoi'}
            </button>
          ) : (
            <div className="mt-5 rounded-xl bg-field/10 px-4 py-2.5 text-center text-sm font-semibold text-field">
              ✓ Tournoi {status.label.toLowerCase()}
            </div>
          )}
          {!canPublish && (tournament.status === 'DRAFT' || tournament.status === 'READY') && requiredUnmet.length > 0 && (
            <p className="mt-2 text-center text-xs text-muted">
              {requiredUnmet.length} élément(s) requis à compléter.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
