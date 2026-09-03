'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import type { Announcement, Tournament } from '@/lib/org-types';
import { Icon } from '../_icons';
import { Modal, inputCls, labelCls } from '../_modal';

function fmt(iso?: string | null) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

function CreateAnnouncementModal({ tid, onClose }: { tid: string; onClose: () => void }) {
  const { apiFetch } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => apiFetch(`/tournaments/${tid}/announcements`, { method: 'POST', body: JSON.stringify({ title, body }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements', tid] });
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <Modal title="Nouvelle annonce" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); setError(null); create.mutate(); }} className="space-y-4">
        <div>
          <label className={labelCls}>Titre *</label>
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Report du match de 15h" required minLength={2} />
        </div>
        <div>
          <label className={labelCls}>Message *</label>
          <textarea className={`${inputCls} min-h-[120px]`} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Votre message aux équipes et au public…" required />
        </div>
        {error && <div className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:bg-slate-50">Annuler</button>
          <button type="submit" disabled={create.isPending || !title || !body} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
            {create.isPending ? 'Publication…' : 'Publier'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function CommunicationsPage() {
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

  const announcements = useQuery({
    queryKey: ['announcements', tid],
    queryFn: () => apiFetch<Announcement[]>(`/tournaments/${tid}/announcements`),
    enabled: !!tid,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Communications</h1>
          <p className="mt-1 text-sm text-muted">Publiez des annonces — visibles sur la page publique du tournoi.</p>
        </div>
        <div className="flex gap-2">
          {tournaments.data && tournaments.data.length > 0 && (
            <select value={tid} onChange={(e) => setTid(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-brand">
              {tournaments.data.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          <button onClick={() => setOpen(true)} disabled={!tid} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
            <Icon name="plus" className="h-4 w-4" /> Annonce
          </button>
        </div>
      </div>

      {announcements.isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-white shadow-card" />
      ) : !announcements.data?.length ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand"><Icon name="comms" className="h-7 w-7" /></div>
          <h2 className="mt-4 text-lg font-bold text-ink">Aucune annonce</h2>
          <p className="mt-1 text-sm text-muted">Publiez votre première annonce pour informer équipes et supporters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.data.map((a) => (
            <div key={a.id} className="rounded-2xl bg-white p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-bold text-ink">{a.title}</h2>
                <span className="whitespace-nowrap text-xs text-muted">{fmt(a.publishedAt ?? a.createdAt)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{a.body}</p>
            </div>
          ))}
        </div>
      )}

      {open && tid && <CreateAnnouncementModal tid={tid} onClose={() => setOpen(false)} />}
    </div>
  );
}
