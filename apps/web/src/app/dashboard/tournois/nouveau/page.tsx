'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import type { Tournament } from '@/lib/org-types';
import { Icon } from '../../_icons';

const field = 'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand';
const label = 'mb-1 block text-sm font-medium text-ink';

export default function NouveauTournoiPage() {
  const { apiFetch, activeOrg } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    name: '',
    country: 'CI',
    city: '',
    description: '',
    startDate: '',
    endDate: '',
    visibility: 'PRIVATE' as 'PUBLIC' | 'PRIVATE',
    currency: 'XOF',
    maxTeams: '',
    registrationFee: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        country: form.country,
        visibility: form.visibility,
        currency: form.currency,
      };
      if (form.city) payload.city = form.city;
      if (form.description) payload.description = form.description;
      if (form.startDate) payload.startDate = form.startDate;
      if (form.endDate) payload.endDate = form.endDate;
      if (form.maxTeams) payload.maxTeams = Number(form.maxTeams);
      if (form.registrationFee) payload.registrationFee = Number(form.registrationFee);

      const created = await apiFetch<Tournament>('/tournaments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await qc.invalidateQueries({ queryKey: ['tournaments', activeOrg?.id] });
      router.push(`/dashboard/tournois/${created.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/tournois" className="text-sm font-semibold text-brand hover:underline">
          ← Mes tournois
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold text-ink">Créer un tournoi</h1>
        <p className="mt-1 text-sm text-muted">Le tournoi est créé en brouillon — vous pourrez le compléter puis le publier.</p>
      </div>

      <form onSubmit={submit} className="space-y-5 rounded-2xl bg-white p-6 shadow-card">
        <div>
          <label className={label}>Nom du tournoi *</label>
          <input
            className={field}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Maracana Cup Abidjan 2026"
            required
            minLength={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Pays *</label>
            <input className={field} value={form.country} onChange={(e) => set('country', e.target.value)} required />
          </div>
          <div>
            <label className={label}>Ville</label>
            <input className={field} value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Abidjan" />
          </div>
        </div>

        <div>
          <label className={label}>Description</label>
          <textarea
            className={`${field} min-h-[80px]`}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Présentez votre tournoi…"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Date de début</label>
            <input type="date" className={field} value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
          </div>
          <div>
            <label className={label}>Date de fin</label>
            <input type="date" className={field} value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Nombre max d’équipes</label>
            <input type="number" min={2} className={field} value={form.maxTeams} onChange={(e) => set('maxTeams', e.target.value)} placeholder="16" />
          </div>
          <div>
            <label className={label}>Frais d’inscription ({form.currency})</label>
            <input type="number" min={0} className={field} value={form.registrationFee} onChange={(e) => set('registrationFee', e.target.value)} placeholder="50000" />
          </div>
        </div>

        <div>
          <label className={label}>Visibilité</label>
          <div className="flex gap-3">
            {(['PRIVATE', 'PUBLIC'] as const).map((v) => (
              <button
                type="button"
                key={v}
                onClick={() => set('visibility', v)}
                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                  form.visibility === v ? 'border-brand bg-brand/5 text-brand' : 'border-slate-200 text-muted hover:bg-slate-50'
                }`}
              >
                {v === 'PRIVATE' ? 'Privé' : 'Public'}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">
            Un tournoi doit être public pour apparaître sur la page de découverte une fois publié.
          </p>
        </div>

        {error && <div className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}

        <div className="flex justify-end gap-3">
          <Link href="/dashboard/tournois" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:bg-slate-50">
            Annuler
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {saving ? 'Création…' : 'Créer le tournoi'}
          </button>
        </div>
      </form>
    </div>
  );
}
