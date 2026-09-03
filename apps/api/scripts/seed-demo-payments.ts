/**
 * Sème des paiements PAID pour les inscriptions validées du tournoi démo,
 * afin que la carte « Revenus / Paiements reçus » du dashboard soit parlante.
 * Idempotent : ne recrée pas un paiement déjà présent pour une inscription.
 *
 * Lancer (depuis la racine, URL directe) :
 *   set -a && source <(grep -E '^(DATABASE_URL|DIRECT_URL)=' .env) && set +a
 *   DATABASE_URL="$DIRECT_URL" pnpm --filter @gboroly/database exec tsx <chemin-absolu>/seed-demo-payments.ts
 */
import { PrismaClient } from '@gboroly/database';

const ORG_SLUG = 'gboroly-demo';
const SLUG = 'maracana-cup-abidjan-2026';

async function main() {
  const prisma = new PrismaClient();
  try {
    const org = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
    const tournament = await prisma.tournament.findFirst({ where: { slug: SLUG } });
    if (!org || !tournament) throw new Error('Org ou tournoi démo introuvable');

    const fee = tournament.registrationFee ?? BigInt(50000);
    const regs = await prisma.registration.findMany({
      where: { tournamentId: tournament.id, status: 'APPROVED' },
      select: { id: true, teamId: true },
    });

    let created = 0;
    for (const r of regs) {
      const existing = await prisma.payment.findFirst({
        where: { registrationId: r.id, status: 'PAID' },
      });
      if (existing) continue;

      await prisma.payment.create({
        data: {
          organizationId: org.id,
          tournamentId: tournament.id,
          registrationId: r.id,
          teamId: r.teamId,
          grossAmount: fee,
          organizerAmount: fee,
          currency: 'XOF',
          status: 'PAID',
          method: 'CASH',
          idempotencyKey: `demo-pay-${r.id}`,
          paidAt: new Date(),
        },
      });
      created++;
    }

    const total = Number(fee) * regs.length;
    console.log(`✅ Paiements démo : ${created} créés (${regs.length} inscriptions).`);
    console.log(`   Revenu total attendu : ${total.toLocaleString('fr-FR')} XOF`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
