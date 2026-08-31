import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

/** Marque une route comme publique (pas de JwtAuthGuard). */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Permissions requises (RBAC, contexte organisation). */
export const REQUIRE_PERMISSIONS_KEY = 'requirePermissions';
export const RequirePermissions = (...perms: string[]) =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, perms);

/** Exige seulement d'être membre actif de l'organisation (sans permission précise). */
export const REQUIRE_MEMBERSHIP_KEY = 'requireMembership';
export const RequireMembership = () => SetMetadata(REQUIRE_MEMBERSHIP_KEY, true);

export interface AuthUser {
  id: string;
}

/** Injecte l'utilisateur authentifié (posé par JwtAuthGuard). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    return request.user;
  },
);

/** Injecte le membership actif (posé par PermissionsGuard) : { organizationId, roleKey, permissions }. */
export const ActiveMembership = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<{ membership?: unknown }>();
  return request.membership;
});
