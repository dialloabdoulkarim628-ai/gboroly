'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { inputCls, labelCls } from '../_modal';

export default function ParametresPage() {
  const { activeOrg, apiFetch, refreshOrgs } = useAuth();
  const [form, setForm] = useState({
    name: activeOrg?.name ?? '',
    city: activeOrg?.city ?? '',
    country: activeOrg?.country ?? 'CI',
    currency: activeOrg?.currency ?? 'XOF',
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrg) return;
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      await apiFetch(`/organizations/${activeOrg.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.name,
          city: form.city || undefined,
          country: form.country,
          currency: form.currency,
        }),
      });
      await refreshOrgs();
      setNotice('✓ Modifications enregistrées.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Paramètres</h1>
        <p className="mt-1 text-sm text-muted">Les informations de votre organisation.</p>
      </div>

      <form onSubmit={save} className="space-y-5 rounded-2xl bg-white p-6 shadow-card">
        <div>
          <label className={labelCls}>Nom de l’organisation *</label>
          <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} required minLength={2} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Ville</label>
            <input className={inputCls} value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Abidjan" />
          </div>
          <div>
            <label className={labelCls}>Pays</label>
            <input className={inputCls} value={form.country} onChange={(e) => set('country', e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Devise</label>
          <input className={inputCls} value={form.currency} onChange={(e) => set('currency', e.target.value)} maxLength={3} />
        </div>

        {notice && <div className="rounded-xl bg-field/10 px-4 py-2.5 text-sm font-medium text-field">{notice}</div>}
        {error && <div className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 text-sm">
        <h2 className="mb-2 font-bold text-ink">Votre rôle</h2>
        <p className="text-muted">
          Vous êtes <span className="font-semibold text-brand">{activeOrg?.role === 'ORGANIZATION_OWNER' ? 'Propriétaire' : activeOrg?.role}</span> de cette organisation.
        </p>
      </div>
    </div>
  );
}
