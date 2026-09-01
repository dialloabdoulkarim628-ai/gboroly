import { getMatches } from '@/lib/api';
import { EmptyState, MatchCard } from '../_components';

type Params = { params: Promise<{ slug: string }> };

function dayKey(iso?: string | null): string {
  if (!iso) return 'À programmer';
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Africa/Abidjan',
  }).format(new Date(iso));
}

export default async function MatchesPage({ params }: Params) {
  const { slug } = await params;
  const matches = (await getMatches(slug)) ?? [];
  if (matches.length === 0) return <EmptyState>Le calendrier n’est pas encore publié.</EmptyState>;

  const byDay = new Map<string, typeof matches>();
  for (const m of matches) {
    const k = dayKey(m.scheduledAt);
    (byDay.get(k) ?? byDay.set(k, []).get(k)!).push(m);
  }

  return (
    <div className="space-y-6">
      {[...byDay.entries()].map(([day, dayMatches]) => (
        <section key={day}>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">{day}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {dayMatches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
