import type { EngineMatch } from '@gboroly/types';
import { MatchStatus } from '@gboroly/types';

export interface ForfeitScore {
  winnerGoals: number;
  loserGoals: number;
}

const DEFAULT_FORFEIT: ForfeitScore = { winnerGoals: 3, loserGoals: 0 };

/**
 * Applique un forfait : score administratif au bénéfice de l'équipe présente.
 * Fonction pure. Voir docs/BUSINESS-RULES.md §8.
 */
export function applyForfeit(
  match: EngineMatch,
  forfeitingTeamId: string,
  score: ForfeitScore = DEFAULT_FORFEIT,
): EngineMatch {
  if (match.homeTeamId !== forfeitingTeamId && match.awayTeamId !== forfeitingTeamId) {
    throw new Error('L’équipe forfait ne participe pas à ce match');
  }
  const homeForfeits = match.homeTeamId === forfeitingTeamId;
  const winnerId = homeForfeits ? match.awayTeamId : match.homeTeamId;
  return {
    ...match,
    status: MatchStatus.FINISHED,
    resultType: 'FORFEIT',
    forfeitTeamId: forfeitingTeamId,
    winnerRef: winnerId,
    result: {
      homeScore: homeForfeits ? score.loserGoals : score.winnerGoals,
      awayScore: homeForfeits ? score.winnerGoals : score.loserGoals,
    },
  };
}
