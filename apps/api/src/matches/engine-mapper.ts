import type { EngineMatch } from '@gboroly/types';
import { MatchStatus } from '@gboroly/types';

/** Forme minimale d'un Match DB nécessaire au moteur (pur, testable). */
export interface DbMatchLike {
  id: string;
  roundId: string;
  groupId: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeSourceRef: unknown;
  awaySourceRef: unknown;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  winnerRegistrationId: string | null;
  forfeitTeamId: string | null;
  resultType: string | null;
  feedsIntoMatchId: string | null;
  feedsIntoSlot: string | null;
  loserFeedsIntoMatchId?: string | null;
  loserFeedsIntoSlot?: string | null;
}

/** Convertit un Match DB en EngineMatch (le "teamId" moteur = registrationId). */
export function toEngineMatch(m: DbMatchLike): EngineMatch {
  const hasResult = m.homeScore != null && m.awayScore != null;
  return {
    id: m.id,
    roundId: m.roundId,
    groupId: m.groupId ?? undefined,
    homeTeamId: m.homeTeamId ?? undefined,
    awayTeamId: m.awayTeamId ?? undefined,
    homeSourceRef: asRef(m.homeSourceRef),
    awaySourceRef: asRef(m.awaySourceRef),
    status: m.status as EngineMatch['status'],
    result: hasResult
      ? {
          homeScore: m.homeScore!,
          awayScore: m.awayScore!,
          homePenalties: m.homePenalties ?? undefined,
          awayPenalties: m.awayPenalties ?? undefined,
        }
      : undefined,
    winnerRef: m.winnerRegistrationId ?? undefined,
    resultType: (m.resultType as EngineMatch['resultType']) ?? undefined,
    forfeitTeamId: m.forfeitTeamId ?? undefined,
    feedsIntoMatchId: m.feedsIntoMatchId ?? undefined,
    feedsIntoSlot: (m.feedsIntoSlot as 'home' | 'away' | null) ?? undefined,
    loserFeedsIntoMatchId: m.loserFeedsIntoMatchId ?? undefined,
    loserFeedsIntoSlot: (m.loserFeedsIntoSlot as 'home' | 'away' | null) ?? undefined,
  };
}

function asRef(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

/** Vainqueur d'un match à partir du score (puis tirs au but). Undefined si nul non départagé. */
export function winnerFromScore(m: {
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties?: number | null;
  awayPenalties?: number | null;
}): string | null {
  if (m.homeScore == null || m.awayScore == null || !m.homeTeamId || !m.awayTeamId) return null;
  if (m.homeScore > m.awayScore) return m.homeTeamId;
  if (m.awayScore > m.homeScore) return m.awayTeamId;
  if (m.homePenalties != null && m.awayPenalties != null && m.homePenalties !== m.awayPenalties) {
    return m.homePenalties > m.awayPenalties ? m.homeTeamId : m.awayTeamId;
  }
  return null;
}

export const FINISHED = MatchStatus.FINISHED;
