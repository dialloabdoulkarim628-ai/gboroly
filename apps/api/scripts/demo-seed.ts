/**
 * Seed de DÉMO — déroule le Golden Path complet via les vrais services.
 * Produit un tournoi PUBLISHED + PUBLIC avec poules jouées, phases finales et champion.
 *
 *   set -a && source ./.env && set +a
 *   DATABASE_URL="$DIRECT_URL" pnpm --filter @gboroly/api exec tsx scripts/demo-seed.ts
 */
import { PrismaClient } from '@gboroly/database';
import { CompetitionsService } from '../src/competitions/competitions.service';
import { MatchesService } from '../src/matches/matches.service';
import { SchedulingService } from '../src/scheduling/scheduling.service';

const prisma = new PrismaClient();
const competitions = new CompetitionsService(prisma as never);
const matches = new MatchesService(prisma as never);

const ORG_SLUG = 'gboroly-demo';
const TOURNAMENT_SLUG = 'maracana-cup-abidjan-2026';

const TEAMS = [
  'FC Abobo',
  'AS Cocody',
  'Étoile de Yopougon',
  'Racing Treichville',
  'Espoir de Marcory',
  'US Koumassi',
  'AC Plateau',
  'FC Adjamé',
];

async function cleanup(orgId: string) {
  const comps = await prisma.competition.findMany({ where: { organizationId: orgId }, select: { id: true } });
  const compIds = comps.map((c) => c.id);
  const ms = await prisma.match.findMany({ where: { tournament: { organizationId: orgId } }, select: { id: true } });
  const mIds = ms.map((m) => m.id);
  await prisma.matchEvent.deleteMany({ where: { matchId: { in: mIds } } });
  await prisma.outboxEvent.deleteMany({ where: { aggregateId: { in: mIds } } });
  await prisma.standing.deleteMany({ where: { competitionId: { in: compIds } } });
  await prisma.match.deleteMany({ where: { tournament: { organizationId: orgId } } });
  await prisma.groupTeam.deleteMany({ where: { group: { round: { competitionId: { in: compIds } } } } });
  await prisma.group.deleteMany({ where: { round: { competitionId: { in: compIds } } } });
  await prisma.round.deleteMany({ where: { competitionId: { in: compIds } } });
  await prisma.competition.deleteMany({ where: { organizationId: orgId } });
  await prisma.registration.deleteMany({ where: { tournament: { organizationId: orgId } } });
  await prisma.payment.deleteMany({ where: { organizationId: orgId } });
  await prisma.field.deleteMany({ where: { venue: { tournament: { organizationId: orgId } } } });
  await prisma.venue.deleteMany({ where: { tournament: { organizationId: orgId } } });
  await prisma.announcement.deleteMany({ where: { tournament: { organizationId: orgId } } });
  await prisma.tournamentCategory.deleteMany({ where: { tournament: { organizationId: orgId } } });
  await prisma.tournament.deleteMany({ where: { organizationId: orgId } });
  await prisma.team.deleteMany({ where: { organizationId: orgId } });
  await prisma.player.deleteMany({ where: { organizationId: orgId } });
}

