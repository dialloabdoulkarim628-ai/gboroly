'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import type { Tournament, Venue } from '@/lib/org-types';
import { Icon } from '../_icons';
import { Modal, inputCls, labelCls } from '../_modal';

function CreateVenueModal({ tid, onClose }: { tid: string; onClose: () => void }) {
  const { apiFetch } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = { name };
      if (address) body.address = address;
      return apiFetch(`/tournaments/${tid}/venues`, { method: 'POST', body: JSON.stringify(body) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['venues', tid] });
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <Modal title="Ajouter un site" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); setError(null); create.mutate(); }} className="space-y-4">
        <div>
          <label className={labelCls}>Nom du site *</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Stade Municipal d’Abobo" required minLength={2} />
        </div>
        <div>
          <label className={labelCls}>Adresse</label>
          <input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Abobo, Abidjan" />
        </div>
        {error && <div className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:bg-slate-50">Annuler</button>
          <button type="submit" disabled={create.isPending} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
            {create.isPending ? '…' : 'Ajouter'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AddFieldForm({ venueId, tid }: { venueId: string; tid: string }) {
  const { apiFetch } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const add = useMutation({
    mutationFn: () => apiFetch(`/venues/${venueId}/fields`, { method: 'POST', body: JSON.stringify({ name }) }),
    onSuccess: () => {
      setName('');
      qc.invalidateQueries({ queryKey: ['venues', tid] });
    },
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (name) add.mutate(); }} className="mt-3 flex gap-2">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nouveau terrain (ex : Terrain A)" className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand" />
      <button type="submit" disabled={!name || add.isPending} className="rounded-lg bg-brand/10 px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand/20 disabled:opacity-50">
        + Terrain
      </button>
    </form>
  );
}

export default function TerrainsPage() {
  const { apiFetch, activeOrg } = useAuth();
  const qc = useQueryClient();
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

  const venues = useQuery({
    queryKey: ['venues', tid],
    queryFn: () => apiFetch<Venue[]>(`/tournaments/${tid}/venues`),
    enabled: !!tid,
  });

  const removeField = useMutation({
    mutationFn: (fieldId: string) => apiFetch(`/fields/${fieldId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['venues', tid] }),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Terrains</h1>
          <p className="mt-1 text-sm text-muted">Les sites et terrains où se jouent vos matchs.</p>
        </div>
        <div className="flex gap-2">
          {tournaments.data && tournaments.data.length > 0 && (
            <select value={tid} onChange={(e) => setTid(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-brand">
              {tournaments.data.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          <button onClick={() => setOpen(true)} disabled={!tid} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
            <Icon name="plus" className="h-4 w-4" /> Site
          </button>
        </div>
      </div>

      {venues.isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-white shadow-card" />
      ) : !venues.data?.length ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand"><Icon name="fields" className="h-7 w-7" /></div>
          <h2 className="mt-4 text-lg font-bold text-ink">Aucun site</h2>
          <p className="mt-1 text-sm text-muted">Ajoutez un site puis ses terrains pour générer le calendrier.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {venues.data.map((v) => (
            <div key={v.id} className="rounded-2xl bg-white p-5 shadow-card">
              <div className="flex items-center gap-2">
                <Icon name="pin" className="h-5 w-5 text-brand" />
                <div>
                  <div className="font-bold text-ink">{v.name}</div>
                  {v.address && <div className="text-xs text-muted">{v.address}</div>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {v.fields.length === 0 ? (
                  <span className="text-xs text-muted">Aucun terrain.</span>
                ) : (
                  v.fields.map((f) => (
                    <span key={f.id} className="inline-flex items-center gap-1 rounded-full bg-field/10 px-3 py-1 text-sm font-semibold text-field">
                      {f.name}
                      <button onClick={() => removeField.mutate(f.id)} className="text-field/60 hover:text-danger" aria-label="Supprimer">
                        <Icon name="close" className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))
                )}
              </div>
              <AddFieldForm venueId={v.id} tid={tid} />
            </div>
          ))}
        </div>
      )}

      {open && tid && <CreateVenueModal tid={tid} onClose={() => setOpen(false)} />}
    </div>
  );
}
