'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { MATCH_STATUS_META, type MatchView, type Tournament } from '@/lib/org-types';

function fmtTime(iso?: string | null) {
  if (!iso) return null;
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );
}

function MatchRow({ m, tournamentId }: { m: MatchView; tournamentId: string }) {
  const { apiFetch, activeOrg } = useAuth();
  const qc = useQueryClient();
  const [home, setHome] = useState<string>(m.homeScore != null ? String(m.homeScore) : '');
  const [away, setAway] = useState<string>(m.awayScore != null ? String(m.awayScore) : '');
  const [hp, setHp] = useState('');
  const [ap, setAp] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const meta = MATCH_STATUS_META[m.status];
  const finished = m.status === 'FINISHED' || m.status === 'FORFEIT';
  const teamsSet = !!m.home && !!m.away;
  const draw = home !== '' && away !== '' && Number(home) === Number(away);

  const finish = useMutation({
    mutationFn: () => {
      const body: Record<string, number> = { homeScore: Number(home), awayScore: Number(away) };
      if (draw && hp !== '' && ap !== '') {
        body.homePenalties = Number(hp);
        body.awayPenalties = Number(ap);
      }
      return apiFetch(`/matches/${m.id}/finish`, { method: 'POST', body: JSON.stringify(body) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['matches', activeOrg?.id, tournamentId] });
    },
    onError: (e) => setErr((e as Error).message),
  });

  return (
    <div className="rounded-xl border border-slate-100 p-3">
      <div className="mb-1 flex items-center justify-between text-xs text-muted">
        <span>{fmtTime(m.scheduledAt) ?? 'Non planifié'}{m.field ? ` · ${m.field}` : ''}</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}>{meta.label}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1 text-right font-semibold text-ink">
          <span className="truncate">{m.home ?? 'À définir'}</span>
        </div>

        {finished ? (
          <div className="flex items-center gap-1 rounded-lg bg-slate-50 px-3 py-1.5 font-extrabold text-ink">
            <span>{m.homeScore ?? 0}</span>
            <span className="text-muted">-</span>
            <span>{m.awayScore ?? 0}</span>
            {m.homePenalties != null && m.awayPenalties != null && (
              <span className="ml-1 text-xs font-semibold text-muted">
                (tab {m.homePenalties}-{m.awayPenalties})
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              value={home}
              disabled={!teamsSet}
              onChange={(e) => setHome(e.target.value)}
              className="w-12 rounded-lg border border-slate-200 py-1.5 text-center text-sm outline-none focus:border-brand disabled:bg-slate-50"
            />
            <span className="text-muted">-</span>
            <input
              type="number"
              min={0}
              value={away}
              disabled={!teamsSet}
              onChange={(e) => setAway(e.target.value)}
              className="w-12 rounded-lg border border-slate-200 py-1.5 text-center text-sm outline-none focus:border-brand disabled:bg-slate-50"
            />
          </div>
        )}

        <div className="min-w-0 flex-1 font-semibold text-ink">
          <span className="truncate">{m.away ?? 'À définir'}</span>
        </div>
      </div>

      {!finished && teamsSet && (
        <div className="mt-2 flex items-center justify-end gap-2">
          {draw && (
            <div className="mr-auto flex items-center gap-1 text-xs text-muted">
              <span>Tirs au but&nbsp;:</span>
              <input type="number" min={0} value={hp} onChange={(e) => setHp(e.target.value)} className="w-10 rounded border border-slate-200 py-1 text-center" placeholder="—" />
              <span>-</span>
              <input type="number" min={0} value={ap} onChange={(e) => setAp(e.target.value)} className="w-10 rounded border border-slate-200 py-1 text-center" placeholder="—" />
            </div>
          )}
          <button
            onClick={() => {
              setErr(null);
              finish.mutate();
            }}
            disabled={home === '' || away === '' || finish.isPending}
            className="rounded-lg bg-brand px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {finish.isPending ? '…' : 'Terminer'}
          </button>
        </div>
      )}
      {err && <div className="mt-2 rounded-lg bg-danger/10 px-3 py-1.5 text-xs text-danger">{err}</div>}
    </div>
  );
}

export default function MatchsPage() {
  const { apiFetch, activeOrg } = useAuth();
  const [tid, setTid] = useState<string>('');

  const tournaments = useQuery({
    queryKey: ['tournaments', activeOrg?.id],
    queryFn: () => apiFetch<Tournament[]>('/tournaments'),
    enabled: !!activeOrg,
  });

  useEffect(() => {
    if (!tid && tournaments.data?.length) setTid(tournaments.data[0].id);
  }, [tid, tournaments.data]);

  const matches = useQuery({
    queryKey: ['matches', activeOrg?.id, tid],
    queryFn: () => apiFetch<MatchView[]>(`/matches?tournamentId=${tid}`),
    enabled: !!activeOrg && !!tid,
  });

  // Grouper par round (ordre).
  const groups = new Map<string, MatchView[]>();
  for (const m of matches.data ?? []) {
    const key = m.round ?? 'Sans phase';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }
  const orderedGroups = [...groups.entries()].sort((a, b) => (a[1][0]?.roundOrder ?? 0) - (b[1][0]?.roundOrder ?? 0));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Matchs</h1>
          <p className="mt-1 text-sm text-muted">Saisissez les scores — le classement et le bracket se mettent à jour automatiquement.</p>
        </div>
        {tournaments.data && tournaments.data.length > 0 && (
          <select
            value={tid}
            onChange={(e) => setTid(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-brand"
          >
            {tournaments.data.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {matches.isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-white shadow-card" />
      ) : !matches.data?.length ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-muted">
          Aucun match pour ce tournoi. Générez d’abord le format de compétition et le calendrier.
        </div>
      ) : (
        <div className="space-y-6">
          {orderedGroups.map(([round, list]) => (
            <div key={round}>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">{round}</h2>
              <div className="space-y-2">
                {list.map((m) => (
                  <MatchRow key={m.id} m={m} tournamentId={tid} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
