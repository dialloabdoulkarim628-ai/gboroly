import { describe, expect, it } from 'vitest';
import type { TeamRef } from '@gboroly/types';
import {
  advanceKnockout,
  generateSingleElimination,
  nextPowerOfTwo,
  resolveWinner,
  seedOrder,
} from './knockout.js';
import { winFor } from './test-helpers.js';

function teams(n: number): TeamRef[] {
  return Array.from({ length: n }, (_, i) => ({ id: `t${i + 1}`, name: `T${i + 1}`, seed: i + 1 }));
}

describe('utilitaires de bracket', () => {
  it('nextPowerOfTwo', () => {
    expect(nextPowerOfTwo(3)).toBe(4);
    expect(nextPowerOfTwo(8)).toBe(8);
    expect(nextPowerOfTwo(9)).toBe(16);
  });

  it('seedOrder standard', () => {
    expect(seedOrder(2)).toEqual([1, 2]);
    expect(seedOrder(4)).toEqual([1, 4, 2, 3]);
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });
});

describe('single elimination — 4 équipes', () => {
  it('structure : 2 demies + 1 finale', () => {
    const { rounds, matches } = generateSingleElimination(teams(4));
    expect(rounds).toHaveLength(2);
    expect(matches).toHaveLength(3);
    expect(rounds.at(-1)!.name).toBe('Finale');
  });

  it('déroule jusqu’au champion', () => {
    let { matches } = generateSingleElimination(teams(4));
    // R1 : t1 vs t4, t2 vs t3 → t1 et t2 gagnent
    matches = matches.map((m) =>
      m.roundId === 'KO-R1' ? winFor(m, m.homeTeamId!) : m,
    );
    advanceKnockout(matches);
    const final = matches.find((m) => m.roundId === 'KO-R2')!;
    expect(final.homeTeamId).toBe('t1');
    expect(final.awayTeamId).toBe('t2');
    const played = matches.map((m) => (m.id === final.id ? winFor(m, 't1') : m));
    expect(resolveWinner(played.find((m) => m.id === final.id)!)).toBe('t1');
  });
});

describe('single elimination — byes (3 équipes)', () => {
  it('la tête de série passe le 1er tour automatiquement', () => {
    const { matches } = generateSingleElimination(teams(3));
    const final = matches.find((m) => m.roundId === 'KO-R2')!;
    // t1 (seed1) affronte un bye → placé directement en finale.
    expect(final.homeTeamId).toBe('t1');
    const r1Real = matches.find((m) => m.roundId === 'KO-R1' && m.homeTeamId && m.awayTeamId);
    expect(r1Real).toBeTruthy();
  });
});

describe('nul en knockout', () => {
  it('score nul sans tirs au but → pas de vainqueur', () => {
    const { matches } = generateSingleElimination(teams(4));
    const m = { ...matches[0]!, result: { homeScore: 1, awayScore: 1 }, status: 'FINISHED' as const };
    expect(resolveWinner(m)).toBeUndefined();
  });

  it('tirs au but départagent', () => {
    const { matches } = generateSingleElimination(teams(4));
    const m = {
      ...matches[0]!,
      result: { homeScore: 1, awayScore: 1, homePenalties: 4, awayPenalties: 2 },
      status: 'FINISHED' as const,
    };
    expect(resolveWinner(m)).toBe(m.homeTeamId);
  });
});
