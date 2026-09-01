import type { PublicMatch, TeamRef } from '@/lib/api';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Brouillon', className: 'bg-muted/15 text-muted' },
  PUBLISHED: { label: 'À venir', className: 'bg-brand/10 text-brand' },
  ONGOING: { label: 'En cours', className: 'bg-field/15 text-field' },
  COMPLETED: { label: 'Terminé', className: 'bg-muted/15 text-muted' },
  ARCHIVED: { label: 'Archivé', className: 'bg-muted/15 text-muted' },
  LIVE: { label: 'Live', className: 'bg-energy/15 text-energy' },
  FINISHED: { label: 'Terminé', className: 'bg-muted/15 text-muted' },
  SCHEDULED: { label: 'Programmé', className: 'bg-brand/10 text-brand' },
  POSTPONED: { label: 'Reporté', className: 'bg-victory/20 text-[#8a6100]' },
  CANCELLED: { label: 'Annulé', className: 'bg-danger/10 text-danger' },
  FORFEIT: { label: 'Forfait', className: 'bg-danger/10 text-danger' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, className: 'bg-muted/15 text-muted' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.className}`}>
      {s.label}
    </span>
  );
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return 'À programmer';
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Abidjan',
  }).format(new Date(iso));
}

function TeamLine({ team, score, bold }: { team: TeamRef | null; score: number | null; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`truncate ${bold ? 'font-bold text-ink' : 'text-ink'}`}>
        {team?.name ?? '—'}
      </span>
      <span className={`tabular-nums ${bold ? 'font-bold text-ink' : 'text-ink'}`}>
        {score ?? '–'}
      </span>
    </div>
  );
}

export function MatchCard({ match }: { match: PublicMatch }) {
  const finished = match.status === 'FINISHED' || match.status === 'FORFEIT';
  const homeWon = finished && (match.homeScore ?? 0) > (match.awayScore ?? 0);
  const awayWon = finished && (match.awayScore ?? 0) > (match.homeScore ?? 0);
  return (
    <div className="rounded-card bg-white p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span>{match.round}</span>
        <StatusBadge status={match.status} />
      </div>
      <div className="space-y-1.5">
        <TeamLine team={match.home} score={match.homeScore} bold={homeWon} />
        <TeamLine team={match.away} score={match.awayScore} bold={awayWon} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>{formatDateTime(match.scheduledAt)}</span>
        {match.field ? <span>{match.field}</span> : null}
      </div>
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-muted/30 bg-white/50 p-8 text-center text-sm text-muted">
      {children}
    </div>
  );
}
