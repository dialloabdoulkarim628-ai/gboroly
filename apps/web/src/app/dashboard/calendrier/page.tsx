'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import type { CompetitionInfo, MatchView, Tournament } from '@/lib/org-types';
import { Icon } from '../_icons';
import { Modal, inputCls, labelCls } from '../_modal';

function dayKey(iso?: string | null) {
  if (!iso) return 'Non planifié';
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso));
}
function hhmm(iso?: string | null) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

function GenerateModal({ tid, onClose }: { tid: string; onClose: () => void }) {
  const { apiFetch } = useAuth();
  const qc = useQueryClient();
  const [compId, setCompId] = useState('');
  const [day, setDay] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('19:00');
  const [duration, setDuration] = useState('60');
  const [rest, setRest] = useState('60');
  const [error, setError] = useState<string | null>(null);

  const comps = useQuery({
    queryKey: ['competitions', tid],
    queryFn: () => apiFetch<CompetitionInfo[]>(`/tournaments/${tid}/competitions`),
  });

  const gen = useMutation({
    mutationFn: () =>
      apiFetch(`/competitions/${compId}/schedule`, {
        method: 'POST',
        body: JSON.stringify({
          days: [day],
          startTime,
          endTime,
          matchDurationMin: Number(duration),
          restMinutesPerTeam: Number(rest),
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cal-matches', tid] });
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <Modal title="Générer le calendrier" onClose={onClose}>
      {comps.isLoading ? (
        <div className="h-24 animate-pulse rounded-xl bg-slate-50" />
      ) : !comps.data?.length ? (
        <p className="text-center text-sm text-muted">Aucune compétition. Générez d’abord le format de compétition (à venir).</p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); setError(null); gen.mutate(); }} className="space-y-4">
          <div>
            <label className={labelCls}>Compétition *</label>
            <select className={inputCls} value={compId} onChange={(e) => setCompId(e.target.value)} required>
              <option value="">Sélectionner…</option>
              {comps.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.category} — {c.matchesUnscheduled} match(s) à planifier
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Jour *</label>
            <input type="date" className={inputCls} value={day} onChange={(e) => setDay(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Début</label>
              <input type="time" className={inputCls} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Fin</label>
              <input type="time" className={inputCls} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Durée d’un match (min)</label>
              <input type="number" min={10} className={inputCls} value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Repos par équipe (min)</label>
              <input type="number" min={0} className={inputCls} value={rest} onChange={(e) => setRest(e.target.value)} />
            </div>
          </div>
          {error && <div className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:bg-slate-50">Annuler</button>
            <button type="submit" disabled={gen.isPending || !compId || !day} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
              {gen.isPending ? 'Génération…' : 'Générer'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default function CalendrierPage() {
  const { apiFetch, activeOrg } = useAuth();
  const [tid, setTid] = useState('');
  const [open, setOpen] = useState(false);

  const tournaments = useQuery({
    queryKey: ['tournaments', activeOrg?.id],
    queryFn: () => apiFetch<Tournament[]>('/tournaments'),
    enabled: !!activeOrg,
  });
  useEffect(() => {
    if (!tid && tournaments.data?.length) setTid(tournaments.data[0].id);
  }, [tid, tournaments.data]);

  const matches = useQuery({
    queryKey: ['cal-matches', tid],
    queryFn: () => apiFetch<MatchView[]>(`/matches?tournamentId=${tid}`),
    enabled: !!tid,
  });

  const days = new Map<string, MatchView[]>();
  for (const m of matches.data ?? []) {
    const k = dayKey(m.scheduledAt);
    if (!days.has(k)) days.set(k, []);
    days.get(k)!.push(m);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Calendrier</h1>
          <p className="mt-1 text-sm text-muted">L’agenda des matchs, jour par jour.</p>
        </div>
        <div className="flex gap-2">
          {tournaments.data && tournaments.data.length > 0 && (
            <select value={tid} onChange={(e) => setTid(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-brand">
              {tournaments.data.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          <button onClick={() => setOpen(true)} disabled={!tid} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
            <Icon name="calendar" className="h-4 w-4" /> Générer
          </button>
        </div>
      </div>

      {matches.isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-white shadow-card" />
      ) : !matches.data?.length ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-muted">
          Aucun match. Générez d’abord le format de compétition, puis le calendrier.
        </div>
      ) : (
        <div className="space-y-5">
          {[...days.entries()].map(([day, list]) => (
            <div key={day}>
              <h2 className="mb-2 text-sm font-bold capitalize text-ink">{day}</h2>
              <div className="overflow-hidden rounded-2xl bg-white shadow-card">
                {list.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 border-b border-slate-50 px-4 py-2.5 last:border-0">
                    <span className="w-12 text-sm font-bold text-brand">{hhmm(m.scheduledAt) || '—'}</span>
                    <span className="w-16 text-xs text-muted">{m.field ?? ''}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                      {m.home ?? 'À définir'} <span className="text-muted">vs</span> {m.away ?? 'À définir'}
                    </span>
                    <span className="text-xs text-muted">{m.round}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && tid && <GenerateModal tid={tid} onClose={() => setOpen(false)} />}
    </div>
  );
}
