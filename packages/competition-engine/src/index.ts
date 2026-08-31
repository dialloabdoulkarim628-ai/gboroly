/**
 * @gboroly/competition-engine — Le cœur technique de Gboroly.
 * Package PUR : aucune dépendance à Prisma, NestJS, React. Testable en JSON.
 * Voir docs/COMPETITION-ENGINE.md.
 *
 * Formats : Round Robin, Group Stage, Single Elimination, Group → Playoffs,
 * Double Elimination (4/8). Standings, tie-breakers, qualifications, bracket, forfait.
 */
export * from './fixtures.js';
export * from './standings.js';
export * from './tiebreakers.js';
export * from './groups.js';
export * from './knockout.js';
export * from './qualifications.js';
export * from './group-to-playoffs.js';
export * from './double-elimination.js';
export * from './forfeit.js';
export * from './bracket.js';

import type { TieBreaker } from '@gboroly/types';
import { TieBreaker as TB } from '@gboroly/types';

/** Ordre de départage par défaut du Maracana. */
export const MARACANA_DEFAULT_TIEBREAKERS: TieBreaker[] = [
  TB.POINTS,
  TB.GOAL_DIFFERENCE,
  TB.GOALS_FOR,
  TB.HEAD_TO_HEAD,
  TB.FAIR_PLAY,
  TB.RANDOM_DRAW,
];

/** Règles Maracana par défaut (win=3, draw=1, loss=0). */
export const MARACANA_RULES = {
  pointsWin: 3,
  pointsDraw: 1,
  pointsLoss: 0,
  tieBreakers: MARACANA_DEFAULT_TIEBREAKERS,
};
