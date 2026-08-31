import { describe, expect, it } from 'vitest';
import type { EngineMatch, TeamRef } from '@gboroly/types';
import { MatchStatus } from '@gboroly/types';
import { applyForfeit } from './forfeit.js';
import { calculateStandings } from './standings.js';
import { applyTieBreakers } from './tiebreakers.js';
import { MARACANA_RULES } from './index.js';

const match: EngineMatch = {
  id: 'm1',
  roundId: 'r1',
  homeTeamId: 'a',
  awayTeamId: 'b',
  status: MatchStatus.SCHEDULED,
};

describe('forfait', () => {
  it('score administratif au bénéfice de l’équipe présente', () => {
    const r = applyForfeit(match, 'b'); // b déclare forfait
    expect(r.status).toBe(MatchStatus.FINISHED);
    expect(r.resultType).toBe('FORFEIT');
    expect(r.winnerRef).toBe('a');
    expect(r.result).toEqual({ homeScore: 3, awayScore: 0 });
  });

  it('impacte le classement (défaite pour le forfait)', () => {
    const teamRefs: TeamRef[] = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ];
    const played = [applyForfeit(match, 'b')];
    const table = applyTieBreakers(
      calculateStandings(teamRefs, played, MARACANA_RULES),
      played,
      MARACANA_RULES,
    );
    expect(table[0]!.teamId).toBe('a');
    expect(table[0]!.points).toBe(3);
    expect(table.find((t) => t.teamId === 'b')!.losses).toBe(1);
  });

  it('refuse un forfait d’une équipe absente du match', () => {
    expect(() => applyForfeit(match, 'x')).toThrow();
  });
});
