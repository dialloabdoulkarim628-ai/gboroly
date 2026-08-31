/**
 * @gboroly/competition-engine — Le cœur technique de Gboroly.
 * Package PUR : aucune dépendance à Prisma, NestJS, React. Testable en JSON.
 * Voir docs/COMPETITION-ENGINE.md.
 *
 * Phase 1 : ossature + round-robin + standings + tie-breakers (testés).
 * Phase 6 : groupes, knockout, qualifications, bracket, double élimination.
 */
export * from './fixtures.js';
export * from './standings.js';
export * from './tiebreakers.js';

import type { TieBreaker } from '@gboroly/types';
import { TieBreaker as TB } from '@gboroly/types';

/** Règles Maracana par défaut (win=3, draw=1, loss=0). */
export const MARACANA_DEFAULT_TIEBREAKERS: TieBreaker[] = [
  TB.POINTS,
  TB.GOAL_DIFFERENCE,
  TB.GOALS_FOR,
  TB.HEAD_TO_HEAD,
  TB.FAIR_PLAY,
  TB.RANDOM_DRAW,
];

export const MARACANA_RULES = {
  pointsWin: 3,
  pointsDraw: 1,
  pointsLoss: 0,
  tieBreakers: MARACANA_DEFAULT_TIEBREAKERS,
};
