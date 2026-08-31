import { z } from 'zod';
import { RoleKey } from '@gboroly/types';

export const CreateOrganizationSchema = z.object({
  name: z.string().min(2).max(120),
  country: z.string().min(2),
  city: z.string().max(120).optional(),
  timezone: z.string().default('Africa/Abidjan'),
  currency: z.string().length(3).default('XOF'),
  description: z.string().max(2000).optional(),
});
export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;

export const UpdateOrganizationSchema = CreateOrganizationSchema.partial();
export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>;

/** Rôles assignables à un membre (le SUPER_ADMIN plateforme n'est pas assignable ici). */
const AssignableRole = z.enum([
  RoleKey.ORGANIZATION_ADMIN,
  RoleKey.FINANCE_MANAGER,
  RoleKey.TOURNAMENT_MANAGER,
  RoleKey.MATCH_OPERATOR,
  RoleKey.COMMUNICATION_MANAGER,
  RoleKey.REFEREE,
  RoleKey.TEAM_MANAGER,
  RoleKey.ORGANIZATION_OWNER,
]);

export const InviteMemberSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z
      .string()
      .regex(/^\+?[0-9]{8,15}$/)
      .optional(),
    role: AssignableRole,
  })
  .refine((v) => v.email || v.phone, {
    message: 'Email ou téléphone requis',
    path: ['email'],
  });
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;

export const UpdateMemberRoleSchema = z.object({
  role: AssignableRole,
});
export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleSchema>;

export const AcceptInvitationSchema = z.object({
  token: z.string().min(10),
});
export type AcceptInvitationInput = z.infer<typeof AcceptInvitationSchema>;
