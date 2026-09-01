import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTournament } from '@/lib/api';
import { StatusBadge } from './_components';
import { NavTabs } from './_nav';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTournament(slug);
  if (!t) return { title: 'Tournoi introuvable — Gboroly' };
  const place = [t.city, t.country].filter(Boolean).join(', ');
  const description = t.description ?? `${t.sport.name} — ${place}. Suivez matchs, résultats et classement en direct.`;
  const title = `${t.name} — Gboroly`;
  return {
    title,
    description,
    alternates: { canonical: `/t/${t.slug}` },
    openGraph: {
      title,
      description,
      type: 'website',
      images: t.bannerUrl ? [{ url: t.bannerUrl }] : undefined,
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function TournamentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTournament(slug);
  if (!t) notFound();
  const place = [t.city, t.country].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen bg-canvas">
      <header className="bg-navy text-white">
        <div className="mx-auto max-w-4xl px-4 pt-6">
          <div className="flex items-start gap-4">
            {t.logoUrl ? (
              <img src={t.logoUrl} alt="" className="h-16 w-16 rounded-card object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-card bg-white/10 text-2xl font-extrabold">
                {t.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <StatusBadge status={t.status} />
                <span className="text-xs text-white/60">{t.sport.name}</span>
              </div>
              <h1 className="truncate text-2xl font-extrabold leading-tight">{t.name}</h1>
              <p className="text-sm text-white/70">
                {place}
                {t.startDate
                  ? ` · ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(t.startDate))}`
                  : ''}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <NavTabs slug={slug} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-4xl px-4 py-8 text-center text-xs text-muted">
        Propulsé par <span className="font-semibold text-brand">Gboroly</span> — Organisez • Gérez • Faites vivre
      </footer>
    </div>
  );
}
