import { z } from 'zod';

export const CreateTeamSchema = z.object({
  name: z.string().min(2).max(120),
  shortName: z.string().max(20).optional(),
  logoUrl: z.string().url().optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9]{8,15}$/)
    .optional(),
});
export type CreateTeamInput = z.infer<typeof CreateTeamSchema>;

export const UpdateTeamSchema = CreateTeamSchema.partial().extend({
  captainPlayerId: z.string().uuid().optional(),
});
export type UpdateTeamInput = z.infer<typeof UpdateTeamSchema>;

export const SetTeamStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'ARCHIVED']),
});
export type SetTeamStatusInput = z.infer<typeof SetTeamStatusSchema>;

export const AddRosterPlayerSchema = z.object({
  playerId: z.string().uuid(),
  jerseyNumber: z.number().int().min(0).max(999).optional(),
  position: z.string().max(40).optional(),
  tournamentId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
});
export type AddRosterPlayerInput = z.infer<typeof AddRosterPlayerSchema>;

export const UpdateRosterPlayerSchema = z.object({
  jerseyNumber: z.number().int().min(0).max(999).optional(),
  position: z.string().max(40).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'REMOVED']).optional(),
});
export type UpdateRosterPlayerInput = z.infer<typeof UpdateRosterPlayerSchema>;
