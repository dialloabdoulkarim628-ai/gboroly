import { z } from 'zod';
import { MatchEventType } from '@gboroly/types';

export const GenerateCompetitionSchema = z.object({
  type: z.enum([
    'ROUND_ROBIN',
    'GROUP_STAGE',
    'SINGLE_ELIMINATION',
    'DOUBLE_ELIMINATION',
    'GROUP_TO_PLAYOFFS',
  ]),
  /** Nombre de groupes (GROUP_STAGE / GROUP_TO_PLAYOFFS). */
  groups: z.number().int().positive().max(32).optional(),
  /** Qualifiés par groupe (GROUP_TO_PLAYOFFS). */
  qualifyPerGroup: z.number().int().positive().max(8).optional(),
  /** Matchs aller-retour en poule. */
  doubleRound: z.boolean().optional(),
});
export type GenerateCompetitionInput = z.infer<typeof GenerateCompetitionSchema>;

export const ScheduleMatchSchema = z.object({
  scheduledAt: z.coerce.date().optional(),
  venueId: z.string().uuid().nullable().optional(),
  fieldId: z.string().uuid().nullable().optional(),
  refereeId: z.string().uuid().nullable().optional(),
});
export type ScheduleMatchInput = z.infer<typeof ScheduleMatchSchema>;

export const SetScoreSchema = z.object({
  homeScore: z.number().int().min(0).max(999),
  awayScore: z.number().int().min(0).max(999),
  homePenalties: z.number().int().min(0).max(99).optional(),
  awayPenalties: z.number().int().min(0).max(99).optional(),
});
export type SetScoreInput = z.infer<typeof SetScoreSchema>;

export const RecordEventSchema = z.object({
  type: z.nativeEnum(MatchEventType),
  teamRegistrationId: z.string().uuid(),
  playerId: z.string().uuid().optional(),
  minute: z.number().int().min(0).max(200).optional(),
  additionalTime: z.number().int().min(0).max(30).optional(),
});
export type RecordEventInput = z.infer<typeof RecordEventSchema>;

export const FinishMatchSchema = z.object({
  homeScore: z.number().int().min(0).max(999),
  awayScore: z.number().int().min(0).max(999),
  homePenalties: z.number().int().min(0).max(99).optional(),
  awayPenalties: z.number().int().min(0).max(99).optional(),
});
export type FinishMatchInput = z.infer<typeof FinishMatchSchema>;

export const ForfeitMatchSchema = z.object({
  forfeitTeamRegistrationId: z.string().uuid(),
});
export type ForfeitMatchInput = z.infer<typeof ForfeitMatchSchema>;

export const PostponeMatchSchema = z.object({
  scheduledAt: z.coerce.date(),
  fieldId: z.string().uuid().nullable().optional(),
});
export type PostponeMatchInput = z.infer<typeof PostponeMatchSchema>;
