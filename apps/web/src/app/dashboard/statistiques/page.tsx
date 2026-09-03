'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import type { Scorer, StatsSummary, Tournament } from '@/lib/org-types';
import { Icon, type IconName } from '../_icons';

function StatTile({ icon, label, value }: { icon: IconName; label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand"><Icon name={icon} /></span>
        <div>
          <div className="text-2xl font-extrabold text-ink">{value}</div>
          <div className="text-xs text-muted">{label}</div>
        </div>
      </div>
    </div>
  );
}

export default function StatistiquesPage() {
  const { apiFetch, activeOrg } = useAuth();
  const [tid, setTid] = useState('');

  const tournaments = useQuery({
    queryKey: ['tournaments', activeOrg?.id],
    queryFn: () => apiFetch<Tournament[]>('/tournaments'),
    enabled: !!activeOrg,
  });
  useEffect(() => {
    if (!tid && tournaments.data?.length) setTid(tournaments.data[0].id);
  }, [tid, tournaments.data]);

  const stats = useQuery({
    queryKey: ['tstats', tid],
    queryFn: () => apiFetch<StatsSummary>(`/tournaments/${tid}/stats`),
    enabled: !!tid,
  });
  const scorers = useQuery({
    queryKey: ['tscorers', tid],
    queryFn: () => apiFetch<Scorer[]>(`/tournaments/${tid}/scorers`),
    enabled: !!tid,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Statistiques</h1>
          <p className="mt-1 text-sm text-muted">Les chiffres clés de vos tournois.</p>
        </div>
        {tournaments.data && tournaments.data.length > 0 && (
          <select value={tid} onChange={(e) => setTid(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-brand">
            {tournaments.data.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile icon="teams" label="Équipes inscrites" value={stats.data?.teams ?? 0} />
        <StatTile icon="matches" label="Matchs joués" value={stats.data?.matchesPlayed ?? 0} />
        <StatTile icon="stats" label="Buts marqués" value={stats.data?.goals ?? 0} />
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-card">
        <h2 className="mb-3 text-lg font-bold text-ink">Meilleurs buteurs</h2>
        {scorers.isLoading ? (
          <div className="h-24 animate-pulse rounded-xl bg-slate-50" />
        ) : !scorers.data?.length ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-muted">
            Aucun buteur enregistré. Les buts se saisissent via les événements de match.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {scorers.data.slice(0, 10).map((s, i) => (
              <div key={s.playerId} className="flex items-center gap-3 py-2.5">
                <span className="w-6 text-center font-bold text-muted">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-ink">{s.name}</div>
                  <div className="truncate text-xs text-muted">{s.team ?? '—'}</div>
                </div>
                <span className="rounded-full bg-brand/10 px-3 py-1 text-sm font-bold text-brand">{s.goals}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
