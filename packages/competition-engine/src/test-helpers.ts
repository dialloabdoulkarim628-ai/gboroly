import type { EngineMatch } from '@gboroly/types';
import { MatchStatus } from '@gboroly/types';

/** Applique un score et marque le match terminé (helper de test). */
export function setResult(
  match: EngineMatch,
  homeScore: number,
  awayScore: number,
  pen?: [number, number],
): EngineMatch {
  return {
    ...match,
    status: MatchStatus.FINISHED,
    result: {
      homeScore,
      awayScore,
      homePenalties: pen?.[0],
      awayPenalties: pen?.[1],
    },
  };
}

/** Fait gagner `winnerId` dans un match (2-0), en respectant home/away. */
export function winFor(match: EngineMatch, winnerId: string): EngineMatch {
  if (match.homeTeamId === winnerId) return setResult(match, 2, 0);
  if (match.awayTeamId === winnerId) return setResult(match, 0, 2);
  throw new Error(`${winnerId} ne joue pas dans ${match.id}`);
}
