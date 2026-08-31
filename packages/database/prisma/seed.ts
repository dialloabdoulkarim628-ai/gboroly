/**
 * Seed de développement Gboroly.
 * Phase 1 : sport maracana, permissions, rôles système, organisation démo + owner.
 * Le seed complet (16 équipes / 4 groupes) sera ajouté en Phase 5.
 */
import { PrismaClient, RoleKey } from '@prisma/client';

const prisma = new PrismaClient();

const PERMISSIONS = [
  'organization.manage',
  'member.invite',
  'member.manage',
  'billing.manage',
  'tournament.create',
  'tournament.update',
  'tournament.publish',
  'tournament.delete',
  'tournament.duplicate',
  'category.manage',
  'venue.manage',
  'referee.manage',
  'sponsor.manage',
  'team.manage',
  'player.manage',
  'registration.review',
  'competition.configure',
  'schedule.generate',
  'schedule.edit',
  'match.operate',
  'match.reschedule',
  'match.cancel',
  'standing.view',
  'payment.manage',
  'payment.refund',
  'announcement.publish',
  'notification.send',
  'public.manage',
  'export.run',
  'audit.view',
  'admin.platform',
];

const MARACANA_RULES = {
  pointsWin: 3,
  pointsDraw: 1,
  pointsLoss: 0,
  matchDurationMinutes: 50,
  playersPerTeam: 6,
  tieBreakers: ['POINTS', 'GOAL_DIFFERENCE', 'GOALS_FOR', 'HEAD_TO_HEAD', 'FAIR_PLAY', 'RANDOM_DRAW'],
  penaltyShootout: true,
  cards: true,
};

async function main() {
  // Sport
  await prisma.sport.upsert({
    where: { key: 'maracana' },
    update: {},
    create: { key: 'maracana', name: 'Maracana', defaultRules: MARACANA_RULES },
  });

  // Permissions
  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  }

  // Rôles système (globaux, organizationId = null)
  for (const key of Object.values(RoleKey)) {
    const existing = await prisma.role.findFirst({ where: { key, isSystem: true } });
    if (!existing) {
      await prisma.role.create({ data: { key, name: key, isSystem: true } });
    }
  }

  console.log('✅ Seed Phase 1 terminé (sport, permissions, rôles système).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
