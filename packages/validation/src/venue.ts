import { z } from 'zod';

export const CreateVenueSchema = z.object({
  name: z.string().min(2).max(120),
  address: z.string().max(200).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});
export type CreateVenueInput = z.infer<typeof CreateVenueSchema>;

export const CreateFieldSchema = z.object({
  name: z.string().min(1).max(80),
  capacity: z.number().int().positive().optional(),
});
export type CreateFieldInput = z.infer<typeof CreateFieldSchema>;

export const UpdateFieldSchema = CreateFieldSchema.partial();
export type UpdateFieldInput = z.infer<typeof UpdateFieldSchema>;

export const GenerateScheduleSchema = z.object({
  days: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).default('08:00'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).default('20:00'),
  matchDurationMin: z.number().int().positive().max(240).default(60),
  breakMin: z.number().int().min(0).max(120).default(0),
  restMinutesPerTeam: z.number().int().min(0).max(600).default(60),
  /** true = ne persiste pas, renvoie seulement l'aperçu. */
  dryRun: z.boolean().default(false),
});
export type GenerateScheduleInput = z.infer<typeof GenerateScheduleSchema>;
