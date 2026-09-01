import { z } from 'zod';

// ─────────────────────────── Sponsors ───────────────────────────

export const CreateSponsorSchema = z.object({
  name: z.string().min(1).max(120),
  logoUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  level: z.enum(['MAIN', 'GOLD', 'SILVER', 'PARTNER']).default('PARTNER'),
  order: z.number().int().min(0).max(999).optional(),
});
export type CreateSponsorInput = z.infer<typeof CreateSponsorSchema>;

export const UpdateSponsorSchema = CreateSponsorSchema.partial();
export type UpdateSponsorInput = z.infer<typeof UpdateSponsorSchema>;

// ─────────────────────────── Import équipes (CSV) ───────────────────────────

export const ImportPreviewSchema = z.object({
  csv: z.string().min(1).max(1_000_000),
});
export type ImportPreviewInput = z.infer<typeof ImportPreviewSchema>;

export const ImportConfirmSchema = z.object({
  rows: z
    .array(
      z.object({
        name: z.string().min(2).max(120),
        shortName: z.string().max(20).optional(),
        phone: z.string().max(20).optional(),
      }),
    )
    .min(1)
    .max(512),
});
export type ImportConfirmInput = z.infer<typeof ImportConfirmSchema>;