async function main() {
  const sport = await prisma.sport.upsert({
    where: { key: 'maracana' },
    update: {},
    create: { key: 'maracana', name: 'Maracana', defaultRules: {} },
  });

  const existing = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  const org =
    existing ??
    (await prisma.organization.create({
      data: { name: 'Académie Events (Démo)', slug: ORG_SLUG, country: 'CI', city: 'Abidjan', currency: 'XOF', timezone: 'Africa/Abidjan' },
    }));
  if (existing) await cleanup(org.id);

  const user = await prisma.user.upsert({
    where: { email: 'demo@gboroly.test' },
    update: {},
    create: { firstName: 'Jean', lastName: 'Koffi', email: 'demo@gboroly.test' },
  });

  const tournament = await prisma.tournament.create({
    data: {
      organizationId: org.id,
      sportId: sport.id,
      createdByUserId: user.id,
      name: 'Maracana Cup Abidjan 2026',
      slug: TOURNAMENT_SLUG,
      description: 'Le grand tournoi de Maracana d’Abidjan — 8 équipes, phase de groupes puis phases finales.',
      country: 'CI',
      city: 'Abidjan',
      startDate: new Date('2026-09-12T08:00:00Z'),
      endDate: new Date('2026-09-14T20:00:00Z'),
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      registrationFee: 50_000n,
      currency: 'XOF',
      timezone: 'Africa/Abidjan',
    },
  });

  const category = await prisma.tournamentCategory.create({
    data: { tournamentId: tournament.id, name: 'Senior', slug: 'senior' },
  });

  const venue = await prisma.venue.create({
    data: { tournamentId: tournament.id, name: 'Complexe Sportif d’Abidjan', address: 'Abidjan' },
  });
  await prisma.field.createMany({
    data: [
      { venueId: venue.id, tournamentId: tournament.id, name: 'Terrain A' },
      { venueId: venue.id, tournamentId: tournament.id, name: 'Terrain B' },
    ],
  });

  // Équipes + inscriptions validées.
  for (let i = 0; i < TEAMS.length; i++) {
    const team = await prisma.team.create({
      data: { organizationId: org.id, name: TEAMS[i]!, slug: `demo-${i}-${TEAMS[i]!.toLowerCase().replace(/[^a-z]+/g, '-')}` },
    });
    await prisma.registration.create({
      data: { tournamentId: tournament.id, categoryId: category.id, teamId: team.id, seed: i + 1, status: 'APPROVED', approvedAt: new Date() },
    });
  }

  // Format : 2 groupes de 4, 2 qualifiés par groupe.
  const competition = await competitions.generate(org.id, category.id, {
    type: 'GROUP_TO_PLAYOFFS',
    groups: 2,
    qualifyPerGroup: 2,
  });

  // Calendrier (dates/terrains).
  const scheduling = new SchedulingService(prisma as never);
  await scheduling.generateForCompetition(org.id, competition.id, {
    days: ['2026-09-12', '2026-09-13'],
    startTime: '09:00',
    endTime: '19:00',
    matchDurationMin: 60,
    breakMin: 0,
    restMinutesPerTeam: 60,
    dryRun: false,
  });

  // Joue toute la phase de groupes.
  let all = await competitions.getMatches(org.id, competition.id);
  let g = 0;
  for (const m of all.filter((x) => x.groupId)) {
    g++;
    const home = 1 + (g % 3);
    const away = g % 2;
    await matches.finish(org.id, m.id, { homeScore: home, awayScore: away });
  }

  // Phases finales à partir des qualifiés.
  await competitions.generatePlayoffs(org.id, competition.id);

  // Joue les phases finales (semis puis finale) — le local (home) gagne 2-1.
  for (let round = 0; round < 4; round++) {
    all = await competitions.getMatches(org.id, competition.id);
    const playable = all.filter((m) => !m.groupId && m.status === 'SCHEDULED' && m.homeTeamId && m.awayTeamId);
    if (playable.length === 0) break;
    for (const m of playable) {
      await matches.finish(org.id, m.id, { homeScore: 2, awayScore: 1 });
    }
  }

  // Une annonce pour la page publique.
  await prisma.announcement.create({
    data: {
      tournamentId: tournament.id,
      title: 'Bienvenue à la Maracana Cup Abidjan 2026 !',
      body: 'Les phases finales se jouent dimanche. Venez nombreux au Complexe Sportif d’Abidjan.',
      publishedAt: new Date(),
      createdByUserId: user.id,
    },
  });

  console.log(`\n✅ Démo prête : /t/${TOURNAMENT_SLUG}`);
  console.log(`   Tournoi: ${tournament.name} — 8 équipes, 2 groupes, phases finales jouées.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
