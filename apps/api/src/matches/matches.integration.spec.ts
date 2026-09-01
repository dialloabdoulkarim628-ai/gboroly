/**
 * Test d'intégration Phase 7 — Golden Path moteur↔DB (nécessite PostgreSQL).
 *   pnpm docker:up   (ou Supabase via .env)
 *   pnpm --filter @gboroly/database exec prisma db push
 *   RUN_DB_TESTS=1 pnpm --filter @gboroly/api test
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@gboroly/database';
import { CompetitionsService } from '../competitions/competitions.service';
import { MatchesService } from './matches.service';

const runDb = process.env.RUN_DB_TESTS === '1';

describe.skipIf(!runDb)('Golden Path — génération → matchs → classement → phases finales', () => {
  const prisma = new PrismaClient();
  const competitions = new CompetitionsService(prisma as never);
  const matches = new MatchesService(prisma as never);

  const tag = `it_${Date.now()}`;
  let orgId = '';
  let userId = '';
  let tournamentId = '';
  let categoryId = '';
  let competitionId = '';
  const regIds: string[] = [];

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
      data: { firstName: 'It', lastName: 'Test', email: `${tag}@gboroly.test` },
    });
    userId = user.id;
    const tournament = await prisma.tournament.create({
      data: {
        organizationId: orgId,
        sportId: sport.id,
        createdByUserId: userId,
        name: `Tournoi ${tag}`,
        slug: `t-${tag}`,
        country: 'CI',
        currency: 'XOF',
        timezone: 'Africa/Abidjan',
        status: 'PUBLISHED',
      },
    });
    tournamentId = tournament.id;
    const category = await prisma.tournamentCategory.create({
      data: { tournamentId, name: 'Senior', slug: 'senior' },
    });
    categoryId = category.id;

    for (let i = 1; i <= 4; i++) {
      const team = await prisma.team.create({
        data: { organizationId: orgId, name: `Team ${i} ${tag}`, slug: `team-${i}-${tag}` },
      });
      const reg = await prisma.registration.create({
        data: { tournamentId, categoryId, teamId: team.id, seed: i, status: 'APPROVED' },
      });
      regIds.push(reg.id);
    }
  });

  afterAll(async () => {
    // Nettoyage en ordre de dépendances.
    const comps = await prisma.competition.findMany({ where: { tournamentId }, select: { id: true } });
    const compIds = comps.map((c) => c.id);
    const ms = await prisma.match.findMany({ where: { competitionId: { in: compIds } }, select: { id: true } });
    await prisma.matchEvent.deleteMany({ where: { matchId: { in: ms.map((m) => m.id) } } });
    await prisma.standing.deleteMany({ where: { competitionId: { in: compIds } } });
    await prisma.match.deleteMany({ where: { tournamentId } });
    await prisma.groupTeam.deleteMany({ where: { group: { round: { competitionId: { in: compIds } } } } });
    await prisma.group.deleteMany({ where: { round: { competitionId: { in: compIds } } } });
    await prisma.round.deleteMany({ where: { competitionId: { in: compIds } } });
    await prisma.competition.deleteMany({ where: { tournamentId } });
    await prisma.outboxEvent.deleteMany({ where: { aggregateId: { in: ms.map((m) => m.id) } } });
    await prisma.registration.deleteMany({ where: { tournamentId } });
    await prisma.team.deleteMany({ where: { organizationId: orgId } });
    await prisma.tournamentCategory.deleteMany({ where: { tournamentId } });
    await prisma.tournament.deleteMany({ where: { id: tournamentId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('génère une compétition GROUP_TO_PLAYOFFS (2 groupes de 2)', async () => {
    const comp = await competitions.generate(orgId, categoryId, {
      type: 'GROUP_TO_PLAYOFFS',
      groups: 2,
      qualifyPerGroup: 1,
    });
    competitionId = comp.id;
    const groupMatches = await competitions.getMatches(orgId, competitionId);
    expect(groupMatches).toHaveLength(2); // 1 match par groupe de 2
    expect(groupMatches.every((m) => m.homeTeamId && m.awayTeamId)).toBe(true);
  });

  it('termine les matchs de poule → classement recalculé', async () => {
    const groupMatches = await competitions.getMatches(orgId, competitionId);
    for (const m of groupMatches) {
      await matches.finish(orgId, m.id, { homeScore: 2, awayScore: 0 }); // le "home" gagne
    }
    const standings = await competitions.getStandings(orgId, competitionId);
    expect(standings).toHaveLength(4); // 2 groupes × 2 équipes
    const leaders = standings.filter((s) => s.position === 1);
    expect(leaders).toHaveLength(2);
    expect(leaders.every((s) => s.points === 3)).toBe(true);
  });

  it('génère les phases finales à partir des qualifiés', async () => {
    await competitions.generatePlayoffs(orgId, competitionId);
    const all = await competitions.getMatches(orgId, competitionId);
    const playoff = all.filter((m) => !m.groupId);
    expect(playoff.length).toBeGreaterThanOrEqual(1);
    const finalMatch = playoff.at(-1)!;
    expect(finalMatch.homeTeamId).toBeTruthy();
    expect(finalMatch.awayTeamId).toBeTruthy(); // qualifiés injectés
  });

  it('termine la finale → champion + événement outbox', async () => {
    const all = await competitions.getMatches(orgId, competitionId);
    const finalMatch = all.filter((m) => !m.groupId).at(-1)!;
    const finished = await matches.finish(orgId, finalMatch.id, { homeScore: 3, awayScore: 1 });
    expect(finished.status).toBe('FINISHED');
    expect(finished.winnerRegistrationId).toBe(finalMatch.homeTeamId);

    const outbox = await prisma.outboxEvent.count({ where: { eventType: 'MatchFinished' } });
    expect(outbox).toBeGreaterThanOrEqual(3); // 2 poules + 1 finale
  });

  it('refuse de terminer un match déjà terminé (idempotence défensive)', async () => {
    const all = await competitions.getMatches(orgId, competitionId);
    const done = all.find((m) => m.status === 'FINISHED')!;
    await expect(matches.finish(orgId, done.id, { homeScore: 1, awayScore: 0 })).rejects.toThrow();
  });
});
