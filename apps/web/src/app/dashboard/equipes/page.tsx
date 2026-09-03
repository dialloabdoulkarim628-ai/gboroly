'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { TEAM_STATUS_META, type Team } from '@/lib/org-types';
import { Icon } from '../_icons';
import { Modal, inputCls, labelCls } from '../_modal';

function CreateTeamModal({ onClose }: { onClose: () => void }) {
  const { apiFetch, activeOrg } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const [f, setF] = useState({ name: '', shortName: '', phone: '' });
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = { name: f.name };
      if (f.shortName) payload.shortName = f.shortName;
      if (f.phone) payload.phone = f.phone;
      return apiFetch<Team>('/teams', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: (team) => {
      qc.invalidateQueries({ queryKey: ['teams', activeOrg?.id] });
      router.push(`/dashboard/equipes/${team.id}`);
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <Modal title="Créer une équipe" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          create.mutate();
        }}
        className="space-y-4"
      >
        <div>
          <label className={labelCls}>Nom de l’équipe *</label>
          <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="FC Abobo" required minLength={2} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nom court</label>
            <input className={inputCls} value={f.shortName} onChange={(e) => setF({ ...f, shortName: e.target.value })} placeholder="ABO" />
          </div>
          <div>
            <label className={labelCls}>Téléphone (capitaine)</label>
            <input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+225…" />
          </div>
        </div>
        {error && <div className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:bg-slate-50">
            Annuler
          </button>
          <button type="submit" disabled={create.isPending} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
            {create.isPending ? 'Création…' : 'Créer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function EquipesPage() {
  const { apiFetch, activeOrg } = useAuth();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['teams', activeOrg?.id],
    queryFn: () => apiFetch<Team[]>('/teams'),
    enabled: !!activeOrg,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Équipes</h1>
          <p className="mt-1 text-sm text-muted">Le référentiel des équipes de votre organisation.</p>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
          <Icon name="plus" className="h-4 w-4" /> Créer une équipe
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white shadow-card" />
          ))}
        </div>
      ) : !data?.length ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <Icon name="teams" className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-ink">Aucune équipe</h2>
          <p className="mt-1 text-sm text-muted">Créez vos équipes pour composer les rosters et les inscrire.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((t) => {
            const m = TEAM_STATUS_META[t.status];
            return (
              <Link key={t.id} href={`/dashboard/equipes/${t.id}`} className="rounded-2xl bg-white p-4 shadow-card transition-shadow hover:shadow-md">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-sm font-bold text-white">
                    {t.name.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-ink">{t.name}</div>
                    {t.shortName && <div className="text-xs text-muted">{t.shortName}</div>}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.className}`}>{m.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {open && <CreateTeamModal onClose={() => setOpen(false)} />}
    </div>
  );
}
