/**
 * Intégration Tournois (nécessite PostgreSQL).
 *   pnpm docker:up && pnpm --filter @gboroly/database exec prisma db push
 *   RUN_DB_TESTS=1 pnpm --filter @gboroly/api test
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient, TournamentStatus } from '@gboroly/database';
import { TournamentsService } from './tournaments.service';

const runDb = process.env.RUN_DB_TESTS === '1';

describe.skipIf(!runDb)('TournamentsService (intégration DB)', () => {
  const prisma = new PrismaClient();
  const service = new TournamentsService(prisma as never);
  const suffix = Date.now();
  const userId = `t_user_${suffix}`;
  let orgId = '';
  let tournamentId = '';

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.sport.upsert({
      where: { key: 'maracana' },
      update: {},
      create: { key: 'maracana', name: 'Maracana', defaultRules: {} },
    });
    await prisma.user.create({
      data: { id: userId, firstName: 'T', lastName: 'U', email: `${userId}@t.ci` },
    });
    const org = await prisma.organization.create({
      data: { name: `Org ${suffix}`, slug: `org-${suffix}`, country: 'CI' },
    });
    orgId = org.id;
  });

  afterAll(async () => {
    await prisma.tournamentCategory.deleteMany({ where: { tournament: { organizationId: orgId } } });
    await prisma.tournament.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('crée un tournoi en DRAFT', async () => {
    const t = await service.create(orgId, userId, {
      name: 'Coupe Abidjan',
      sportKey: 'maracana',
      country: 'CI',
      visibility: 'PRIVATE',
      currency: 'XOF',
      timezone: 'Africa/Abidjan',
    } as never);
    tournamentId = t.id;
    expect(t.status).toBe(TournamentStatus.DRAFT);
    expect(t.slug).toContain('coupe-abidjan');
  });

  it('refuse la publication sans catégorie (CHECKLIST_INCOMPLETE)', async () => {
    await expect(service.publish(orgId, tournamentId)).rejects.toThrow();
  });

  it('publie après ajout d’une catégorie', async () => {
    await service.createCategory(orgId, tournamentId, { name: 'Senior' } as never);
    const { items } = await service.getChecklist(orgId, tournamentId);
    expect(items.find((i) => i.key === 'categories')?.met).toBe(true);
    const published = await service.publish(orgId, tournamentId);
    expect(published.status).toBe(TournamentStatus.PUBLISHED);
  });

  it('duplique en DRAFT avec les catégories (sans les résultats)', async () => {
    const clone = await service.duplicate(orgId, userId, tournamentId);
    expect(clone.status).toBe(TournamentStatus.DRAFT);
    const cats = await service.listCategories(orgId, clone.id);
    expect(cats).toHaveLength(1);
  });

  it('isole les tenants : un autre org ne voit pas le tournoi', async () => {
    await expect(service.getById('org-inexistant', tournamentId)).rejects.toThrow();
  });
});
