/**
 * Seed de développement Gboroly.
 * Phase 1-3 : sport maracana, permissions + rôles système avec leur matrice RBAC.
 * Le seed complet (16 équipes / 4 groupes) sera ajouté en Phase 5.
 *
 * Prérequis : @gboroly/types doit être buildé (pnpm build) avant le seed.
 */
import { PrismaClient, RoleKey } from '@prisma/client';
import { PERMISSIONS, permissionsForRole } from '@gboroly/types';

const prisma = new PrismaClient();

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
  const permByKey = new Map(
    (await prisma.permission.findMany()).map((p) => [p.key, p.id]),
  );

  // Rôles système + attache des permissions (matrice RBAC).
  for (const key of Object.values(RoleKey)) {
    let role = await prisma.role.findFirst({ where: { key, isSystem: true } });
    role ??= await prisma.role.create({ data: { key, name: key, isSystem: true } });

    for (const perm of permissionsForRole(key)) {
      const permissionId = permByKey.get(perm);
      if (!permissionId) continue;
      const exists = await prisma.rolePermission.findFirst({
        where: { roleId: role.id, permissionId },
      });
      if (!exists) {
        await prisma.rolePermission.create({ data: { roleId: role.id, permissionId } });
      }
    }
  }

  console.log('✅ Seed terminé (sport, permissions, rôles système + matrice RBAC).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
