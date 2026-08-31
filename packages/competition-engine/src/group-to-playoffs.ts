import type {
  CompetitionPlan,
  EngineMatch,
  Qualification,
  RankingRules,
  TeamRef,
} from '@gboroly/types';
import { RoundType } from '@gboroly/types';
import { distributeIntoGroups, generateGroupStageFixtures, groupStandings } from './groups.js';
import type { GroupResult } from './qualifications.js';
import { generateSingleElimination, type KnockoutPlan } from './knockout.js';

/** Plan initial : phase de groupes uniquement (les playoffs sont générés après résultats). */
export function planGroupStage(
  teams: TeamRef[],
  groupCount: number,
  options: { doubleRound?: boolean } = {},
): CompetitionPlan {
  const groups = distributeIntoGroups(teams, groupCount);
  const roundId = 'GS-R1';
  const matches = generateGroupStageFixtures(groups, roundId, options);
  return {
    rounds: [{ id: roundId, type: RoundType.GROUP_STAGE, name: 'Phase de groupes', order: 1 }],
    groups,
    matches,
  };
}

/** Recalcule les classements de tous les groupes (idempotent). */
export function computeGroupResults(
  plan: CompetitionPlan,
  matches: EngineMatch[],
  rules: RankingRules,
): GroupResult[] {
  return plan.groups.map((group) => ({
    group,
    standings: groupStandings(group, matches, rules),
  }));
}

/**
 * Construit les phases finales à partir des qualifiés :
 * les vainqueurs de groupe sont têtes de série, suivis des autres qualifiés
 * (croisement pour limiter les affrontements intra-groupe au 1er tour).
 */
export function buildPlayoffsFromQualifiers(
  qualifiers: Qualification[],
  names: Record<string, string> = {},
): KnockoutPlan {
  const winners = qualifiers.filter((q) => q.fromPosition === 1).sort(byLabel);
  const others = qualifiers.filter((q) => q.fromPosition > 1).sort(byLabelDesc);
  const ordered = [...winners, ...others];

  const seeded: TeamRef[] = ordered.map((q, i) => ({
    id: q.teamId,
    name: names[q.teamId] ?? q.label,
    seed: i + 1,
  }));

  return generateSingleElimination(seeded, 'PO', 2);
}

function byLabel(a: Qualification, b: Qualification): number {
  return a.label.localeCompare(b.label);
}
function byLabelDesc(a: Qualification, b: Qualification): number {
  return b.label.localeCompare(a.label);
}
