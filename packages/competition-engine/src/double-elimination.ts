import type { EngineMatch, PlannedRound, TeamRef } from '@gboroly/types';
import { MatchStatus, RoundType } from '@gboroly/types';
import { resolveWinner } from './knockout.js';

/** Source d'un slot : tête de série, vainqueur ou perdant d'un match. */
type Source =
  | { kind: 'seed'; seed: number }
  | { kind: 'winner'; matchId: string }
  | { kind: 'loser'; matchId: string };

interface MatchSpec {
  id: string;
  roundId: string;
  roundName: string;
  roundOrder: number;
  order: number;
  home: Source;
  away: Source;
}

export interface DoubleEliminationPlan {
  rounds: PlannedRound[];
  matches: EngineMatch[];
}

const W = (matchId: string): Source => ({ kind: 'winner', matchId });
const L = (matchId: string): Source => ({ kind: 'loser', matchId });
const S = (seed: number): Source => ({ kind: 'seed', seed });

/** Spécifications de bracket (croisements standard). Tailles 4 et 8. */
function specFor(size: number): MatchSpec[] {
  if (size === 4) {
    return [
      m('WB1m0', 'WB-R1', 'Winners — Tour 1', 1, 0, S(1), S(4)),
      m('WB1m1', 'WB-R1', 'Winners — Tour 1', 1, 1, S(2), S(3)),
      m('WB2m0', 'WB-R2', 'Winners — Finale', 2, 0, W('WB1m0'), W('WB1m1')),
      m('LB1m0', 'LB-R1', 'Losers — Tour 1', 3, 0, L('WB1m0'), L('WB1m1')),
      m('LB2m0', 'LB-R2', 'Losers — Finale', 4, 0, L('WB2m0'), W('LB1m0')),
      m('GF', 'GF', 'Grande finale', 5, 0, W('WB2m0'), W('LB2m0')),
    ];
  }
  if (size === 8) {
    return [
      m('WB1m0', 'WB-R1', 'Winners — Tour 1', 1, 0, S(1), S(8)),
      m('WB1m1', 'WB-R1', 'Winners — Tour 1', 1, 1, S(4), S(5)),
      m('WB1m2', 'WB-R1', 'Winners — Tour 1', 1, 2, S(2), S(7)),
      m('WB1m3', 'WB-R1', 'Winners — Tour 1', 1, 3, S(3), S(6)),
      m('WB2m0', 'WB-R2', 'Winners — Demies', 2, 0, W('WB1m0'), W('WB1m1')),
      m('WB2m1', 'WB-R2', 'Winners — Demies', 2, 1, W('WB1m2'), W('WB1m3')),
      m('WB3m0', 'WB-R3', 'Winners — Finale', 3, 0, W('WB2m0'), W('WB2m1')),
      m('LB1m0', 'LB-R1', 'Losers — Tour 1', 4, 0, L('WB1m0'), L('WB1m1')),
      m('LB1m1', 'LB-R1', 'Losers — Tour 1', 4, 1, L('WB1m2'), L('WB1m3')),
      // Croisement pour éviter les revanches immédiates.
      m('LB2m0', 'LB-R2', 'Losers — Tour 2', 5, 0, W('LB1m0'), L('WB2m1')),
      m('LB2m1', 'LB-R2', 'Losers — Tour 2', 5, 1, W('LB1m1'), L('WB2m0')),
      m('LB3m0', 'LB-R3', 'Losers — Demie', 6, 0, W('LB2m0'), W('LB2m1')),
      m('LB4m0', 'LB-R4', 'Losers — Finale', 7, 0, L('WB3m0'), W('LB3m0')),
      m('GF', 'GF', 'Grande finale', 8, 0, W('WB3m0'), W('LB4m0')),
    ];
  }
  throw new Error(`Double élimination supportée pour 4 ou 8 équipes (reçu ${size})`);
}

function m(
  id: string,
  roundId: string,
  roundName: string,
  roundOrder: number,
  order: number,
  home: Source,
  away: Source,
): MatchSpec {
  return { id, roundId, roundName, roundOrder, order, home, away };
}

/**
 * Génère un bracket à double élimination (4 ou 8 équipes).
 * `teams` triées par seed. Grande finale simple (sans bracket reset au MVP).
 */
