import type { EngineMatch, TeamRef } from '@gboroly/types';
import { MatchStatus } from '@gboroly/types';

/**
 * Round Robin (algorithme du cercle / berger tables).
 * n équipes → n(n-1)/2 matchs, chaque équipe joue n-1 fois.
 * Gère un nombre impair d'équipes via un "bye" (adversaire fictif).
 */
export function generateRoundRobinFixtures(
  teams: TeamRef[],
  roundId: string,
  options: { groupId?: string; doubleRound?: boolean } = {},
): EngineMatch[] {
  const ids = teams.map((t) => t.id);
  const hasBye = ids.length % 2 !== 0;
  if (hasBye) ids.push('__BYE__');

  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;
  const matches: EngineMatch[] = [];
  const rotation = [...ids];
  let counter = 0;

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const home = rotation[i]!;
      const away = rotation[n - 1 - i]!;
      if (home !== '__BYE__' && away !== '__BYE__') {
        matches.push(buildMatch(counter++, roundId, home, away, options.groupId));
      }
    }
    // rotation : la 1re équipe reste fixe, les autres tournent
    rotation.splice(1, 0, rotation.pop()!);
  }

  if (options.doubleRound) {
    const returnLeg = matches.map((m, idx) =>
      buildMatch(counter + idx, roundId, m.awayTeamId!, m.homeTeamId!, options.groupId),
    );
    matches.push(...returnLeg);
  }

  return matches;
}

function buildMatch(
  seq: number,
  roundId: string,
  homeTeamId: string,
  awayTeamId: string,
  groupId?: string,
): EngineMatch {
  return {
    id: `${roundId}-m${seq}`,
    roundId,
    groupId,
    homeTeamId,
    awayTeamId,
    status: MatchStatus.SCHEDULED,
  };
}
