import { z } from 'zod';
import { MatchEventType } from '@gboroly/types';

export const UpdateScoreSchema = z.object({
  homeScore: z.number().int().nonnegative(),
  awayScore: z.number().int().nonnegative(),
  homePenalties: z.number().int().nonnegative().optional(),
  awayPenalties: z.number().int().nonnegative().optional(),
});
export type UpdateScoreInput = z.infer<typeof UpdateScoreSchema>;

export const RecordEventSchema = z.object({
  registrationId: z.string().uuid(),
  playerId: z.string().uuid().optional(),
  type: z.nativeEnum(MatchEventType),
  minute: z.number().int().min(0).max(200).optional(),
  additionalTime: z.number().int().min(0).max(30).optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type RecordEventInput = z.infer<typeof RecordEventSchema>;
