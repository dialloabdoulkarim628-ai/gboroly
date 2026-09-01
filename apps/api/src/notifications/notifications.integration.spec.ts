/**
 * Test d'intégration Phase 11 — annonce → outbox + notification in-app (nécessite PostgreSQL).
 *   RUN_DB_TESTS=1 pnpm --filter @gboroly/api test
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@gboroly/database';
import { NotificationsService } from './notifications.service';
import { CommunicationsService } from './communications.service';

const runDb = process.env.RUN_DB_TESTS === '1';

describe.skipIf(!runDb)('Communications (intégration DB)', () => {
  const prisma = new PrismaClient();
  const notifications = new NotificationsService(prisma as never);
  const communications = new CommunicationsService(prisma as never, notifications);

  const tag = `notif_${Date.now()}`;
  let orgId = '';
  let userId = '';
  let tournamentId = '';

  beforeAll(async () => {
    await prisma.$connect();
    const sport = await prisma.sport.upsert({
      where: { key: 'maracana' },
      update: {},
      create: { key: 'maracana', name: 'Maracana', defaultRules: {} },
    });
    const role = await prisma.role.findFirstOrThrow({ where: { key: 'ORGANIZATION_OWNER' } });
    const org = await prisma.organization.create({
      data: { name: `Org ${tag}`, slug: `org-${tag}`, country: 'CI', currency: 'XOF', timezone: 'Africa/Abidjan' },
    });
    orgId = org.id;
    const user = await prisma.user.create({
      data: { firstName: 'N', lastName: 'T', email: `${tag}@gboroly.test` },
    });
    userId = user.id;
    await prisma.organizationMember.create({
      data: { organizationId: orgId, userId, roleId: role.id, status: 'ACTIVE' },
    });
    const t = await prisma.tournament.create({
      data: {
        organizationId: orgId,
        sportId: sport.id,
        createdByUserId: userId,
        name: `T ${tag}`,
        slug: `t-${tag}`,
        country: 'CI',
        currency: 'XOF',
        timezone: 'Africa/Abidjan',
        status: 'PUBLISHED',
      },
    });
    tournamentId = t.id;
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.outboxEvent.deleteMany({ where: { aggregateType: 'Announcement' } });
    await prisma.announcement.deleteMany({ where: { tournamentId } });
    await prisma.organizationMember.deleteMany({ where: { organizationId: orgId } });
    await prisma.tournament.deleteMany({ where: { id: tournamentId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('publie une annonce → outbox + notifie les membres', async () => {
    const ann = await communications.createAnnouncement(orgId, tournamentId, userId, {
      title: 'Report du match',
      body: 'Le match de 15h est reporté à 17h.',
    });
    expect(ann.publishedAt).toBeTruthy();

    const outbox = await prisma.outboxEvent.count({
      where: { aggregateId: ann.id, eventType: 'AnnouncementCreated' },
    });
    expect(outbox).toBe(1);

    const notifs = await notifications.list(userId);
    expect(notifs.some((n) => n.type === 'ANNOUNCEMENT')).toBe(true);
  });

  it('compte les non-lus puis marque comme lu', async () => {
    const before = await notifications.unreadCount(userId);
    expect(before).toBeGreaterThanOrEqual(1);
    await notifications.markAllRead(userId);
    const after = await notifications.unreadCount(userId);
    expect(after).toBe(0);
  });
});
