import { describe, expect, it } from 'vitest';
import type { EngineMatch, TeamRef } from '@gboroly/types';
import { MatchStatus } from '@gboroly/types';
import { generateRoundRobinFixtures } from './fixtures.js';
import { calculateStandings } from './standings.js';
import { applyTieBreakers } from './tiebreakers.js';
import { MARACANA_RULES } from './index.js';

const teams: TeamRef[] = [
  { id: 'a', name: 'AS Abidjan' },
  { id: 'b', name: 'FC Cocody' },
  { id: 'c', name: "Espoir d'Yop" },
  { id: 'd', name: 'Racing Club' },
];

describe('round robin', () => {
  it('génère n(n-1)/2 matchs pour n pair', () => {
    const m = generateRoundRobinFixtures(teams, 'r1');
    expect(m).toHaveLength(6); // 4*3/2
  });

  it('chaque équipe joue n-1 matchs', () => {
    const m = generateRoundRobinFixtures(teams, 'r1');
    for (const t of teams) {
      const count = m.filter((x) => x.homeTeamId === t.id || x.awayTeamId === t.id).length;
      expect(count).toBe(3);
    }
  });

  it('gère un nombre impair (bye) : 3 équipes → 3 matchs', () => {
    const m = generateRoundRobinFixtures(teams.slice(0, 3), 'r1');
    expect(m).toHaveLength(3);
    expect(m.every((x) => x.homeTeamId !== '__BYE__' && x.awayTeamId !== '__BYE__')).toBe(true);
  });
});

describe('standings + tiebreakers', () => {
  const played = (home: string, away: string, hs: number, as: number): EngineMatch => ({
    id: `${home}-${away}`,
    roundId: 'r1',
    homeTeamId: home,
    awayTeamId: away,
    status: MatchStatus.FINISHED,
    result: { homeScore: hs, awayScore: as },
  });

  it('calcule points, différence de buts et classe', () => {
    const matches = [
      played('a', 'b', 2, 1), // a gagne
      played('c', 'd', 0, 0), // nul
      played('a', 'c', 3, 0), // a gagne
      played('b', 'd', 1, 1), // nul
    ];
    const raw = calculateStandings(teams, matches, MARACANA_RULES);
    const ranked = applyTieBreakers(raw, matches, MARACANA_RULES);
    expect(ranked[0]!.teamId).toBe('a'); // 6 pts
    expect(ranked[0]!.points).toBe(6);
    expect(ranked[0]!.goalDifference).toBe(4);
  });

  it('départage par confrontation directe à points égaux', () => {
    const two: TeamRef[] = [
      { id: 'x', name: 'X' },
      { id: 'y', name: 'Y' },
    ];
    const matches = [played('x', 'y', 1, 0)]; // x bat y, mêmes stats sinon
    const ranked = applyTieBreakers(
      calculateStandings(two, matches, MARACANA_RULES),
      matches,
      MARACANA_RULES,
    );
    expect(ranked[0]!.teamId).toBe('x');
  });
});
