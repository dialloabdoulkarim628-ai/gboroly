import { describe, expect, it } from 'vitest';
import type { TeamRef } from '@gboroly/types';
import { distributeIntoGroups, generateGroupStageFixtures, groupStandings } from './groups.js';
import { MARACANA_RULES } from './index.js';
import { setResult } from './test-helpers.js';

function teams(n: number): TeamRef[] {
  return Array.from({ length: n }, (_, i) => ({ id: `t${i + 1}`, name: `T${i + 1}`, seed: i + 1 }));
}

describe('distribution en groupes', () => {
  it('répartit 8 équipes en 4 groupes équilibrés (serpent)', () => {
    const groups = distributeIntoGroups(teams(8), 4);
    expect(groups).toHaveLength(4);
    expect(groups.every((g) => g.teamIds.length === 2)).toBe(true);
    const all = groups.flatMap((g) => g.teamIds);
    expect(new Set(all).size).toBe(8);
    // Serpent : la tête de série 1 et la 8 tombent dans le même groupe.
    expect(groups[0]!.teamIds).toContain('t1');
    expect(groups[0]!.teamIds).toContain('t8');
  });

  it('16 équipes en 4 groupes de 4', () => {
    const groups = distributeIntoGroups(teams(16), 4);
    expect(groups.every((g) => g.teamIds.length === 4)).toBe(true);
  });
});

describe('fixtures de poules', () => {
  it('round robin dans chaque groupe (4 équipes → 6 matchs/groupe)', () => {
    const groups = distributeIntoGroups(teams(8), 2); // 2 groupes de 4
    const matches = generateGroupStageFixtures(groups, 'GS-R1');
    expect(matches).toHaveLength(12); // 2 × 6
    const ids = matches.map((m) => m.id);
    expect(new Set(ids).size).toBe(12); // ids uniques
  });
});

describe('classement de groupe', () => {
  it('classe correctement après résultats', () => {
    const groups = distributeIntoGroups(teams(4), 1); // 1 groupe de 4
    const g = groups[0]!;
    let matches = generateGroupStageFixtures(groups, 'GS-R1');
    // t1 gagne tout, t2 gagne 2, etc.
    matches = matches.map((m) => {
      if (m.homeTeamId === 't1') return setResult(m, 3, 0);
      if (m.awayTeamId === 't1') return setResult(m, 0, 3);
      if (m.homeTeamId === 't2') return setResult(m, 2, 0);
      if (m.awayTeamId === 't2') return setResult(m, 0, 2);
      if (m.homeTeamId === 't3') return setResult(m, 1, 0);
      if (m.awayTeamId === 't3') return setResult(m, 0, 1);
      return setResult(m, 0, 0);
    });
    const table = groupStandings(g, matches, MARACANA_RULES);
    expect(table[0]!.teamId).toBe('t1');
    expect(table[0]!.position).toBe(1);
    expect(table.at(-1)!.teamId).toBe('t4');
  });
});
