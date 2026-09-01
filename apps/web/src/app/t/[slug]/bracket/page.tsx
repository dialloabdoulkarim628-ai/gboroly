import { getBracket, type BracketNode } from '@/lib/api';
import { EmptyState } from '../_components';

type Params = { params: Promise<{ slug: string }> };

function BracketMatch({ node }: { node: BracketNode }) {
  const homeWon = node.winnerTeamId && node.winnerTeamId === node.homeTeamId;
  const awayWon = node.winnerTeamId && node.winnerTeamId === node.awayTeamId;
  return (
    <div className="rounded-card bg-white p-3 shadow-card">
      <div className={`truncate text-sm ${homeWon ? 'font-bold text-ink' : 'text-muted'}`}>{node.homeLabel}</div>
      <div className="my-1 h-px bg-canvas" />
      <div className={`truncate text-sm ${awayWon ? 'font-bold text-ink' : 'text-muted'}`}>{node.awayLabel}</div>
    </div>
  );
}

export default async function BracketPage({ params }: Params) {
  const { slug } = await params;
  const nodes = (await getBracket(slug)) ?? [];
  if (nodes.length === 0) return <EmptyState>Les phases finales ne sont pas encore générées.</EmptyState>;

  const byRound = new Map<string, BracketNode[]>();
  for (const n of nodes) {
    (byRound.get(n.roundName) ?? byRound.set(n.roundName, []).get(n.roundName)!).push(n);
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-6">
        {[...byRound.entries()].map(([round, matches]) => (
          <div key={round} className="min-w-[200px] flex-1">
            <h2 className="mb-3 text-center text-sm font-bold uppercase tracking-wide text-muted">{round}</h2>
            <div className="flex flex-col justify-around gap-4 h-full">
              {matches.map((n) => (
                <BracketMatch key={n.matchId} node={n} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
