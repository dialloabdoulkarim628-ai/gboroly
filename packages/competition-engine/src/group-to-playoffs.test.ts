import { describe, expect, it } from 'vitest';
import type { EngineMatch, TeamRef } from '@gboroly/types';
import {
  buildPlayoffsFromQualifiers,
  computeGroupResults,
  planGroupStage,
} from './group-to-playoffs.js';
import { determineQualifiedTeams } from './qualifications.js';
import { advanceKnockout, resolveWinner } from './knockout.js';
import { MARACANA_RULES } from './index.js';

function teams(n: number): TeamRef[] {
  return Array.from({ length: n }, (_, i) => ({ id: `t${i + 1}`, name: `T${i + 1}`, seed: i + 1 }));
}

/** Fait gagner l'équipe de plus petit index (t1<t2<…) dans chaque match. */
function playByRank(matches: EngineMatch[]): EngineMatch[] {
  return matches.map((m) => {
    const home = Number(m.homeTeamId!.slice(1));
    const away = Number(m.awayTeamId!.slice(1));
    const homeWins = home < away;
    return {
      ...m,
      status: 'FINISHED' as const,
      result: { homeScore: homeWins ? 2 : 0, awayScore: homeWins ? 0 : 2 },
    };
  });
}

describe('group → playoffs (bout en bout)', () => {
  it('8 équipes, 4 groupes de 2, top-1 → demi-finales → champion', () => {
    const plan = planGroupStage(teams(8), 4);
    expect(plan.groups).toHaveLength(4);
    expect(plan.matches).toHaveLength(4); // 1 match par groupe de 2

    const played = playByRank(plan.matches);
    const results = computeGroupResults(plan, played, MARACANA_RULES);
    const qualifiers = determineQualifiedTeams(results, { qualifyPerGroup: 1 });
    expect(qualifiers).toHaveLength(4);
    // Vainqueurs de groupe attendus : t1, t2, t3, t4
    expect(qualifiers.map((q) => q.teamId).sort()).toEqual(['t1', 't2', 't3', 't4']);

    const playoffs = buildPlayoffsFromQualifiers(qualifiers);
    expect(playoffs.matches.filter((m) => m.roundId.endsWith('R1'))).toHaveLength(2); // 2 demies

    // Joue les demies
    let ko = playoffs.matches.map((m) =>
      m.homeTeamId && m.awayTeamId ? applyRank(m) : m,
    );
    advanceKnockout(ko);
    const final = ko.find((m) => !m.feedsIntoMatchId)!; // la finale n'alimente rien
    expect(final.homeTeamId).toBeTruthy();
    expect(final.awayTeamId).toBeTruthy();
    ko = ko.map((m) => (m.id === final.id ? applyRank(m) : m));
    const champion = resolveWinner(ko.find((m) => m.id === final.id)!);
    expect(champion).toBe('t1'); // meilleure tête de série gagne
  });
});

function applyRank(m: EngineMatch): EngineMatch {
  const home = Number(m.homeTeamId!.slice(1));
  const away = Number(m.awayTeamId!.slice(1));
  const homeWins = home < away;
  return {
    ...m,
    status: 'FINISHED',
    result: { homeScore: homeWins ? 2 : 0, awayScore: homeWins ? 0 : 2 },
  };
}
