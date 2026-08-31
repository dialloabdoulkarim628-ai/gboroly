import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSIONS_KEY } from '../../common/decorators';

/**
 * Scaffold RBAC. L'application effective des permissions dépend du contexte
 * d'organisation (membership → rôle → permissions), introduit en PHASE 3.
 * Ici : si aucune permission n'est requise, on laisse passer ; la résolution
 * des permissions de l'utilisateur sera branchée avec le module organizations.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRE_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    // PHASE 3 : charger les permissions effectives de request.user dans l'org active
    // et vérifier l'inclusion. Pour l'instant, seules les routes sans exigence passent.
    return false;
  }
}
