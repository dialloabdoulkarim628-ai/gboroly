import type {
  PlannedGroup,
  Qualification,
  QualificationConfig,
  StandingRow,
} from '@gboroly/types';

const GROUP_LETTER_RE = /Groupe\s+([A-Z])/;

export interface GroupResult {
  group: PlannedGroup;
  standings: StandingRow[]; // déjà classées (positions 1..n)
}

/**
 * Détermine les équipes qualifiées : les `qualifyPerGroup` premiers de chaque groupe,
 * plus éventuellement les meilleurs "Nes de groupe" (repêchage cross-groupe).
 * Fonction pure et déterministe.
 */
export function determineQualifiedTeams(
  groups: GroupResult[],
  config: QualificationConfig,
): Qualification[] {
  const qualified: Qualification[] = [];

  for (const { group, standings } of groups) {
    const letter = GROUP_LETTER_RE.exec(group.name)?.[1] ?? '?';
    for (const row of standings) {
      if (row.position <= config.qualifyPerGroup) {
        qualified.push({
          teamId: row.teamId,
          fromGroupId: group.id,
          fromPosition: row.position,
          label: `${letter}${row.position}`,
        });
      }
    }
  }

  // Repêchage des meilleurs "Nes" (ex. meilleurs 3es).
  if (config.bestOfRank && config.bestOfRank.count > 0) {
    const { rank, count } = config.bestOfRank;
    const contenders = groups
      .map(({ standings }) => standings.find((s) => s.position === rank))
      .filter((s): s is StandingRow => Boolean(s))
      .sort(compareCrossGroup)
      .slice(0, count);

    for (const row of contenders) {
      qualified.push({
        teamId: row.teamId,
        fromGroupId: row.groupId,
        fromPosition: rank,
        label: `meilleur-${rank}e`,
      });
    }
  }

  return qualified;
}

/** Comparaison cross-groupe pour départager les "Nes" : points > diff > BP. */
function compareCrossGroup(a: StandingRow, b: StandingRow): number {
  return (
    b.points - a.points ||
    b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor
  );
}
