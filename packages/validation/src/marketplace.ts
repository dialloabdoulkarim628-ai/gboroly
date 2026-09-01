import { z } from 'zod';

export const DiscoverQuerySchema = z.object({
  country: z.string().optional(),
  city: z.string().optional(),
  sportKey: z.string().optional(),
  q: z.string().max(120).optional(),
  openOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type DiscoverQueryInput = z.infer<typeof DiscoverQuerySchema>;

export const PublicRegisterSchema = z.object({
  teamName: z.string().min(2).max(120),
  shortName: z.string().max(20).optional(),
  categoryId: z.string().uuid().optional(),
  contactName: z.string().min(2).max(120),
  phone: z
    .string()
    .regex(/^\+?[0-9\s]{8,20}$/, 'Numéro invalide')
    .optional(),
  email: z.string().email().optional(),
});
export type PublicRegisterInput = z.infer<typeof PublicRegisterSchema>;
