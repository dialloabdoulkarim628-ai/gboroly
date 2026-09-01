/**
 * Test d'intégration Phase 12 — paiements (nécessite PostgreSQL).
 *   RUN_DB_TESTS=1 pnpm --filter @gboroly/api test
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@gboroly/database';
import { PaymentsService } from './payments.service';

const runDb = process.env.RUN_DB_TESTS === '1';

describe.skipIf(!runDb)('PaymentsService (intégration DB)', () => {
  const prisma = new PrismaClient();
  const payments = new PaymentsService(prisma as never);
  const tag = `pay_${Date.now()}`;
  let orgId = '';
  let userId = '';
  let tournamentId = '';
  let regFull = '';
  let regPartial = '';

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
    const user = await prisma.user.create({ data: { firstName: 'P', lastName: 'Y', email: `${tag}@gboroly.test` } });
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
        registrationFee: 50_000n,
      },
    });
    tournamentId = t.id;
    const cat = await prisma.tournamentCategory.create({ data: { tournamentId, name: 'Senior', slug: 'senior' } });
    for (const key of ['full', 'partial']) {
      const team = await prisma.team.create({
        data: { organizationId: orgId, name: `Eq ${key} ${tag}`, slug: `eq-${key}-${tag}` },
      });
      const reg = await prisma.registration.create({
        data: { tournamentId, categoryId: cat.id, teamId: team.id, status: 'APPROVED' },
      });
      if (key === 'full') regFull = reg.id;
      else regPartial = reg.id;
    }
  });

  afterAll(async () => {
    const ps = await prisma.payment.findMany({ where: { tournamentId }, select: { id: true } });
    await prisma.paymentTransaction.deleteMany({ where: { paymentId: { in: ps.map((p) => p.id) } } });
    await prisma.payment.deleteMany({ where: { tournamentId } });
    await prisma.registration.deleteMany({ where: { tournamentId } });
    await prisma.team.deleteMany({ where: { organizationId: orgId } });
    await prisma.tournamentCategory.deleteMany({ where: { tournamentId } });
    await prisma.tournament.deleteMany({ where: { id: tournamentId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('enregistre un paiement complet → PAID + inscription payée', async () => {
    const p = await payments.recordPayment(orgId, regFull, userId, {
      amount: 50_000,
      method: 'CASH' as never,
      currency: 'XOF',
      idempotencyKey: `key-${tag}-full`,
    });
    expect(p.status).toBe('PAID');
    expect(Number(p.grossAmount)).toBe(50_000);
    expect(Number(p.organizerAmount)).toBe(50_000); // 0 % commission au MVP
    const reg = await prisma.registration.findUniqueOrThrow({ where: { id: regFull } });
    expect(reg.paymentStatus).toBe('PAID');
  });

  it('idempotence : même clé → aucun double paiement', async () => {
    const again = await payments.recordPayment(orgId, regFull, userId, {
      amount: 50_000,
      method: 'CASH' as never,
      currency: 'XOF',
      idempotencyKey: `key-${tag}-full`,
    });
    const count = await prisma.payment.count({ where: { registrationId: regFull } });
    expect(count).toBe(1);
    expect(again.idempotencyKey).toBe(`key-${tag}-full`);
  });

  it('paiement partiel → PARTIAL', async () => {
    await payments.recordPayment(orgId, regPartial, userId, {
      amount: 20_000,
      method: 'CASH' as never,
      currency: 'XOF',
      idempotencyKey: `key-${tag}-part`,
    });
    const reg = await prisma.registration.findUniqueOrThrow({ where: { id: regPartial } });
    expect(reg.paymentStatus).toBe('PARTIAL');
  });

  it('remboursement → REFUNDED + inscription repasse UNPAID', async () => {
    const p = await prisma.payment.findFirstOrThrow({ where: { registrationId: regFull } });
    const refunded = await payments.refund(orgId, p.id);
    expect(refunded.status).toBe('REFUNDED');
    const reg = await prisma.registration.findUniqueOrThrow({ where: { id: regFull } });
    expect(reg.paymentStatus).toBe('UNPAID');
  });
});
