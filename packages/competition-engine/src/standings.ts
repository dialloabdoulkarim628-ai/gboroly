import type { EngineMatch, RankingRules, StandingRow, TeamRef } from '@gboroly/types';
import { MatchStatus } from '@gboroly/types';

/**
 * Calcule le classement à partir des matchs TERMINÉS. Fonction pure et déterministe.
 * Le classement est TOUJOURS dérivé (jamais saisi). Voir docs/COMPETITION-ENGINE.md.
 */
export function calculateStandings(
  teams: TeamRef[],
  matches: EngineMatch[],
  rules: RankingRules,
  groupId?: string,
): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const t of teams) {
    rows.set(t.id, blankRow(t.id, groupId));
  }

  const finished = matches.filter(
    (m) => m.status === MatchStatus.FINISHED && m.result && m.homeTeamId && m.awayTeamId,
  );

  for (const m of finished) {
    const home = rows.get(m.homeTeamId!);
    const away = rows.get(m.awayTeamId!);
    if (!home || !away) continue;
    const { homeScore, awayScore } = m.result!;

    home.played++;
    away.played++;
    home.goalsFor += homeScore;
    home.goalsAgainst += awayScore;
    away.goalsFor += awayScore;
    away.goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      home.wins++;
      away.losses++;
      home.points += rules.pointsWin;
      away.points += rules.pointsLoss;
    } else if (homeScore < awayScore) {
      away.wins++;
      home.losses++;
      away.points += rules.pointsWin;
      home.points += rules.pointsLoss;
    } else {
      home.draws++;
      away.draws++;
      home.points += rules.pointsDraw;
      away.points += rules.pointsDraw;
    }
  }

  for (const row of rows.values()) {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
  }

  return [...rows.values()];
}

function blankRow(teamId: string, groupId?: string): StandingRow {
  return {
    teamId,
    groupId,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    fairPlayPoints: 0,
    position: 0,
  };
}
