import type { EngineMatch, PlannedGroup, StandingRow, TeamRef } from '@gboroly/types';
import type { RankingRules } from '@gboroly/types';
import { generateRoundRobinFixtures } from './fixtures.js';
import { calculateStandings } from './standings.js';
import { applyTieBreakers } from './tiebreakers.js';

const GROUP_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Répartit les équipes en `groupCount` groupes par distribution "serpent"
 * (respecte les seeds pour équilibrer). Déterministe.
 */
export function distributeIntoGroups(teams: TeamRef[], groupCount: number): PlannedGroup[] {
  if (groupCount < 1) throw new Error('groupCount doit être >= 1');
  const ordered = [...teams].sort((a, b) => (a.seed ?? Infinity) - (b.seed ?? Infinity));
  const groups: PlannedGroup[] = Array.from({ length: groupCount }, (_, i) => ({
    id: `G-${GROUP_LETTERS[i]}`,
    name: `Groupe ${GROUP_LETTERS[i]}`,
    teamIds: [],
  }));

  ordered.forEach((team, index) => {
    const row = Math.floor(index / groupCount);
    const col = index % groupCount;
    // Serpent : une ligne sur deux est parcourue à l'envers.
    const groupIndex = row % 2 === 0 ? col : groupCount - 1 - col;
    groups[groupIndex]!.teamIds.push(team.id);
  });

  return groups;
}

/** Génère les matchs de la phase de groupes (round robin dans chaque groupe). */
export function generateGroupStageFixtures(
  groups: PlannedGroup[],
  roundId: string,
  options: { doubleRound?: boolean } = {},
): EngineMatch[] {
  const matches: EngineMatch[] = [];
  for (const group of groups) {
    const teamRefs: TeamRef[] = group.teamIds.map((id) => ({ id, name: id }));
    const groupMatches = generateRoundRobinFixtures(teamRefs, roundId, {
      groupId: group.id,
      doubleRound: options.doubleRound,
    });
    // Réécrit les ids pour les rendre uniques par groupe.
    groupMatches.forEach((m, i) => matches.push({ ...m, id: `${roundId}-${group.id}-m${i}` }));
  }
  return matches;
}

/** Classement d'un groupe (calcul + départage), positions 1..n. */
export function groupStandings(
  group: PlannedGroup,
  matches: EngineMatch[],
  rules: RankingRules,
): StandingRow[] {
  const teamRefs: TeamRef[] = group.teamIds.map((id) => ({ id, name: id }));
  const groupMatches = matches.filter((m) => m.groupId === group.id);
  const raw = calculateStandings(teamRefs, groupMatches, rules, group.id);
  return applyTieBreakers(raw, groupMatches, rules);
}
