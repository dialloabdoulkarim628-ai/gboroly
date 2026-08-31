import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

/** Marque une route comme publique (pas de JwtAuthGuard). */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Permissions requises (RBAC — appliqué à partir de la Phase 3 avec le contexte org). */
export const REQUIRE_PERMISSIONS_KEY = 'requirePermissions';
export const RequirePermissions = (...perms: string[]) =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, perms);

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
