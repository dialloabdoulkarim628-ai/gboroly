import { z } from 'zod';

export const RegisterSchema = z
  .object({
    firstName: z.string().min(1).max(80),
    lastName: z.string().min(1).max(80),
    email: z.string().email().optional(),
    phone: z
      .string()
      .regex(/^\+?[0-9]{8,15}$/, 'Numéro invalide (format E.164)')
      .optional(),
    password: z.string().min(8).max(128),
  })
  .refine((v) => v.email || v.phone, {
    message: 'Email ou téléphone requis',
    path: ['email'],
  });
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  identifier: z.string().min(1), // email ou téléphone
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginSchema>;
