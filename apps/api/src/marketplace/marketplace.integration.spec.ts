/**
 * Test d'intégration Phase 14 — marketplace (nécessite PostgreSQL).
 *   RUN_DB_TESTS=1 pnpm --filter @gboroly/api test
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@gboroly/database';
import { MarketplaceService } from './marketplace.service';

const runDb = process.env.RUN_DB_TESTS === '1';

describe.skipIf(!runDb)('MarketplaceService (intégration DB)', () => {
  const prisma = new PrismaClient();
  const marketplace = new MarketplaceService(prisma as never);
  const tag = `mkt_${Date.now()}`;
  const slug = `t-${tag}`;
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
    const org = await prisma.organization.create({
      data: { name: `Org ${tag}`, slug: `org-${tag}`, country: 'CI', currency: 'XOF', timezone: 'Africa/Abidjan' },
    });
    orgId = org.id;
    const user = await prisma.user.create({ data: { firstName: 'M', lastName: 'K', email: `${tag}@gboroly.test` } });
    userId = user.id;
    const t = await prisma.tournament.create({
      data: {
        organizationId: orgId,
        sportId: sport.id,
        createdByUserId: userId,
        name: `Open ${tag}`,
        slug,
        country: 'CI',
        city: 'Abidjan',
        currency: 'XOF',
        timezone: 'Africa/Abidjan',
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
        maxTeams: 16,
      },
    });
    tournamentId = t.id;
    await prisma.tournamentCategory.create({ data: { tournamentId, name: 'Senior', slug: 'senior' } });
  });

  afterAll(async () => {
    await prisma.registration.deleteMany({ where: { tournamentId } });
    await prisma.team.deleteMany({ where: { organizationId: orgId } });
    await prisma.tournamentCategory.deleteMany({ where: { tournamentId } });
    await prisma.tournament.deleteMany({ where: { id: tournamentId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('découverte : le tournoi ouvert apparaît', async () => {
    const res = await marketplace.discover({ q: `Open ${tag}`, openOnly: true, page: 1, pageSize: 20 });
    const found = res.items.find((i) => i.slug === slug);
    expect(found).toBeTruthy();
    expect(found!.registrationOpen).toBe(true);
  });

  it('inscription publique → PENDING + équipe créée', async () => {
    const r = await marketplace.register(slug, { teamName: 'FC Externe', contactName: 'Aya' });
    expect(r.status).toBe('PENDING');
    const reg = await prisma.registration.findUnique({ where: { id: r.registrationId }, include: { team: true } });
    expect(reg?.team.name).toBe('FC Externe');
    expect(reg?.status).toBe('PENDING');
  });

  it('refuse un doublon d’équipe', async () => {
    await expect(marketplace.register(slug, { teamName: 'FC Externe', contactName: 'X' })).rejects.toThrow();
  });

  it('refuse si les inscriptions sont fermées', async () => {
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { registrationEnd: new Date('2020-01-01') },
    });
    await expect(marketplace.register(slug, { teamName: 'Trop Tard FC', contactName: 'Y' })).rejects.toThrow();
    await prisma.tournament.update({ where: { id: tournamentId }, data: { registrationEnd: null } });
  });
});
