/**
 * Prépare le compte organisateur de DÉMO pour tester le dashboard.
 * - définit un mot de passe (Argon2id) sur demo@gboroly.test
 * - le rend membre OWNER de l'org « Académie Events (Démo) » (celle du tournoi démo)
 * - marque l'email comme vérifié
 *
 * Lancer (depuis la racine, avec l'URL directe) :
 *   set -a && source <(grep -E '^(DATABASE_URL|DIRECT_URL)=' .env) && set +a
 *   DATABASE_URL="$DIRECT_URL" pnpm --filter @gboroly/database exec tsx apps/api/scripts/setup-demo-user.ts
 */
import { PrismaClient } from '@gboroly/database';
import { hashPassword } from '../src/auth/lib/password';

const EMAIL = 'demo@gboroly.test';
const PASSWORD = 'gboroly123';
const ORG_SLUG = 'gboroly-demo';

async function main() {
  const prisma = new PrismaClient();
  try {
    const org = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
    if (!org) throw new Error(`Org ${ORG_SLUG} introuvable — lance d'abord demo-seed.ts`);

    const ownerRole = await prisma.role.findFirst({
      where: { key: 'ORGANIZATION_OWNER', isSystem: true },
    });
    if (!ownerRole) throw new Error('Rôle système ORGANIZATION_OWNER absent — lance le seed RBAC');

    const passwordHash = await hashPassword(PASSWORD);
    const user = await prisma.user.upsert({
      where: { email: EMAIL },
      update: { passwordHash, emailVerifiedAt: new Date() },
      create: {
        email: EMAIL,
        firstName: 'Jean',
        lastName: 'Koffi',
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });

    await prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: org.id, userId: user.id } },
      update: { roleId: ownerRole.id, status: 'ACTIVE', joinedAt: new Date() },
      create: {
        organizationId: org.id,
        userId: user.id,
        roleId: ownerRole.id,
        status: 'ACTIVE',
        joinedAt: new Date(),
      },
    });

    console.log('✅ Compte démo prêt :');
    console.log(`   email    : ${EMAIL}`);
    console.log(`   password : ${PASSWORD}`);
    console.log(`   org      : ${org.name} (OWNER)`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
