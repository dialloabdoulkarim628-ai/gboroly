import { Injectable } from '@nestjs/common';
import { MemberStatus } from '@gboroly/database';
import { permissionsForRole, RoleKey } from '@gboroly/types';
import { PrismaService } from '../prisma/prisma.service';

export interface Membership {
  organizationId: string;
  roleKey: RoleKey;
  permissions: Set<string>;
}

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  /** Résout le membership actif d'un utilisateur dans une organisation + ses permissions. */
  async resolveMembership(userId: string, organizationId: string): Promise<Membership | null> {
    const member = await this.prisma.organizationMember.findFirst({
      where: { userId, organizationId, status: MemberStatus.ACTIVE },
      include: { role: true },
    });
    if (!member) return null;

    const roleKey = member.role.key as RoleKey;
    return {
      organizationId,
      roleKey,
      permissions: new Set(permissionsForRole(roleKey)),
    };
  }

  /** Liste les organisations d'un utilisateur avec son rôle dans chacune. */
  async getUserOrganizations(userId: string) {
    const members = await this.prisma.organizationMember.findMany({
      where: { userId, status: MemberStatus.ACTIVE },
      include: { organization: true, role: true },
    });
    return members.map((m) => ({
      organization: m.organization,
      role: m.role.key,
    }));
  }
}
