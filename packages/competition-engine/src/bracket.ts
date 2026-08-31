import type { BracketNode, EngineMatch, PlannedRound } from '@gboroly/types';
import { resolveWinner } from './knockout.js';

/**
 * Construit une vue bracket (pour affichage) à partir des rounds + matchs.
 * Représentation des données du moteur — pas un système séparé.
 */
export function buildBracketView(
  rounds: PlannedRound[],
  matches: EngineMatch[],
  labelFor: (teamId: string) => string = (id) => id,
): BracketNode[] {
  const roundById = new Map(rounds.map((r) => [r.id, r]));
  return matches
    .map((m): BracketNode => {
      const round = roundById.get(m.roundId);
      return {
        matchId: m.id,
        roundName: round?.name ?? m.roundId,
        roundOrder: round?.order ?? 0,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        homeLabel: m.homeTeamId ? labelFor(m.homeTeamId) : slotLabel(m.homeSourceRef),
        awayLabel: m.awayTeamId ? labelFor(m.awayTeamId) : slotLabel(m.awaySourceRef),
        winnerTeamId: resolveWinner(m),
      };
    })
    .sort((a, b) => a.roundOrder - b.roundOrder || a.matchId.localeCompare(b.matchId));
}

function slotLabel(ref?: string): string {
  if (!ref) return '—';
  const [kind, value] = ref.split(':');
  if (kind === 'seed') return `Tête de série ${value}`;
  if (kind === 'winner') return `Vainqueur ${value}`;
  if (kind === 'loser') return `Perdant ${value}`;
  if (kind === 'group') return value ?? '—';
  return ref;
}
