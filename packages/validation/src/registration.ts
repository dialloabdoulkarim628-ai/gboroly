import { z } from 'zod';

export const CreateRegistrationSchema = z.object({
  teamId: z.string().uuid(),
  categoryId: z.string().uuid(),
  seed: z.number().int().positive().optional(),
});
export type CreateRegistrationInput = z.infer<typeof CreateRegistrationSchema>;

export const RejectRegistrationSchema = z.object({
  reason: z.string().max(500).optional(),
});
export type RejectRegistrationInput = z.infer<typeof RejectRegistrationSchema>;
