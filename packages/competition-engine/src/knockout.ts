import type { EngineMatch, PlannedRound, TeamRef } from '@gboroly/types';
import { MatchStatus, RoundType } from '@gboroly/types';

export interface KnockoutPlan {
  rounds: PlannedRound[];
  matches: EngineMatch[];
}

export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/** Ordre de seeding standard d'un bracket (1 vs N, 2 vs N-1, …). */
export function seedOrder(size: number): number[] {
  if (size <= 1) return [1];
  const prev = seedOrder(size / 2);
  const res: number[] = [];
  for (const s of prev) {
    res.push(s);
    res.push(size + 1 - s);
  }
  return res;
}

function roundName(matchCount: number): string {
  switch (matchCount) {
    case 1:
      return 'Finale';
    case 2:
      return 'Demi-finales';
    case 4:
      return 'Quarts de finale';
    case 8:
      return 'Huitièmes de finale';
    case 16:
      return 'Seizièmes de finale';
    default:
      return `Tour de ${matchCount * 2}`;
  }
}

/**
 * Génère un bracket à élimination directe. `teams` triées par seed (ou ordre fourni).
 * Gère les byes (nombre d'équipes non puissance de 2) : les têtes de série passent
 * automatiquement le 1er tour.
 */
export function generateSingleElimination(
  teams: TeamRef[],
  prefix = 'KO',
  startOrder = 1,
): KnockoutPlan {
  const ordered = [...teams].sort((a, b) => (a.seed ?? Infinity) - (b.seed ?? Infinity));
  const n = ordered.length;
  if (n < 2) throw new Error('Au moins 2 équipes requises');

  const size = nextPowerOfTwo(n);
  const order = seedOrder(size);
  const numRounds = Math.log2(size);

  const rounds: PlannedRound[] = [];
  const matches: EngineMatch[] = [];
  const byId = new Map<string, EngineMatch>();
  let prevIds: string[] = [];

  for (let r = 1; r <= numRounds; r++) {
    const matchCount = size / 2 ** r;
    const roundId = `${prefix}-R${r}`;
    rounds.push({
      id: roundId,
      type: matchCount === 1 ? RoundType.FINAL : RoundType.KNOCKOUT,
      name: roundName(matchCount),
      order: startOrder + r - 1,
    });

    const ids: string[] = [];
    for (let j = 0; j < matchCount; j++) {
      const id = `${prefix}-R${r}-m${j}`;
      const match: EngineMatch = {
        id,
        roundId,
        status: MatchStatus.SCHEDULED,
        order: j,
      };

      if (r === 1) {
        const seedA = order[2 * j]!;
        const seedB = order[2 * j + 1]!;
        match.homeTeamId = seedA <= n ? ordered[seedA - 1]!.id : undefined;
        match.awayTeamId = seedB <= n ? ordered[seedB - 1]!.id : undefined;
        match.homeSourceRef = `seed:${seedA}`;
        match.awaySourceRef = `seed:${seedB}`;
      } else {
        match.homeSourceRef = `winner:${prevIds[2 * j]}`;
        match.awaySourceRef = `winner:${prevIds[2 * j + 1]}`;
        // Chaîne les matchs du tour précédent vers celui-ci.
        link(byId, prevIds[2 * j]!, id, 'home');
        link(byId, prevIds[2 * j + 1]!, id, 'away');
      }

      matches.push(match);
      byId.set(id, match);
      ids.push(id);
    }
    prevIds = ids;
  }

  resolveByes(matches);
  advanceKnockout(matches); // propage les byes vers le tour suivant
  return { rounds, matches };
}

function link(byId: Map<string, EngineMatch>, fromId: string, toId: string, slot: 'home' | 'away') {
  const from = byId.get(fromId);
  if (from) {
    from.feedsIntoMatchId = toId;
    from.feedsIntoSlot = slot;
  }
}

/** Marque les byes du 1er tour comme terminés (l'équipe réelle est vainqueur). */
function resolveByes(matches: EngineMatch[]) {
  for (const m of matches) {
    if (m.status !== MatchStatus.SCHEDULED) continue;
    const hasHome = Boolean(m.homeTeamId);
    const hasAway = Boolean(m.awayTeamId);
    if (hasHome !== hasAway) {
      m.status = MatchStatus.FINISHED;
      m.resultType = 'WALKOVER';
      m.winnerRef = m.homeTeamId ?? m.awayTeamId;
    }
  }
}

/** Détermine le vainqueur d'un match (score, puis tirs au but, puis walkover). */
export function resolveWinner(match: EngineMatch): string | undefined {
  if (match.winnerRef) return match.winnerRef;
  if (!match.result || !match.homeTeamId || !match.awayTeamId) return undefined;
  const { homeScore, awayScore, homePenalties, awayPenalties } = match.result;
  if (homeScore > awayScore) return match.homeTeamId;
  if (awayScore > homeScore) return match.awayTeamId;
  if (homePenalties != null && awayPenalties != null && homePenalties !== awayPenalties) {
    return homePenalties > awayPenalties ? match.homeTeamId : match.awayTeamId;
  }
  return undefined; // nul non départagé (knockout → prolongation/tirs au but requis)
}

/**
 * Propage les vainqueurs des matchs terminés dans les slots des matchs aval.
 * Idempotent : rejouable sans divergence.
 */
export function advanceKnockout(matches: EngineMatch[]): EngineMatch[] {
  const byId = new Map(matches.map((m) => [m.id, m]));
  // Plusieurs passes pour propager en cascade (byes → tours suivants).
  for (let pass = 0; pass < matches.length; pass++) {
    let changed = false;
    for (const m of matches) {
      const winner = resolveWinner(m);
      if (!winner || !m.feedsIntoMatchId) continue;
      const target = byId.get(m.feedsIntoMatchId);
      if (!target) continue;
      if (m.feedsIntoSlot === 'home' && target.homeTeamId !== winner) {
        target.homeTeamId = winner;
        changed = true;
      } else if (m.feedsIntoSlot === 'away' && target.awayTeamId !== winner) {
        target.awayTeamId = winner;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return matches;
}
