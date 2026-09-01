/**
 * Test d'intégration Phase 13 — sponsors + import/export (nécessite PostgreSQL).
 *   RUN_DB_TESTS=1 pnpm --filter @gboroly/api test
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@gboroly/database';
import { SponsorsService } from '../sponsors/sponsors.service';
import { DataService } from './data.service';

const runDb = process.env.RUN_DB_TESTS === '1';

describe.skipIf(!runDb)('Fonctionnalités avancées (intégration DB)', () => {
  const prisma = new PrismaClient();
  const sponsors = new SponsorsService(prisma as never);
  const data = new DataService(prisma as never);
  const tag = `adv_${Date.now()}`;
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
    const user = await prisma.user.create({ data: { firstName: 'A', lastName: 'V', email: `${tag}@gboroly.test` } });
    userId = user.id;
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
      },
    });
    tournamentId = t.id;
  });

  afterAll(async () => {
    await prisma.sponsor.deleteMany({ where: { tournamentId } });
    await prisma.tournament.deleteMany({ where: { id: tournamentId } });
    await prisma.team.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('sponsors : création + liste', async () => {
    await sponsors.create(orgId, tournamentId, { name: 'Wave', level: 'MAIN' });
    await sponsors.create(orgId, tournamentId, { name: 'Orange', level: 'GOLD' });
    const list = await sponsors.list(orgId, tournamentId);
    expect(list).toHaveLength(2);
    expect(list.map((s) => s.name)).toContain('Wave');
  });

  it('import équipes : preview signale les erreurs puis confirm crée', async () => {
    const csv = 'name,phone\nFC Abobo,0700\n,0800\nFC Abobo,0100\nAS Cocody,0900';
    const preview = await data.importTeamsPreview(orgId, tournamentId, csv);
    expect(preview.valid).toHaveLength(2); // FC Abobo + AS Cocody
    expect(preview.errors).toHaveLength(2); // manquant + doublon

    const res = await data.importTeamsConfirm(orgId, tournamentId, { rows: preview.valid });
    expect(res.created).toBe(2);
    const count = await prisma.team.count({ where: { organizationId: orgId } });
    expect(count).toBe(2);
  });

  it('export équipes : CSV avec en-têtes', async () => {
    const csv = await data.exportTeams(orgId, tournamentId);
    expect(csv.split('\n')[0]).toContain('name');
  });
});
