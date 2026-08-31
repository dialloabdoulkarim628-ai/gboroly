/**
 * Intégration Équipes/Joueurs/Inscriptions (nécessite PostgreSQL).
 *   RUN_DB_TESTS=1 pnpm --filter @gboroly/api test
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@gboroly/database';
import { TeamsService } from './teams.service';
import { PlayersService } from '../players/players.service';
import { RegistrationsService } from '../registrations/registrations.service';

const runDb = process.env.RUN_DB_TESTS === '1';

describe.skipIf(!runDb)('Teams / Players / Registrations (intégration DB)', () => {
  const prisma = new PrismaClient();
  const teams = new TeamsService(prisma as never);
  const players = new PlayersService(prisma as never);
  const registrations = new RegistrationsService(prisma as never);
  const suffix = Date.now();
  let orgId = '';
  let tournamentId = '';
  let categoryId = '';

  beforeAll(async () => {
    await prisma.$connect();
    const sport = await prisma.sport.upsert({
      where: { key: 'maracana' },
      update: {},
      create: { key: 'maracana', name: 'Maracana', defaultRules: {} },
    });
    const org = await prisma.organization.create({
      data: { name: `Org ${suffix}`, slug: `org-t-${suffix}`, country: 'CI' },
    });
    orgId = org.id;
    const t = await prisma.tournament.create({
      data: {
        organizationId: orgId,
        sportId: sport.id,
        createdByUserId: 'sys',
        name: 'T',
        slug: `t-${suffix}`,
        country: 'CI',
      },
    });
    tournamentId = t.id;
    const cat = await prisma.tournamentCategory.create({
      data: { tournamentId, name: 'Senior', slug: 'senior', maxSquad: 2 },
    });
    categoryId = cat.id;
  });

  afterAll(async () => {
    await prisma.teamPlayer.deleteMany({ where: { team: { organizationId: orgId } } });
    await prisma.registration.deleteMany({ where: { tournament: { organizationId: orgId } } });
    await prisma.tournamentCategory.deleteMany({ where: { tournamentId } });
    await prisma.tournament.deleteMany({ where: { organizationId: orgId } });
    await prisma.player.deleteMany({ where: { organizationId: orgId } });
    await prisma.team.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await prisma.$disconnect();
  });

  it('un joueur ne peut être actif que dans une équipe par tournoi', async () => {
    const teamA = await teams.create(orgId, { name: 'A' } as never);
    const teamB = await teams.create(orgId, { name: 'B' } as never);
    const player = await players.create(orgId, { firstName: 'J', lastName: 'D' } as never);

    await teams.addPlayer(orgId, teamA.id, { playerId: player.id, tournamentId } as never);
    await expect(
      teams.addPlayer(orgId, teamB.id, { playerId: player.id, tournamentId } as never),
    ).rejects.toThrow(); // PLAYER_ALREADY_REGISTERED
  });

  it('respecte l’effectif maximum de la catégorie', async () => {
    const team = await teams.create(orgId, { name: 'Effectif' } as never);
    const p1 = await players.create(orgId, { firstName: 'P', lastName: '1' } as never);
    const p2 = await players.create(orgId, { firstName: 'P', lastName: '2' } as never);
    const p3 = await players.create(orgId, { firstName: 'P', lastName: '3' } as never);
    const ctx = { tournamentId, categoryId };
    await teams.addPlayer(orgId, team.id, { playerId: p1.id, ...ctx } as never);
    await teams.addPlayer(orgId, team.id, { playerId: p2.id, ...ctx } as never);
    await expect(
      teams.addPlayer(orgId, team.id, { playerId: p3.id, ...ctx } as never),
    ).rejects.toThrow(); // SQUAD_MAX (maxSquad=2)
  });

  it('inscription : création puis refus du doublon, puis validation', async () => {
    const team = await teams.create(orgId, { name: 'Inscrite' } as never);
    const reg = await registrations.create(orgId, tournamentId, {
      teamId: team.id,
      categoryId,
    } as never);
    expect(reg.status).toBe('PENDING');

    await expect(
      registrations.create(orgId, tournamentId, { teamId: team.id, categoryId } as never),
    ).rejects.toThrow(); // TEAM_ALREADY_REGISTERED

    const approved = await registrations.approve(orgId, reg.id);
    expect(approved.status).toBe('APPROVED');
  });
});
