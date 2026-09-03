'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { TEAM_STATUS_META, type Player, type RosterEntry, type Team } from '@/lib/org-types';
import { Icon } from '../../_icons';
import { Modal, inputCls, labelCls } from '../../_modal';

function AddToRosterModal({ teamId, roster, onClose }: { teamId: string; roster: RosterEntry[]; onClose: () => void }) {
  const { apiFetch, activeOrg } = useAuth();
  const qc = useQueryClient();
  const [playerId, setPlayerId] = useState('');
  const [jersey, setJersey] = useState('');
  const [position, setPosition] = useState('');
  const [error, setError] = useState<string | null>(null);

  const players = useQuery({
    queryKey: ['players', activeOrg?.id],
    queryFn: () => apiFetch<Player[]>('/players'),
    enabled: !!activeOrg,
  });
  const inRoster = new Set(roster.map((r) => r.player.id));
  const available = (players.data ?? []).filter((p) => !inRoster.has(p.id));

  const add = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = { playerId };
      if (jersey) payload.jerseyNumber = Number(jersey);
      if (position) payload.position = position;
      return apiFetch(`/teams/${teamId}/players`, { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roster', teamId] });
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <Modal title="Ajouter au roster" onClose={onClose}>
      {players.isLoading ? (
        <div className="h-24 animate-pulse rounded-xl bg-slate-50" />
      ) : available.length === 0 ? (
        <div className="text-center text-sm text-muted">
          Tous les joueurs sont déjà dans l’équipe, ou aucun joueur n’existe encore.
          <Link href="/dashboard/joueurs" className="mt-3 block font-semibold text-brand hover:underline">
            → Ajouter des joueurs
          </Link>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            add.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className={labelCls}>Joueur *</label>
            <select className={inputCls} value={playerId} onChange={(e) => setPlayerId(e.target.value)} required>
              <option value="">Sélectionner…</option>
              {available.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                  {p.position ? ` (${p.position})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>N° maillot</label>
              <input type="number" min={0} max={999} className={inputCls} value={jersey} onChange={(e) => setJersey(e.target.value)} placeholder="10" />
            </div>
            <div>
              <label className={labelCls}>Poste</label>
              <input className={inputCls} value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Milieu" />
            </div>
          </div>
          {error && <div className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:bg-slate-50">
              Annuler
            </button>
            <button type="submit" disabled={add.isPending || !playerId} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
              {add.isPending ? 'Ajout…' : 'Ajouter'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default function EquipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { apiFetch, activeOrg } = useAuth();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const team = useQuery({
    queryKey: ['team', id],
    queryFn: () => apiFetch<Team>(`/teams/${id}`),
    enabled: !!activeOrg,
  });
  const roster = useQuery({
    queryKey: ['roster', id],
    queryFn: () => apiFetch<RosterEntry[]>(`/teams/${id}/players`),
    enabled: !!activeOrg,
  });

  const removeEntry = useMutation({
    mutationFn: (tpId: string) => apiFetch(`/team-players/${tpId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roster', id] }),
  });

  if (team.isLoading) return <div className="mx-auto max-w-4xl"><div className="h-32 animate-pulse rounded-2xl bg-white shadow-card" /></div>;
  if (team.error || !team.data)
    return (
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-10 text-center shadow-card">
        <p className="text-sm text-danger">{(team.error as Error)?.message ?? 'Équipe introuvable'}</p>
        <Link href="/dashboard/equipes" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">← Équipes</Link>
      </div>
    );

  const t = team.data;
  const m = TEAM_STATUS_META[t.status];
  const entries = roster.data ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/dashboard/equipes" className="text-sm font-semibold text-brand hover:underline">← Équipes</Link>

      <div className="flex items-center gap-4 rounded-2xl bg-white p-6 shadow-card">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-navy text-2xl font-extrabold text-white">
          {t.name.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h1 className="truncate text-2xl font-extrabold text-ink">{t.name}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.className}`}>{m.label}</span>
          </div>
          <p className="text-sm text-muted">
            {t.shortName ? `${t.shortName} · ` : ''}
            {t.phone ?? 'Aucun contact'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Effectif ({entries.length})</h2>
          <button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            <Icon name="plus" className="h-4 w-4" /> Ajouter
          </button>
        </div>

        {roster.isLoading ? (
          <div className="h-24 animate-pulse rounded-xl bg-slate-50" />
        ) : entries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-muted">
            Aucun joueur dans l’effectif. Cliquez sur « Ajouter » pour composer le roster.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {entries.map((r) => (
              <div key={r.id} className="flex items-center gap-3 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-ink">
                  {r.jerseyNumber ?? '—'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-ink">
                    {r.player.firstName} {r.player.lastName}
                  </div>
                  <div className="text-xs text-muted">{r.position || r.player.position || 'Joueur'}</div>
                </div>
                <button
                  onClick={() => removeEntry.mutate(r.id)}
                  disabled={removeEntry.isPending}
                  className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger"
                  aria-label="Retirer"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {addOpen && <AddToRosterModal teamId={id} roster={entries} onClose={() => setAddOpen(false)} />}
    </div>
  );
}
