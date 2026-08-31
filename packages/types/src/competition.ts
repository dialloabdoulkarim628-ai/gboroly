// Types du Competition Engine (données sérialisables, sans dépendance framework).
import type { FormatType, MatchStatus, TieBreaker } from './enums.js';

/** Référence légère d'une équipe participante (une Registration dans le domaine). */
export interface TeamRef {
  id: string;
  name: string;
  seed?: number;
}

export interface RankingRules {
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  /** Ordre des critères de départage. */
  tieBreakers: TieBreaker[];
  /** Seed déterministe pour RANDOM_DRAW (reproductible, auditable). */
  drawSeed?: string;
}

export interface CompetitionConfig {
  type: FormatType;
  /** Ex. { groups: 4, perGroup: 4, qualifyPerGroup: 2, knockout: ['QF','SF','F'] } */
  formatConfig: Record<string, unknown>;
  rules: RankingRules;
}

export interface MatchResult {
  homeScore: number;
  awayScore: number;
  homePenalties?: number;
  awayPenalties?: number;
}

export interface EngineMatch {
  id: string;
  roundId: string;
  groupId?: string;
  homeTeamId?: string;
  awayTeamId?: string;
  /** Slots non résolus du bracket, ex. "winner:QF1" ou "group:A#2". */
  homeSourceRef?: string;
  awaySourceRef?: string;
  status: MatchStatus;
  result?: MatchResult;
}

export interface StandingRow {
  teamId: string;
  groupId?: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  fairPlayPoints: number;
  position: number;
}

export interface Qualification {
  teamId: string;
  fromGroupId?: string;
  fromPosition: number;
  toSlot: string; // ex. "QF1:home"
}
