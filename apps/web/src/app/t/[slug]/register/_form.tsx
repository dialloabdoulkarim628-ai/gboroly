'use client';

import { useState } from 'react';
import { CLIENT_API_BASE } from '@/lib/api';

interface Category {
  id: string;
  name: string;
}

export function RegisterForm({ slug, categories }: { slug: string; categories: Category[] }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('loading');
    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {
      teamName: String(fd.get('teamName') ?? ''),
      contactName: String(fd.get('contactName') ?? ''),
    };
    const phone = String(fd.get('phone') ?? '').trim();
    const email = String(fd.get('email') ?? '').trim();
    const categoryId = String(fd.get('categoryId') ?? '').trim();
    if (phone) body.phone = phone;
    if (email) body.email = email;
    if (categoryId) body.categoryId = categoryId;

    try {
      const res = await fetch(`${CLIENT_API_BASE}/public/tournaments/${slug}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { message?: string; error?: { message?: string } };
      if (res.ok) {
        setStatus('success');
        setMessage(data.message ?? 'Inscription reçue.');
      } else {
        setStatus('error');
        setMessage(data.error?.message ?? 'Échec de l’inscription.');
      }
    } catch {
      setStatus('error');
      setMessage('Impossible de contacter le serveur.');
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-card bg-field/10 p-6 text-center">
        <div className="text-2xl">✅</div>
        <h2 className="mt-2 text-lg font-bold text-ink">Inscription reçue !</h2>
        <p className="mt-1 text-sm text-muted">{message}</p>
      </div>
    );
  }

  const field = 'w-full rounded-lg border border-muted/30 bg-white px-3 py-2.5 text-sm text-ink';

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-card bg-white p-5 shadow-card">
      <div>
        <label className="mb-1 block text-sm font-semibold text-ink">Nom de l’équipe *</label>
        <input name="teamName" required minLength={2} className={field} placeholder="FC Abobo" />
      </div>
      {categories.length > 1 && (
        <div>
          <label className="mb-1 block text-sm font-semibold text-ink">Catégorie</label>
          <select name="categoryId" className={field} defaultValue={categories[0]?.id}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-semibold text-ink">Responsable *</label>
        <input name="contactName" required minLength={2} className={field} placeholder="Jean Koffi" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-ink">Téléphone</label>
          <input name="phone" className={field} placeholder="+225 07 00 00 00 00" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-ink">Email</label>
          <input name="email" type="email" className={field} placeholder="equipe@exemple.ci" />
        </div>
      </div>
      {status === 'error' && <p className="text-sm text-danger">{message}</p>}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {status === 'loading' ? 'Envoi…' : 'Inscrire mon équipe'}
      </button>
      <p className="text-center text-xs text-muted">
        Votre inscription sera validée par l’organisateur.
      </p>
    </form>
  );
}
