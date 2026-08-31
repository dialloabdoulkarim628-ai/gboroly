import type { EngineMatch, RankingRules, StandingRow } from '@gboroly/types';
import { MatchStatus, TieBreaker } from '@gboroly/types';

/**
 * Applique les critères de départage dans l'ordre configuré, puis fixe `position`.
 * Ordre par défaut : POINTS > GOAL_DIFFERENCE > GOALS_FOR > HEAD_TO_HEAD > FAIR_PLAY > RANDOM_DRAW.
 * RANDOM_DRAW est déterministe via `rules.drawSeed`. Voir docs/BUSINESS-RULES.md.
 */
export function applyTieBreakers(
  standings: StandingRow[],
  matches: EngineMatch[],
  rules: RankingRules,
): StandingRow[] {
  const sorted = [...standings].sort((a, b) => compare(a, b, matches, rules));
  sorted.forEach((row, i) => (row.position = i + 1));
  return sorted;
}

function compare(
  a: StandingRow,
  b: StandingRow,
  matches: EngineMatch[],
  rules: RankingRules,
): number {
  for (const tb of rules.tieBreakers) {
    const d = criterion(tb, a, b, matches, rules);
    if (d !== 0) return d;
  }
  return 0;
}

function criterion(
  tb: TieBreaker,
  a: StandingRow,
  b: StandingRow,
  matches: EngineMatch[],
  rules: RankingRules,
): number {
  switch (tb) {
    case TieBreaker.POINTS:
      return b.points - a.points;
    case TieBreaker.GOAL_DIFFERENCE:
      return b.goalDifference - a.goalDifference;
    case TieBreaker.GOALS_FOR:
      return b.goalsFor - a.goalsFor;
    case TieBreaker.HEAD_TO_HEAD:
      return headToHead(a.teamId, b.teamId, matches, rules);
    case TieBreaker.FAIR_PLAY:
      // moins de points fair-play (cartons) = mieux classé
      return a.fairPlayPoints - b.fairPlayPoints;
    case TieBreaker.RANDOM_DRAW:
      return deterministicDraw(a.teamId, b.teamId, rules.drawSeed ?? '');
    default:
      return 0;
  }
}

/** Confrontations directes entre A et B uniquement (sous-groupe > 2 traité en Phase 6). */
function headToHead(
  aId: string,
  bId: string,
  matches: EngineMatch[],
  rules: RankingRules,
): number {
  let aPts = 0;
  let bPts = 0;
  for (const m of matches) {
    if (m.status !== MatchStatus.FINISHED || !m.result) continue;
    const involvesBoth =
      (m.homeTeamId === aId && m.awayTeamId === bId) ||
      (m.homeTeamId === bId && m.awayTeamId === aId);
    if (!involvesBoth) continue;
    const { homeScore, awayScore } = m.result;
    const [aScore, bScore] =
      m.homeTeamId === aId ? [homeScore, awayScore] : [awayScore, homeScore];
    if (aScore > bScore) aPts += rules.pointsWin;
    else if (aScore < bScore) bPts += rules.pointsWin;
    else {
      aPts += rules.pointsDraw;
      bPts += rules.pointsDraw;
    }
  }
  return bPts - aPts;
}

/** Tirage reproductible : hash stable (seed + ids). */
function deterministicDraw(aId: string, bId: string, seed: string): number {
  const ha = hash(seed + aId);
  const hb = hash(seed + bId);
  return ha - hb;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
