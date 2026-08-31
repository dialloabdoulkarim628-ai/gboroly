import { describe, expect, it } from 'vitest';
import type { EngineMatch, TeamRef } from '@gboroly/types';
import {
  advanceDoubleElimination,
  generateDoubleElimination,
} from './double-elimination.js';
import { resolveWinner } from './knockout.js';

function teams(n: number): TeamRef[] {
  return Array.from({ length: n }, (_, i) => ({ id: `t${i + 1}`, name: `T${i + 1}`, seed: i + 1 }));
}

function play(matches: EngineMatch[], id: string, winnerId: string): void {
  const m = matches.find((x) => x.id === id)!;
  const homeWins = m.homeTeamId === winnerId;
  m.status = 'FINISHED';
  m.result = { homeScore: homeWins ? 2 : 0, awayScore: homeWins ? 0 : 2 };
  advanceDoubleElimination(matches);
}

describe('double élimination — 4 équipes', () => {
  it('génère la structure (WB + LB + grande finale)', () => {
    const { rounds, matches } = generateDoubleElimination(teams(4));
    expect(matches).toHaveLength(6);
    expect(rounds.at(-1)!.name).toBe('Grande finale');
  });

  it('déroule jusqu’au champion (le perdant survit via les losers)', () => {
    const { matches } = generateDoubleElimination(teams(4));
    play(matches, 'DE-WB1m0', 't1'); // t1 > t4
    play(matches, 'DE-WB1m1', 't2'); // t2 > t3
    // WB final : t1 vs t2
    expect(matches.find((m) => m.id === 'DE-WB2m0')!.homeTeamId).toBe('t1');
    play(matches, 'DE-WB2m0', 't1'); // t1 > t2 (t2 tombe en losers)
    // LB1 : t4 vs t3
    expect(matches.find((m) => m.id === 'DE-LB1m0')!.homeTeamId).toBe('t4');
    play(matches, 'DE-LB1m0', 't3'); // t3 > t4
    // LB final : t2 (perdant WB final) vs t3
    const lbFinal = matches.find((m) => m.id === 'DE-LB2m0')!;
    expect(lbFinal.homeTeamId).toBe('t2');
    expect(lbFinal.awayTeamId).toBe('t3');
    play(matches, 'DE-LB2m0', 't2');
    // Grande finale : t1 vs t2
    const gf = matches.find((m) => m.id === 'DE-GF')!;
    expect(gf.homeTeamId).toBe('t1');
    expect(gf.awayTeamId).toBe('t2');
    play(matches, 'DE-GF', 't1');
    expect(resolveWinner(matches.find((m) => m.id === 'DE-GF')!)).toBe('t1');
  });
});

describe('double élimination — 8 équipes', () => {
  it('structure : 14 matchs, advance idempotent', () => {
    const { matches } = generateDoubleElimination(teams(8));
    expect(matches).toHaveLength(14);
    const before = JSON.stringify(matches);
    advanceDoubleElimination(matches);
    advanceDoubleElimination(matches);
    expect(JSON.stringify(matches)).toBe(before); // idempotent sans nouveaux résultats
  });

  it('refuse les tailles non supportées', () => {
    expect(() => generateDoubleElimination(teams(6))).toThrow();
  });
});
