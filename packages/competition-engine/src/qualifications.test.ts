import { describe, expect, it } from 'vitest';
import type { PlannedGroup, StandingRow } from '@gboroly/types';
import { determineQualifiedTeams, type GroupResult } from './qualifications.js';

function row(teamId: string, position: number, points: number, gd = 0, gf = 0): StandingRow {
  return {
    teamId,
    played: 3,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: gf,
    goalsAgainst: 0,
    goalDifference: gd,
    points,
    fairPlayPoints: 0,
    position,
  };
}

function group(id: string, name: string, rows: StandingRow[]): GroupResult {
  const g: PlannedGroup = { id, name, teamIds: rows.map((r) => r.teamId) };
  return { group: g, standings: rows };
}

describe('qualifications', () => {
  it('les 2 premiers de chaque groupe se qualifient', () => {
    const groups = [
      group('G-A', 'Groupe A', [row('a1', 1, 9), row('a2', 2, 6), row('a3', 3, 3), row('a4', 4, 0)]),
      group('G-B', 'Groupe B', [row('b1', 1, 9), row('b2', 2, 6), row('b3', 3, 3), row('b4', 4, 0)]),
    ];
    const q = determineQualifiedTeams(groups, { qualifyPerGroup: 2 });
    expect(q.map((x) => x.label).sort()).toEqual(['A1', 'A2', 'B1', 'B2']);
  });

  it('repêche les meilleurs 3es', () => {
    const groups = [
      group('G-A', 'Groupe A', [row('a1', 1, 9), row('a2', 2, 6), row('a3', 3, 4, 2, 5)]),
      group('G-B', 'Groupe B', [row('b1', 1, 9), row('b2', 2, 6), row('b3', 3, 3, 0, 2)]),
      group('G-C', 'Groupe C', [row('c1', 1, 9), row('c2', 2, 6), row('c3', 3, 1, -3, 1)]),
    ];
    const q = determineQualifiedTeams(groups, {
      qualifyPerGroup: 2,
      bestOfRank: { rank: 3, count: 1 },
    });
    // Meilleur 3e = a3 (4 pts > b3 3 > c3 1)
    const repechage = q.filter((x) => x.label.startsWith('meilleur'));
    expect(repechage).toHaveLength(1);
    expect(repechage[0]!.teamId).toBe('a3');
    expect(q).toHaveLength(7); // 2×3 + 1
  });
});
