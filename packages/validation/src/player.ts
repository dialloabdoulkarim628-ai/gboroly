import { z } from 'zod';

export const CreatePlayerSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  dateOfBirth: z.coerce.date().optional(),
  photoUrl: z.string().url().optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9]{8,15}$/)
    .optional(),
  position: z.string().max(40).optional(),
  nationality: z.string().max(60).optional(),
});
export type CreatePlayerInput = z.infer<typeof CreatePlayerSchema>;

export const UpdatePlayerSchema = CreatePlayerSchema.partial();
export type UpdatePlayerInput = z.infer<typeof UpdatePlayerSchema>;
