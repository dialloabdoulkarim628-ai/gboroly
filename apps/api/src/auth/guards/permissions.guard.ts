import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { REQUIRE_MEMBERSHIP_KEY, REQUIRE_PERMISSIONS_KEY } from '../../common/decorators';
import { RbacService, type Membership } from '../../rbac/rbac.service';

/**
 * RBAC effectif (PHASE 3). Résout l'organisation active depuis :
 *   1. le paramètre de route `:orgId` (routes org-scopées),
 *   2. sinon l'en-tête `X-Organization-Id`.
 * Charge le membership de l'utilisateur, vérifie que les permissions requises
 * sont incluses dans celles de son rôle, et attache `request.membership`.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbac: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRE_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const membershipOnly = this.reflector.getAllAndOverride<boolean>(REQUIRE_MEMBERSHIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const needsPerms = (required?.length ?? 0) > 0;
    if (!needsPerms && !membershipOnly) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { id: string }; membership?: Membership }>();

    const userId = request.user?.id;
    if (!userId) throw new ForbiddenException(err('UNAUTHENTICATED', 'Authentification requise'));

    const organizationId =
      (request.params as Record<string, string | undefined>)?.orgId ??
      (request.headers['x-organization-id'] as string | undefined);

    if (!organizationId) {
      throw new ForbiddenException(err('ORGANIZATION_REQUIRED', 'Organisation active requise'));
    }

    const membership = await this.rbac.resolveMembership(userId, organizationId);
    if (!membership) {
      throw new ForbiddenException(err('NOT_A_MEMBER', 'Accès refusé à cette organisation'));
    }

    if (needsPerms) {
      const missing = required!.filter((p) => !membership.permissions.has(p));
      if (missing.length > 0) {
        throw new ForbiddenException(
          err('INSUFFICIENT_PERMISSION', `Permission requise: ${missing.join(', ')}`),
        );
      }
    }

    request.membership = membership;
    return true;
  }
}

function err(code: string, message: string) {
  return { error: { code, message } };
}
