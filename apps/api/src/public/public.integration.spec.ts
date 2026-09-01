/**
 * Test d'intégration — API publique & filtre de visibilité (nécessite PostgreSQL).
 *   RUN_DB_TESTS=1 pnpm --filter @gboroly/api test
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@gboroly/database';
import { PublicService } from './public.service';
import { StatsService } from '../stats/stats.service';

const runDb = process.env.RUN_DB_TESTS === '1';

describe.skipIf(!runDb)('PublicService (visibilité)', () => {
  const prisma = new PrismaClient();
  const service = new PublicService(prisma as never, new StatsService(prisma as never));
  const tag = `pub_${Date.now()}`;
  let orgId = '';
  let userId = '';
  const publicSlug = `pub-${tag}`;
  const privateSlug = `priv-${tag}`;

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
    const user = await prisma.user.create({
      data: { firstName: 'P', lastName: 'T', email: `${tag}@gboroly.test` },
    });
    userId = user.id;
    const common = {
      organizationId: orgId,
      sportId: sport.id,
      createdByUserId: userId,
      country: 'CI',
      currency: 'XOF',
      timezone: 'Africa/Abidjan',
    };
    await prisma.tournament.create({
      data: { ...common, name: 'Public', slug: publicSlug, status: 'PUBLISHED', visibility: 'PUBLIC' },
    });
    await prisma.tournament.create({
      data: { ...common, name: 'Privé', slug: privateSlug, status: 'DRAFT', visibility: 'PRIVATE' },
    });
  });

  afterAll(async () => {
    await prisma.tournament.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('expose un tournoi PUBLISHED + PUBLIC', async () => {
    const t = await service.getTournament(publicSlug);
    expect(t.slug).toBe(publicSlug);
    expect(t.stats).toBeDefined();
  });

  it('masque un tournoi DRAFT / PRIVATE (404)', async () => {
    await expect(service.getTournament(privateSlug)).rejects.toThrow();
  });
});