export function generateDoubleElimination(teams: TeamRef[], prefix = 'DE'): DoubleEliminationPlan {
  const ordered = [...teams].sort((a, b) => (a.seed ?? Infinity) - (b.seed ?? Infinity));
  const size = ordered.length;
  const specs = specFor(size);

  const idOf = (raw: string) => `${prefix}-${raw}`;
  const matches: EngineMatch[] = [];
  const byId = new Map<string, EngineMatch>();
  const roundsMap = new Map<string, PlannedRound>();

  for (const spec of specs) {
    const roundId = idOf(spec.roundId);
    if (!roundsMap.has(roundId)) {
      roundsMap.set(roundId, {
        id: roundId,
        type: spec.roundId === 'GF' ? RoundType.FINAL : RoundType.KNOCKOUT,
        name: spec.roundName,
        order: spec.roundOrder,
      });
    }
    const match: EngineMatch = {
      id: idOf(spec.id),
      roundId,
      status: MatchStatus.SCHEDULED,
      order: spec.order,
      homeSourceRef: sourceRef(spec.home, prefix),
      awaySourceRef: sourceRef(spec.away, prefix),
    };
    if (spec.home.kind === 'seed') match.homeTeamId = ordered[spec.home.seed - 1]?.id;
    if (spec.away.kind === 'seed') match.awayTeamId = ordered[spec.away.seed - 1]?.id;
    matches.push(match);
    byId.set(match.id, match);
  }

  // Chaînage : chaque match source pointe vers l'aval (vainqueur et perdant).
  for (const spec of specs) {
    linkSource(byId, spec.home, idOf(spec.id), 'home', prefix);
    linkSource(byId, spec.away, idOf(spec.id), 'away', prefix);
  }

  advanceDoubleElimination(matches);
  const rounds = [...roundsMap.values()].sort((a, b) => a.order - b.order);
  return { rounds, matches };
}

function sourceRef(s: Source, prefix: string): string {
  if (s.kind === 'seed') return `seed:${s.seed}`;
  return `${s.kind}:${prefix}-${s.matchId}`;
}

function linkSource(
  byId: Map<string, EngineMatch>,
  s: Source,
  toId: string,
  slot: 'home' | 'away',
  prefix: string,
) {
  if (s.kind === 'seed') return;
  const from = byId.get(`${prefix}-${s.matchId}`);
  if (!from) return;
  if (s.kind === 'winner') {
    from.feedsIntoMatchId = toId;
    from.feedsIntoSlot = slot;
  } else {
    from.loserFeedsIntoMatchId = toId;
    from.loserFeedsIntoSlot = slot;
  }
}

function resolveLoser(match: EngineMatch): string | undefined {
  const winner = resolveWinner(match);
  if (!winner || !match.homeTeamId || !match.awayTeamId) return undefined;
  return winner === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
}

/** Propage vainqueurs ET perdants dans les slots aval. Idempotent. */
export function advanceDoubleElimination(matches: EngineMatch[]): EngineMatch[] {
  const byId = new Map(matches.map((mm) => [mm.id, mm]));
  for (let pass = 0; pass < matches.length; pass++) {
    let changed = false;
    for (const mm of matches) {
      const winner = resolveWinner(mm);
      if (winner && mm.feedsIntoMatchId) {
        if (place(byId.get(mm.feedsIntoMatchId), mm.feedsIntoSlot, winner)) changed = true;
      }
      const loser = resolveLoser(mm);
      if (loser && mm.loserFeedsIntoMatchId) {
        if (place(byId.get(mm.loserFeedsIntoMatchId), mm.loserFeedsIntoSlot, loser)) changed = true;
      }
    }
    if (!changed) break;
  }
  return matches;
}

function place(target: EngineMatch | undefined, slot: 'home' | 'away' | undefined, teamId: string) {
  if (!target || !slot) return false;
  if (slot === 'home' && target.homeTeamId !== teamId) {
    target.homeTeamId = teamId;
    return true;
  }
  if (slot === 'away' && target.awayTeamId !== teamId) {
    target.awayTeamId = teamId;
    return true;
  }
  return false;
}
