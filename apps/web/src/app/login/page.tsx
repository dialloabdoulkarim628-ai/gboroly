'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { login, session, ready } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('demo@gboroly.test');
  const [password, setPassword] = useState('gboroly123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && session) router.replace('/dashboard');
  }, [ready, session, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(identifier, password);
      router.replace('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Panneau marque (desktop) */}
      <div className="hidden w-1/2 flex-col justify-between bg-navy p-12 text-white lg:flex">
        <img src="/logo-gboroly-blanc.png" alt="Gboroly" className="h-20 w-auto" />
        <div>
          <h1 className="text-4xl font-extrabold leading-tight">
            Vos tournois,
            <br />
            <span className="text-brand-light">simplement.</span>
          </h1>
          <p className="mt-4 max-w-md text-slate-300">
            Le centre de contrôle de vos compétitions : inscriptions, calendrier, scores,
            classements et paiements — au même endroit.
          </p>
          <p className="mt-6 text-sm font-semibold tracking-wide text-victory">
            ORGANISEZ • GÉREZ • FAITES VIVRE
          </p>
        </div>
        <p className="text-xs text-white/40">© {new Date().getFullYear()} Gboroly · Côte d’Ivoire</p>
      </div>

      {/* Formulaire */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2">
        <div className="mx-auto w-full max-w-sm">
          <img src="/logo-gboroly.png" alt="Gboroly" className="mb-8 h-14 w-auto lg:hidden" />
          <h2 className="text-2xl font-extrabold text-ink">Connexion organisateur</h2>
          <p className="mt-1 text-sm text-muted">Accédez à votre tableau de bord.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Email</label>
              <input
                type="email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full rounded-card border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand"
                placeholder="vous@exemple.com"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-card border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="rounded-card bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-card bg-brand px-4 py-2.5 font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 rounded-card border border-dashed border-brand/30 bg-brand/5 px-4 py-3 text-xs text-muted">
            <span className="font-semibold text-brand">Compte de démo</span> — pré-rempli :
            <br />
            demo@gboroly.test / gboroly123
          </div>
        </div>
      </div>
    </div>
  );
}
