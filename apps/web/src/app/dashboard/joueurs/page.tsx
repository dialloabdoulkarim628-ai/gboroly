'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import type { Player } from '@/lib/org-types';
import { Icon } from '../_icons';
import { Modal, inputCls, labelCls } from '../_modal';

function CreatePlayerModal({ onClose }: { onClose: () => void }) {
  const { apiFetch, activeOrg } = useAuth();
  const qc = useQueryClient();
  const [f, setF] = useState({ firstName: '', lastName: '', position: '', nationality: '', phone: '' });
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = { firstName: f.firstName, lastName: f.lastName };
      if (f.position) payload.position = f.position;
      if (f.nationality) payload.nationality = f.nationality;
      if (f.phone) payload.phone = f.phone;
      return apiFetch<Player>('/players', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['players', activeOrg?.id] });
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <Modal title="Ajouter un joueur" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          create.mutate();
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Prénom *</label>
            <input className={inputCls} value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} required />
          </div>
          <div>
            <label className={labelCls}>Nom *</label>
            <input className={inputCls} value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Poste</label>
            <input className={inputCls} value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })} placeholder="Attaquant" />
          </div>
          <div>
            <label className={labelCls}>Nationalité</label>
            <input className={inputCls} value={f.nationality} onChange={(e) => setF({ ...f, nationality: e.target.value })} placeholder="Ivoirienne" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Téléphone</label>
          <input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+225…" />
        </div>
        {error && <div className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:bg-slate-50">
            Annuler
          </button>
          <button type="submit" disabled={create.isPending} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
            {create.isPending ? 'Ajout…' : 'Ajouter'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function JoueursPage() {
  const { apiFetch, activeOrg } = useAuth();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['players', activeOrg?.id],
    queryFn: () => apiFetch<Player[]>('/players'),
    enabled: !!activeOrg,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Joueurs</h1>
          <p className="mt-1 text-sm text-muted">Le référentiel des joueurs de votre organisation.</p>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
          <Icon name="plus" className="h-4 w-4" /> Ajouter un joueur
        </button>
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-white shadow-card" />
      ) : !data?.length ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <Icon name="players" className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-ink">Aucun joueur</h2>
          <p className="mt-1 text-sm text-muted">Ajoutez vos joueurs pour les affecter aux équipes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
                {p.firstName.charAt(0)}
                {p.lastName.charAt(0)}
              </span>
              <div className="min-w-0">
                <div className="truncate font-semibold text-ink">
                  {p.firstName} {p.lastName}
                </div>
                <div className="truncate text-xs text-muted">
                  {[p.position, p.nationality].filter(Boolean).join(' · ') || 'Joueur'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <CreatePlayerModal onClose={() => setOpen(false)} />}
    </div>
  );
}
