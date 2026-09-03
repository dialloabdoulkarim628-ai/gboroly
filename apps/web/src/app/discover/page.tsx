import Link from 'next/link';
import type { Metadata } from 'next';
import { getDiscover, type DiscoverItem } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Découvrir les tournois — Gboroly',
  description: 'Trouvez un tournoi de Maracana près de chez vous et inscrivez votre équipe.',
};

function fmtFee(fee: number | null, currency: string): string {
  if (fee == null || fee === 0) return 'Gratuit';
  return `${fee.toLocaleString('fr-FR')} ${currency}`;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return 'Dates à venir';
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}

function Card({ t }: { t: DiscoverItem }) {
  return (
    <Link
      href={`/t/${t.slug}`}
      className="block rounded-card bg-white p-4 shadow-card transition-shadow hover:shadow-md"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted">{t.sport.name}</span>
        {t.registrationOpen ? (
          <span className="rounded-full bg-field/15 px-2.5 py-0.5 text-xs font-semibold text-field">
            Inscriptions ouvertes
          </span>
        ) : (
          <span className="rounded-full bg-muted/15 px-2.5 py-0.5 text-xs font-semibold text-muted">Fermé</span>
        )}
      </div>
      <h2 className="truncate text-lg font-bold text-ink">{t.name}</h2>
      <p className="text-sm text-muted">
        {[t.city, t.country].filter(Boolean).join(', ')} · {fmtDate(t.startDate)}
      </p>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-muted">
          {t.teams.approved}
          {t.teams.max ? `/${t.teams.max}` : ''} équipes
        </span>
        <span className="font-semibold text-brand">{fmtFee(t.registrationFee, t.currency)}</span>
      </div>
    </Link>
  );
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; openOnly?: string }>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  if (sp.q) params.set('q', sp.q);
  if (sp.openOnly) params.set('openOnly', 'true');
  const qs = params.toString() ? `?${params.toString()}` : '';
  const data = await getDiscover(qs);
  const items = data?.items ?? [];

  return (
    <div className="min-h-screen bg-canvas">
      <header className="bg-navy px-4 py-8 text-white">
        <div className="mx-auto max-w-4xl">
          <Link href="/" className="mb-6 inline-block">
            <img src="/logo-gboroly-blanc.png" alt="Gboroly" className="h-9 w-auto" />
          </Link>
          <h1 className="text-3xl font-extrabold">Découvrir les tournois</h1>
          <p className="mt-1 text-white/70">Trouvez un tournoi et inscrivez votre équipe en quelques clics.</p>
          <form className="mt-4 flex gap-2" action="/discover" method="get">
            <input
              name="q"
              defaultValue={sp.q ?? ''}
              placeholder="Rechercher un tournoi…"
              className="flex-1 rounded-full px-4 py-2.5 text-sm text-ink"
            />
            <button className="rounded-full bg-energy px-5 py-2.5 text-sm font-semibold text-white">
              Rechercher
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        {items.length === 0 ? (
          <div className="rounded-card border border-dashed border-muted/30 bg-white/50 p-10 text-center text-sm text-muted">
            Aucun tournoi trouvé pour le moment.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((t) => (
              <Card key={t.id} t={t} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
