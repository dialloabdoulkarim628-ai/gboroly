/**
 * Intégration Organisations + RBAC (nécessite PostgreSQL + rôles système seedés).
 *   pnpm docker:up
 *   pnpm --filter @gboroly/database exec prisma db push
 *   pnpm db:seed
 *   RUN_DB_TESTS=1 pnpm --filter @gboroly/api test
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@gboroly/database';
import { RoleKey } from '@gboroly/types';
import { OrganizationsService } from './organizations.service';
import { RbacService } from '../rbac/rbac.service';

const runDb = process.env.RUN_DB_TESTS === '1';

describe.skipIf(!runDb)('Organizations + RBAC (intégration DB)', () => {
  const prisma = new PrismaClient();
  const rbac = new RbacService(prisma as never);
  const orgs = new OrganizationsService(prisma as never, rbac);

  const ownerId = `owner_${Date.now()}`;
  const inviteeId = `invitee_${Date.now()}`;
  let orgId = '';

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.user.create({
      data: { id: ownerId, firstName: 'Own', lastName: 'Er', email: `${ownerId}@t.ci` },
    });
    await prisma.user.create({
      data: { id: inviteeId, firstName: 'In', lastName: 'Vite', email: `${inviteeId}@t.ci` },
    });
  });

  afterAll(async () => {
    if (orgId) {
      await prisma.organizationMember.deleteMany({ where: { organizationId: orgId } });
      await prisma.invitation.deleteMany({ where: { organizationId: orgId } });
      await prisma.organization.deleteMany({ where: { id: orgId } });
    }
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, inviteeId] } } });
    await prisma.$disconnect();
  });

  it('create → owner membership + permissions complètes', async () => {
    const org = await orgs.create(ownerId, { name: 'CI Test Org', country: 'CI' } as never);
    orgId = org.id;
    const membership = await rbac.resolveMembership(ownerId, orgId);
    expect(membership?.roleKey).toBe(RoleKey.ORGANIZATION_OWNER);
    expect(membership?.permissions.has('tournament.publish')).toBe(true);
  });

  it('invite → accept → nouveau membre avec le bon rôle', async () => {
    const inv = await orgs.invite(
      orgId,
      { email: `${inviteeId}@t.ci`, role: RoleKey.TOURNAMENT_MANAGER } as never,
      ownerId,
    );
    await orgs.acceptInvitation(inviteeId, inv.token);
    const membership = await rbac.resolveMembership(inviteeId, orgId);
    expect(membership?.roleKey).toBe(RoleKey.TOURNAMENT_MANAGER);
    expect(membership?.permissions.has('tournament.create')).toBe(true);
    expect(membership?.permissions.has('payment.manage')).toBe(false);
  });

  it('empêche de retirer le dernier propriétaire', async () => {
    const members = await orgs.listMembers(orgId);
    const owner = members.find((m) => m.role.key === RoleKey.ORGANIZATION_OWNER)!;
    await expect(orgs.removeMember(orgId, owner.id)).rejects.toThrow();
  });
});
