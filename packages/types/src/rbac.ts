// RBAC — source unique de vérité : permissions et matrice rôle → permissions.
// Consommée par le seed (packages/database) et par le PermissionsGuard (apps/api).
// Voir docs/RBAC.md.
import { RoleKey } from './enums.js';

export const PERMISSIONS = [
  'organization.manage',
  'member.invite',
  'member.manage',
  'billing.manage',
  'tournament.create',
  'tournament.update',
  'tournament.publish',
  'tournament.delete',
  'tournament.duplicate',
  'category.manage',
  'venue.manage',
  'referee.manage',
  'sponsor.manage',
  'team.manage',
  'player.manage',
  'registration.review',
  'competition.configure',
  'schedule.generate',
  'schedule.edit',
  'match.operate',
  'match.reschedule',
  'match.cancel',
  'standing.view',
  'payment.manage',
  'payment.refund',
  'announcement.publish',
  'notification.send',
  'public.manage',
  'export.run',
  'audit.view',
  'admin.platform',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ORG_ADMIN_PERMS: Permission[] = [
  'member.invite',
  'member.manage',
  'tournament.create',
  'tournament.update',
  'tournament.publish',
  'tournament.delete',
  'tournament.duplicate',
  'category.manage',
  'venue.manage',
  'referee.manage',
  'sponsor.manage',
  'team.manage',
  'player.manage',
  'registration.review',
  'competition.configure',
  'schedule.generate',
  'schedule.edit',
  'match.operate',
  'match.reschedule',
  'match.cancel',
  'standing.view',
  'payment.manage',
  'payment.refund',
  'announcement.publish',
  'notification.send',
  'public.manage',
  'export.run',
  'audit.view',
];

const TOURNAMENT_MANAGER_PERMS: Permission[] = [
  'tournament.create',
  'tournament.update',
  'tournament.publish',
  'tournament.duplicate',
  'category.manage',
  'venue.manage',
  'referee.manage',
  'sponsor.manage',
  'team.manage',
  'player.manage',
  'registration.review',
  'competition.configure',
  'schedule.generate',
  'schedule.edit',
  'match.operate',
  'match.reschedule',
  'match.cancel',
  'standing.view',
  'announcement.publish',
  'public.manage',
  'export.run',
];

/** Matrice rôle → permissions. OWNER = toutes les permissions d'organisation. */
export const ROLE_PERMISSIONS: Record<RoleKey, Permission[]> = {
  [RoleKey.SUPER_ADMIN]: [...PERMISSIONS],
  [RoleKey.ORGANIZATION_OWNER]: PERMISSIONS.filter((p) => p !== 'admin.platform'),
  [RoleKey.ORGANIZATION_ADMIN]: ORG_ADMIN_PERMS,
  [RoleKey.FINANCE_MANAGER]: ['payment.manage', 'payment.refund', 'export.run', 'standing.view'],
  [RoleKey.TOURNAMENT_MANAGER]: TOURNAMENT_MANAGER_PERMS,
  [RoleKey.MATCH_OPERATOR]: ['match.operate', 'standing.view'],
  [RoleKey.COMMUNICATION_MANAGER]: [
    'announcement.publish',
    'notification.send',
    'sponsor.manage',
    'public.manage',
  ],
  [RoleKey.REFEREE]: ['match.operate', 'standing.view'],
  [RoleKey.TEAM_MANAGER]: ['team.manage', 'player.manage', 'standing.view'],
};

export function permissionsForRole(role: RoleKey): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
