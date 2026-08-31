import { z } from 'zod';
import { FormatType, Visibility } from '@gboroly/types';

export const CreateTournamentSchema = z.object({
  name: z.string().min(2).max(120),
  sportKey: z.string().min(1).default('maracana'),
  description: z.string().max(2000).optional(),
  country: z.string().min(2),
  city: z.string().optional(),
  venueDescription: z.string().max(500).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  startTime: z.string().optional(),
  registrationStart: z.coerce.date().optional(),
  registrationEnd: z.coerce.date().optional(),
  visibility: z.nativeEnum(Visibility).default(Visibility.PRIVATE),
  currency: z.string().length(3).default('XOF'),
  timezone: z.string().default('Africa/Abidjan'),
  maxTeams: z.number().int().positive().max(512).optional(),
  registrationFee: z.number().int().nonnegative().optional(),
});
export type CreateTournamentInput = z.infer<typeof CreateTournamentSchema>;

export const UpdateTournamentSchema = CreateTournamentSchema.partial().omit({ sportKey: true });
export type UpdateTournamentInput = z.infer<typeof UpdateTournamentSchema>;

export const SetVisibilitySchema = z.object({
  visibility: z.nativeEnum(Visibility),
});
export type SetVisibilityInput = z.infer<typeof SetVisibilitySchema>;

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(60),
  minSquad: z.number().int().positive().max(50).optional(),
  maxSquad: z.number().int().positive().max(50).optional(),
  maxTeams: z.number().int().positive().max(512).optional(),
  registrationFee: z.number().int().nonnegative().optional(),
});
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;

export const UpdateCategorySchema = CreateCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;

export const ConfigureCompetitionSchema = z.object({
  type: z.nativeEnum(FormatType),
  formatConfig: z.record(z.unknown()).default({}),
});
export type ConfigureCompetitionInput = z.infer<typeof ConfigureCompetitionSchema>;
