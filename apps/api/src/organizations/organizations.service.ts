import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvitationStatus, MemberStatus } from '@gboroly/database';
import { RoleKey } from '@gboroly/types';
import type {
  CreateOrganizationInput,
  InviteMemberInput,
  UpdateMemberRoleInput,
  UpdateOrganizationInput,
} from '@gboroly/validation';
import { slugWithSuffix } from '@gboroly/utils';
import { generateOpaqueToken } from '../auth/lib/tokens';
import { PrismaService } from '../prisma/prisma.service';
import { RbacService } from '../rbac/rbac.service';

const INVITATION_TTL_MS = 7 * 24 * 3600 * 1000;

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
  ) {}

  // ─────────────────────────── Organisations ───────────────────────────

  async create(userId: string, input: CreateOrganizationInput) {
    const ownerRoleId = await this.systemRoleId(RoleKey.ORGANIZATION_OWNER);

    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: input.name,
          slug: slugWithSuffix(input.name),
          country: input.country,
          city: input.city,
          timezone: input.timezone,
          currency: input.currency,
          description: input.description,
        },
      });
      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId,
          roleId: ownerRoleId,
          status: MemberStatus.ACTIVE,
          joinedAt: new Date(),
        },
      });
      return org;
    });
  }

  async getById(orgId: string) {
    const org = await this.prisma.organization.findFirst({
      where: { id: orgId, deletedAt: null },
    });
    if (!org) throw new NotFoundException(err('ORGANIZATION_NOT_FOUND', 'Organisation introuvable'));
    return org;
  }

  update(orgId: string, input: UpdateOrganizationInput) {
    return this.prisma.organization.update({ where: { id: orgId }, data: input });
  }

  listMine(userId: string) {
    return this.rbac.getUserOrganizations(userId);
  }

  // ─────────────────────────── Membres ───────────────────────────

  listMembers(orgId: string) {
    return this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        role: { select: { key: true } },
      },
    });
  }

  async updateMemberRole(orgId: string, memberId: string, input: UpdateMemberRoleInput) {
    const member = await this.getMember(orgId, memberId);
    // Empêche de retirer le dernier propriétaire.
    if (member.role.key === RoleKey.ORGANIZATION_OWNER && input.role !== RoleKey.ORGANIZATION_OWNER) {
      await this.assertNotLastOwner(orgId);
    }
    const roleId = await this.systemRoleId(input.role);
    return this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { roleId },
      include: { role: { select: { key: true } } },
    });
  }

  async removeMember(orgId: string, memberId: string) {
    const member = await this.getMember(orgId, memberId);
    if (member.role.key === RoleKey.ORGANIZATION_OWNER) {
      await this.assertNotLastOwner(orgId);
    }
    await this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { status: MemberStatus.DISABLED },
    });
    return { success: true };
  }

  // ─────────────────────────── Invitations ───────────────────────────

  async invite(orgId: string, input: InviteMemberInput, invitedByUserId: string) {
    const roleId = await this.systemRoleId(input.role as RoleKey);
    const token = generateOpaqueToken(24);
    const invitation = await this.prisma.invitation.create({
      data: {
        organizationId: orgId,
        email: input.email,
        phone: input.phone,
        roleId,
        token,
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
        createdByUserId: invitedByUserId,
      },
    });
    // Le token permet d'accepter (envoi email/WhatsApp en Phase 11).
    return { id: invitation.id, role: input.role, token };
  }

  listInvitations(orgId: string) {
    return this.prisma.invitation.findMany({
      where: { organizationId: orgId, status: InvitationStatus.PENDING },
    });
  }

  async revokeInvitation(orgId: string, invitationId: string) {
    const inv = await this.prisma.invitation.findFirst({
      where: { id: invitationId, organizationId: orgId },
    });
    if (!inv) throw new NotFoundException(err('INVITATION_NOT_FOUND', 'Invitation introuvable'));
    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.REVOKED },
    });
    return { success: true };
  }

  async acceptInvitation(userId: string, token: string) {
    const inv = await this.prisma.invitation.findUnique({ where: { token } });
    if (!inv || inv.status !== InvitationStatus.PENDING || inv.expiresAt < new Date()) {
      throw new BadRequestException(err('INVALID_INVITATION', 'Invitation invalide ou expirée'));
    }

    const existing = await this.prisma.organizationMember.findFirst({
      where: { organizationId: inv.organizationId, userId },
    });

    await this.prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.organizationMember.update({
          where: { id: existing.id },
          data: { roleId: inv.roleId, status: MemberStatus.ACTIVE, joinedAt: new Date() },
        });
      } else {
        await tx.organizationMember.create({
          data: {
            organizationId: inv.organizationId,
            userId,
            roleId: inv.roleId,
            status: MemberStatus.ACTIVE,
            joinedAt: new Date(),
          },
        });
      }
      await tx.invitation.update({
        where: { id: inv.id },
        data: { status: InvitationStatus.ACCEPTED },
      });
    });

    return { organizationId: inv.organizationId };
  }

  // ─────────────────────────── Helpers ───────────────────────────

  private async systemRoleId(key: RoleKey): Promise<string> {
    const role = await this.prisma.role.findFirst({ where: { key, isSystem: true } });
    if (!role) {
      throw new ConflictException(
        err('ROLE_NOT_SEEDED', `Rôle système ${key} absent — lancer le seed (pnpm db:seed)`),
      );
    }
    return role.id;
  }

  private async getMember(orgId: string, memberId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: orgId },
      include: { role: { select: { key: true } } },
    });
    if (!member) throw new NotFoundException(err('MEMBER_NOT_FOUND', 'Membre introuvable'));
    return member;
  }

  private async assertNotLastOwner(orgId: string) {
    const owners = await this.prisma.organizationMember.count({
      where: {
        organizationId: orgId,
        status: MemberStatus.ACTIVE,
        role: { key: RoleKey.ORGANIZATION_OWNER },
      },
    });
    if (owners <= 1) {
      throw new ForbiddenException(
        err('LAST_OWNER', 'Impossible de retirer le dernier propriétaire'),
      );
    }
  }
}

function err(code: string, message: string) {
  return { error: { code, message } };
}
