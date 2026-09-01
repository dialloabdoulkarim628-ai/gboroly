import { z } from 'zod';

export const CreateAnnouncementSchema = z.object({
  title: z.string().min(2).max(160),
  body: z.string().min(1).max(4000),
});
export type CreateAnnouncementInput = z.infer<typeof CreateAnnouncementSchema>;
