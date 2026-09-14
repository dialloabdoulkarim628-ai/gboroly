'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import Link from 'next/link';
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
  const [days, setDays] = useState<string[]>([]);
  const [dFrom, setDFrom] = useState('');
  const [dTo, setDTo] = useState('');
  const [weekendsOnly, setWeekendsOnly] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('19:00');
  const [duration, setDuration] = useState('60');
  const [rest, setRest] = useState('60');
  const [restUnit, setRestUnit] = useState<'min' | 'h' | 'j'>('min');
  const [error, setError] = useState<string | null>(null);

  const restToMinutes = () =>
    Number(rest) * (restUnit === 'j' ? 1440 : restUnit === 'h' ? 60 : 1);

  // Ajoute un jour seul (dTo vide) ou tous les jours de la plage [dFrom, dTo].
  const addDays = () => {
    if (!dFrom) return;
    const out: string[] = [];
    const end = dTo && dTo >= dFrom ? dTo : dFrom;
    // Itère de date à date en composantes LOCALES (pas d'UTC → aucun décalage de fuseau).
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    for (let d = new Date(`${dFrom}T12:00:00`); ; d.setDate(d.getDate() + 1)) {
      const cur = iso(d);
      const dow = d.getDay(); // 0 = dim., 6 = sam.
      if (!weekendsOnly || dow === 0 || dow === 6) out.push(cur);
      if (cur >= end) break;
    }
    setDays((prev) => Array.from(new Set([...prev, ...out])).sort());
    setDFrom('');
    setDTo('');
  };
  const removeDay = (iso: string) => setDays((prev) => prev.filter((d) => d !== iso));
  const dayLabel = (iso: string) =>
    new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(
      new Date(`${iso}T12:00:00`),
    );

  const comps = useQuery({
    queryKey: ['competitions', tid],
    queryFn: () => apiFetch<CompetitionInfo[]>(`/tournaments/${tid}/competitions`),
  });

  const gen = useMutation({
    mutationFn: () =>
      apiFetch(`/competitions/${compId}/schedule`, {
        method: 'POST',
        body: JSON.stringify({
          days,
          startTime,
          endTime,
          matchDurationMin: Number(duration),
          restMinutesPerTeam: restToMinutes(),
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
            <label className={labelCls}>Jours de compétition *</label>
            <p className="mb-2 text-xs text-muted">
              Ajoutez un jour, ou une plage de dates (« Du … Au »). Idéal pour un tournoi sur plusieurs jours ou semaines.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <span className="mb-1 block text-[11px] font-medium text-muted">Du</span>
                <input type="date" className={inputCls} value={dFrom} onChange={(e) => setDFrom(e.target.value)} />
              </div>
              <div className="flex-1">
                <span className="mb-1 block text-[11px] font-medium text-muted">Au (optionnel)</span>
                <input type="date" className={inputCls} value={dTo} min={dFrom || undefined} onChange={(e) => setDTo(e.target.value)} />
              </div>
              <button
                type="button"
                onClick={addDays}
                disabled={!dFrom}
                className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-40"
              >
                Ajouter
              </button>
            </div>
            {dTo && dTo > dFrom && (
              <label className="mt-2 flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={weekendsOnly} onChange={(e) => setWeekendsOnly(e.target.checked)} />
                Week-ends uniquement (samedi &amp; dimanche)
              </label>
            )}
            {days.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {days.map((d) => (
                  <span key={d} className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand">
                    {dayLabel(d)}
                    <button type="button" onClick={() => removeDay(d)} className="text-brand/60 hover:text-danger" aria-label={`Retirer ${d}`}>
                      <Icon name="close" className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {days.length === 0 && <p className="mt-2 text-xs text-muted">Aucun jour ajouté pour l’instant.</p>}
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
              <label className={labelCls}>Repos par équipe</label>
              <div className="flex gap-2">
                <input type="number" min={0} className={`${inputCls} flex-1`} value={rest} onChange={(e) => setRest(e.target.value)} />
                <select
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                  value={restUnit}
                  onChange={(e) => setRestUnit(e.target.value as 'min' | 'h' | 'j')}
                >
                  <option value="min">minutes</option>
                  <option value="h">heures</option>
                  <option value="j">jours</option>
                </select>
              </div>
              {restUnit !== 'min' && Number(rest) > 0 && (
                <p className="mt-1 text-[11px] text-muted">= {restToMinutes().toLocaleString('fr-FR')} min</p>
              )}
            </div>
          </div>
          {error && <div className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:bg-slate-50">Annuler</button>
            <button type="submit" disabled={gen.isPending || !compId || days.length === 0} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
              {gen.isPending ? 'Génération…' : `Générer${days.length ? ` (${days.length} j.)` : ''}`}
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
  // Présélection via ?t=<id> (lien depuis la page du tournoi).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('t');
    if (p) setTid(p);
  }, []);
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
          {!!tid && (
            <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
              <Icon name="calendar" className="h-4 w-4" /> Générer
            </button>
          )}
        </div>
      </div>

      {tournaments.data && tournaments.data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand"><Icon name="trophy" className="h-7 w-7" /></div>
          <h2 className="mt-4 text-lg font-bold text-ink">Aucun tournoi pour l’instant</h2>
          <p className="mt-1 text-sm text-muted">Le calendrier se génère à partir d’un tournoi et de ses matchs. Créez d’abord un tournoi.</p>
          <Link href="/dashboard/tournois/nouveau" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
            <Icon name="plus" className="h-4 w-4" /> Créer un tournoi
          </Link>
        </div>
      ) : matches.isLoading ? (
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
