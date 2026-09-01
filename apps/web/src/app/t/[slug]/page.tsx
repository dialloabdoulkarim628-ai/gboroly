import Link from 'next/link';
import { getMatches, getTournament } from '@/lib/api';
import { EmptyState, MatchCard } from './_components';

type Params = { params: Promise<{ slug: string }> };

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-card bg-white p-4 text-center shadow-card">
      <div className="text-2xl font-extrabold text-ink">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

export default async function OverviewPage({ params }: Params) {
  const { slug } = await params;
  const [t, matches] = await Promise.all([getTournament(slug), getMatches(slug)]);
  const list = matches ?? [];
  const upcoming = list.filter((m) => m.status === 'SCHEDULED').slice(0, 4);
  const results = list.filter((m) => m.status === 'FINISHED' || m.status === 'FORFEIT').slice(-4).reverse();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Équipes" value={t?.stats.teams ?? 0} />
        <Stat label="Matchs joués" value={t?.stats.matchesPlayed ?? 0} />
        <Stat label="Matchs" value={t?.stats.matchesTotal ?? 0} />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Prochains matchs</h2>
          <Link href={`/t/${slug}/matches`} className="text-sm font-semibold text-brand">
            Voir tout
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState>Aucun match à venir pour le moment.</EmptyState>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </section>

      {results.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-ink">Derniers résultats</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {results.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
