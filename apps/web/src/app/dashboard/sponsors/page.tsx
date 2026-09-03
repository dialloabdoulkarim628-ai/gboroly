'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { SPONSOR_LEVELS, type Sponsor, type SponsorLevel, type Tournament } from '@/lib/org-types';
import { Icon } from '../_icons';
import { Modal, inputCls, labelCls } from '../_modal';

const levelMeta = (l: SponsorLevel) => SPONSOR_LEVELS.find((x) => x.value === l)!;

function CreateSponsorModal({ tid, onClose }: { tid: string; onClose: () => void }) {
  const { apiFetch } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [level, setLevel] = useState<SponsorLevel>('PARTNER');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = { name, level };
      if (website) body.websiteUrl = website;
      return apiFetch(`/tournaments/${tid}/sponsors`, { method: 'POST', body: JSON.stringify(body) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sponsors', tid] });
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <Modal title="Ajouter un sponsor" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); setError(null); create.mutate(); }} className="space-y-4">
        <div>
          <label className={labelCls}>Nom *</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Orange CI" required />
        </div>
        <div>
          <label className={labelCls}>Site web</label>
          <input className={inputCls} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <label className={labelCls}>Niveau</label>
          <select className={inputCls} value={level} onChange={(e) => setLevel(e.target.value as SponsorLevel)}>
            {SPONSOR_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        {error && <div className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:bg-slate-50">Annuler</button>
          <button type="submit" disabled={create.isPending || !name} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
            {create.isPending ? '…' : 'Ajouter'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function SponsorsPage() {
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

  const sponsors = useQuery({
    queryKey: ['sponsors', tid],
    queryFn: () => apiFetch<Sponsor[]>(`/tournaments/${tid}/sponsors`),
    enabled: !!tid,
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/sponsors/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sponsors', tid] }),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Sponsors</h1>
          <p className="mt-1 text-sm text-muted">Les partenaires qui soutiennent vos tournois.</p>
        </div>
        <div className="flex gap-2">
          {tournaments.data && tournaments.data.length > 0 && (
            <select value={tid} onChange={(e) => setTid(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-brand">
              {tournaments.data.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          <button onClick={() => setOpen(true)} disabled={!tid} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
            <Icon name="plus" className="h-4 w-4" /> Sponsor
          </button>
        </div>
      </div>

      {sponsors.isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-white shadow-card" />
      ) : !sponsors.data?.length ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand"><Icon name="sponsors" className="h-7 w-7" /></div>
          <h2 className="mt-4 text-lg font-bold text-ink">Aucun sponsor</h2>
          <p className="mt-1 text-sm text-muted">Ajoutez vos partenaires — ils apparaîtront sur la page publique du tournoi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sponsors.data.map((s) => {
            const m = levelMeta(s.level);
            return (
              <div key={s.id} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-sm font-bold text-white">{s.name.charAt(0)}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-ink">{s.name}</div>
                  <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.className}`}>{m.label}</span>
                </div>
                <button onClick={() => remove.mutate(s.id)} className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger" aria-label="Supprimer">
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {open && tid && <CreateSponsorModal tid={tid} onClose={() => setOpen(false)} />}
    </div>
  );
}
