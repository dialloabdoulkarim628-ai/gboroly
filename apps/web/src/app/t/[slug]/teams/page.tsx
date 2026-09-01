import { getTeams } from '@/lib/api';
import { EmptyState } from '../_components';

type Params = { params: Promise<{ slug: string }> };

export default async function TeamsPage({ params }: Params) {
  const { slug } = await params;
  const teams = (await getTeams(slug)) ?? [];
  if (teams.length === 0) return <EmptyState>Aucune équipe validée pour l’instant.</EmptyState>;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {teams.map((r) => (
        <div key={r.registrationId} className="flex items-center gap-3 rounded-card bg-white p-3 shadow-card">
          {r.team.logoUrl ? (
            <img src={r.team.logoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 font-bold text-brand">
              {r.team.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-ink">{r.team.name}</div>
            <div className="text-xs text-muted">{r.category}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
