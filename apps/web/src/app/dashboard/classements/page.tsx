'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import type { BracketNode, Scorer, Standing, Tournament } from '@/lib/org-types';

type Tab = 'classement' | 'bracket' | 'buteurs';

function StandingsView({ rows }: { rows: Standing[] }) {
  if (!rows.length)
    return <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-muted">Aucun classement disponible (aucun match de poule joué).</p>;
  const groups = new Map<string, Standing[]>();
  for (const r of rows) {
    const k = r.group ?? 'Classement';
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([group, list]) => (
        <div key={group} className="overflow-hidden rounded-2xl bg-white shadow-card">
          <div className="bg-navy px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white">{group}</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase text-muted">
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Équipe</th>
                  <th className="px-2 py-2 text-center">J</th>
                  <th className="px-2 py-2 text-center">G</th>
                  <th className="px-2 py-2 text-center">N</th>
                  <th className="px-2 py-2 text-center">P</th>
                  <th className="px-2 py-2 text-center">Diff</th>
                  <th className="px-3 py-2 text-center font-bold">Pts</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.team.name + r.position} className="border-b border-slate-50 last:border-0">
                    <td className="px-3 py-2 font-semibold text-muted">{r.position}</td>
                    <td className="px-3 py-2 font-semibold text-ink">{r.team.name}</td>
                    <td className="px-2 py-2 text-center">{r.played}</td>
                    <td className="px-2 py-2 text-center">{r.wins}</td>
                    <td className="px-2 py-2 text-center">{r.draws}</td>
                    <td className="px-2 py-2 text-center">{r.losses}</td>
                    <td className="px-2 py-2 text-center">{r.goalDifference > 0 ? `+${r.goalDifference}` : r.goalDifference}</td>
                    <td className="px-3 py-2 text-center font-extrabold text-ink">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function BracketView({ nodes }: { nodes: BracketNode[] }) {
  if (!nodes.length)
    return <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-muted">Aucune phase finale pour ce tournoi.</p>;
  const rounds = new Map<string, BracketNode[]>();
  for (const n of nodes) {
    if (!rounds.has(n.roundName)) rounds.set(n.roundName, []);
    rounds.get(n.roundName)!.push(n);
  }
  const ordered = [...rounds.entries()].sort((a, b) => (a[1][0]?.roundOrder ?? 0) - (b[1][0]?.roundOrder ?? 0));
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {ordered.map(([round, list]) => (
        <div key={round} className="min-w-[220px] flex-1">
          <h3 className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-muted">{round}</h3>
          <div className="flex h-full flex-col justify-around gap-3">
            {list.map((n) => (
              <div key={n.matchId} className="rounded-xl bg-white p-3 shadow-card">
                {[{ label: n.homeLabel, id: n.homeTeamId }, { label: n.awayLabel, id: n.awayTeamId }].map((side, i) => (
                  <div key={i} className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-sm ${n.winnerTeamId && side.id === n.winnerTeamId ? 'bg-field/10 font-bold text-field' : 'text-ink'}`}>
                    <span className="truncate">{side.label}</span>
                    {n.winnerTeamId && side.id === n.winnerTeamId && <span className="ml-2 text-xs">✓</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ScorersView({ rows }: { rows: Scorer[] }) {
  if (!rows.length)
    return <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-muted">Aucun buteur enregistré (les buts se saisissent via les événements de match).</p>;
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-card">
      {rows.map((s, i) => (
        <div key={s.playerId} className="flex items-center gap-3 border-b border-slate-50 px-4 py-3 last:border-0">
          <span className="w-6 text-center font-bold text-muted">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-ink">{s.name}</div>
            <div className="truncate text-xs text-muted">{s.team ?? '—'}</div>
          </div>
          <span className="rounded-full bg-brand/10 px-3 py-1 text-sm font-bold text-brand">{s.goals} but{s.goals > 1 ? 's' : ''}</span>
        </div>
      ))}
    </div>
  );
}

export default function ClassementsPage() {
  const { apiFetch, activeOrg } = useAuth();
  const [tid, setTid] = useState('');
  const [tab, setTab] = useState<Tab>('classement');

  const tournaments = useQuery({
    queryKey: ['tournaments', activeOrg?.id],
    queryFn: () => apiFetch<Tournament[]>('/tournaments'),
    enabled: !!activeOrg,
  });
  useEffect(() => {
    if (!tid && tournaments.data?.length) setTid(tournaments.data[0].id);
  }, [tid, tournaments.data]);

  const standings = useQuery({
    queryKey: ['standings', tid],
    queryFn: () => apiFetch<Standing[]>(`/tournaments/${tid}/standings`),
    enabled: !!tid && tab === 'classement',
  });
  const bracket = useQuery({
    queryKey: ['bracket', tid],
    queryFn: () => apiFetch<BracketNode[]>(`/tournaments/${tid}/bracket`),
    enabled: !!tid && tab === 'bracket',
  });
  const scorers = useQuery({
    queryKey: ['scorers', tid],
    queryFn: () => apiFetch<Scorer[]>(`/tournaments/${tid}/scorers`),
    enabled: !!tid && tab === 'buteurs',
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: 'classement', label: 'Classement' },
    { key: 'bracket', label: 'Bracket' },
    { key: 'buteurs', label: 'Buteurs' },
  ];
  const loading = (tab === 'classement' && standings.isLoading) || (tab === 'bracket' && bracket.isLoading) || (tab === 'buteurs' && scorers.isLoading);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Classements & Stats</h1>
          <p className="mt-1 text-sm text-muted">Classements, arbre des phases finales et meilleurs buteurs.</p>
        </div>
        {tournaments.data && tournaments.data.length > 0 && (
          <select value={tid} onChange={(e) => setTid(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-brand">
            {tournaments.data.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${tab === t.key ? 'bg-white text-brand shadow-sm' : 'text-muted hover:text-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-white shadow-card" />
      ) : (
        <>
          {tab === 'classement' && <StandingsView rows={standings.data ?? []} />}
          {tab === 'bracket' && <BracketView nodes={bracket.data ?? []} />}
          {tab === 'buteurs' && <ScorersView rows={scorers.data ?? []} />}
        </>
      )}
    </div>
  );
}
