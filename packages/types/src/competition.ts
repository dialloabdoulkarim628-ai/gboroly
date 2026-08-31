// Types du Competition Engine (données sérialisables, sans dépendance framework).
import type { FormatType, MatchStatus, RoundType, TieBreaker } from './enums.js';

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

/** Règle de qualification : combien d'équipes se qualifient par groupe + meilleurs Nes. */
export interface QualificationConfig {
  qualifyPerGroup: number;
  /** Nombre de meilleurs "Nes de groupe" repêchés (ex. meilleurs 3es). 0 par défaut. */
  bestOfRank?: { rank: number; count: number };
}

export interface CompetitionConfig {
  type: FormatType;
  /** Ex. { groups: 4, perGroup: 4, doubleRound: false } */
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
  /** Slots non résolus, ex. "seed:3", "group:A#2", "winner:KO-R1-m0", "loser:KO-R1-m0". */
  homeSourceRef?: string;
  awaySourceRef?: string;
  status: MatchStatus;
  result?: MatchResult;
  /** Vainqueur résolu (bye/forfait) sans passer par un score. */
  winnerRef?: string;
  resultType?: 'NORMAL' | 'FORFEIT' | 'WALKOVER' | 'AWARDED';
  forfeitTeamId?: string;
  /** Chaînage bracket : match aval + slot ('home' | 'away') alimenté par le vainqueur. */
  feedsIntoMatchId?: string;
  feedsIntoSlot?: 'home' | 'away';
  /** Pour double élimination : où va le perdant. */
  loserFeedsIntoMatchId?: string;
  loserFeedsIntoSlot?: 'home' | 'away';
  order?: number;
}

export interface PlannedGroup {
  id: string;
  name: string;
  teamIds: string[];
}

export interface PlannedRound {
  id: string;
  type: RoundType;
  name: string;
  order: number;
}

export interface CompetitionPlan {
  rounds: PlannedRound[];
  groups: PlannedGroup[];
  matches: EngineMatch[];
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
  label: string; // ex. "A1", "B2", "3e-meilleur"
}

export interface BracketNode {
  matchId: string;
  roundName: string;
  roundOrder: number;
  homeTeamId?: string;
  awayTeamId?: string;
  homeLabel: string;
  awayLabel: string;
  winnerTeamId?: string;
}
