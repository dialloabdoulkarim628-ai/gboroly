import { getStandings, type PublicStanding } from '@/lib/api';
import { EmptyState } from '../_components';

type Params = { params: Promise<{ slug: string }> };

function StandingsTable({ rows }: { rows: PublicStanding[] }) {
  return (
    <div className="overflow-x-auto rounded-card bg-white shadow-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-canvas text-xs text-muted">
            <th className="px-3 py-2 text-left font-semibold">#</th>
            <th className="px-3 py-2 text-left font-semibold">Équipe</th>
            <th className="px-2 py-2 text-center font-semibold">J</th>
            <th className="px-2 py-2 text-center font-semibold">G</th>
            <th className="px-2 py-2 text-center font-semibold">N</th>
            <th className="px-2 py-2 text-center font-semibold">P</th>
            <th className="px-2 py-2 text-center font-semibold">Diff</th>
            <th className="px-2 py-2 text-center font-bold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.team.name + r.position} className="border-b border-canvas/60 last:border-0">
              <td className="px-3 py-2 text-muted">{r.position}</td>
              <td className="px-3 py-2 font-semibold text-ink">{r.team.name}</td>
              <td className="px-2 py-2 text-center tabular-nums">{r.played}</td>
              <td className="px-2 py-2 text-center tabular-nums">{r.wins}</td>
              <td className="px-2 py-2 text-center tabular-nums">{r.draws}</td>
              <td className="px-2 py-2 text-center tabular-nums">{r.losses}</td>
              <td className="px-2 py-2 text-center tabular-nums">
                {r.goalDifference > 0 ? `+${r.goalDifference}` : r.goalDifference}
              </td>
              <td className="px-2 py-2 text-center font-bold tabular-nums text-ink">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function StandingsPage({ params }: Params) {
  const { slug } = await params;
  const standings = (await getStandings(slug)) ?? [];
  if (standings.length === 0) return <EmptyState>Le classement sera disponible après les premiers matchs.</EmptyState>;

  const byGroup = new Map<string, PublicStanding[]>();
  for (const s of standings) {
    const k = s.group ?? 'Classement';
    (byGroup.get(k) ?? byGroup.set(k, []).get(k)!).push(s);
  }

  return (
    <div className="space-y-6">
      {[...byGroup.entries()].map(([group, rows]) => (
        <section key={group}>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{group}</h2>
          <StandingsTable rows={rows} />
        </section>
      ))}
    </div>
  );
}
