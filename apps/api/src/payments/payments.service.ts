import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PaymentStatus, Prisma } from '@gboroly/database';
import type { RecordPaymentInput } from '@gboroly/validation';
import { PrismaService } from '../prisma/prisma.service';
import { computeFees, rollUpPaymentStatus, type FeeConfig } from './fees';
import { ManualPaymentProvider } from './payment-provider';

@Injectable()
export class PaymentsService {
  private readonly manual = new ManualPaymentProvider();

  constructor(private readonly prisma: PrismaService) {}

  private feeConfig(): FeeConfig {
    // MVP : gratuit organisateur (D7). Configurable via env pour activer la commission.
    return {
      platformFeeBps: Number(process.env.PLATFORM_FEE_BPS ?? 0),
      processingFeeFlat: 0, // manuel/cash : pas de frais prestataire
    };
  }

  /** Enregistre un encaissement (manuel/cash). Idempotent via idempotencyKey. */
  async recordPayment(
    orgId: string,
    registrationId: string,
    userId: string,
    input: RecordPaymentInput,
  ) {
    const registration = await this.prisma.registration.findFirst({
      where: { id: registrationId, tournament: { organizationId: orgId, deletedAt: null } },
      include: {
        category: { select: { registrationFee: true } },
        tournament: { select: { id: true } },
      },
    });
    if (!registration) throw new NotFoundException(err('REGISTRATION_NOT_FOUND', 'Inscription introuvable'));

    const idempotencyKey = input.idempotencyKey ?? randomUUID();

    // Idempotence : même clé → renvoie le paiement existant.
    const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
    if (existing) return existing;

    const fees = computeFees(input.amount, this.feeConfig());
    const init = await this.manual.createPayment({
      amount: input.amount,
      currency: input.currency,
      reference: idempotencyKey,
    });

    try {
      return await this.prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            organizationId: orgId,
            tournamentId: registration.tournamentId,
            registrationId,
            teamId: registration.teamId,
            grossAmount: BigInt(fees.grossAmount),
            platformFee: BigInt(fees.platformFee),
            paymentProcessingFee: BigInt(fees.paymentProcessingFee),
            organizerAmount: BigInt(fees.organizerAmount),
            platformAmount: BigInt(fees.platformAmount),
            currency: input.currency,
            status: init.status === 'COMPLETED' ? PaymentStatus.PAID : PaymentStatus.UNPAID,
            method: input.method,
            provider: null,
            receiptRef: input.receiptRef,
            idempotencyKey,
            paidAt: new Date(),
            createdByUserId: userId,
          },
        });
        await tx.paymentTransaction.create({
          data: {
            paymentId: payment.id,
            type: 'CAPTURED',
            amount: BigInt(fees.grossAmount),
            providerPayload: { manual: true, receiptRef: input.receiptRef ?? null } as Prisma.InputJsonValue,
          },
        });
        await this.recomputeRegistrationStatus(tx, registrationId, registration.category?.registrationFee);
        return payment;
      });
    } catch (e) {
      // Course sur la même clé d'idempotence → renvoyer l'existant.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const again = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
        if (again) return again;
      }
      throw e;
    }
  }

  async refund(orgId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, organizationId: orgId },
    });
    if (!payment) throw new NotFoundException(err('PAYMENT_NOT_FOUND', 'Paiement introuvable'));
    if (payment.status === PaymentStatus.REFUNDED) {
      throw new ConflictException(err('ALREADY_REFUNDED', 'Paiement déjà remboursé'));
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.REFUNDED },
      });
      await tx.paymentTransaction.create({
        data: {
          paymentId,
          type: 'REFUNDED',
          amount: payment.grossAmount,
          providerPayload: { manual: true } as Prisma.InputJsonValue,
        },
      });
      if (payment.registrationId) {
        const reg = await tx.registration.findUnique({
          where: { id: payment.registrationId },
          include: { category: { select: { registrationFee: true } } },
        });
        await this.recomputeRegistrationStatus(tx, payment.registrationId, reg?.category?.registrationFee);
      }
      return updated;
    });
  }

  listByTournament(orgId: string, tournamentId: string) {
    return this.prisma.payment.findMany({
      where: { organizationId: orgId, tournamentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  listByRegistration(orgId: string, registrationId: string) {
    return this.prisma.payment.findMany({
      where: { organizationId: orgId, registrationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Synthèse financière d'un tournoi (dashboard). */
  async summary(orgId: string, tournamentId: string) {
    const agg = await this.prisma.payment.aggregate({
      where: { organizationId: orgId, tournamentId, status: PaymentStatus.PAID },
      _sum: { grossAmount: true, organizerAmount: true, platformAmount: true },
      _count: true,
    });
    return {
      count: agg._count,
      gross: Number(agg._sum.grossAmount ?? 0n),
      organizerRevenue: Number(agg._sum.organizerAmount ?? 0n),
      platformCommission: Number(agg._sum.platformAmount ?? 0n),
    };
  }

  // ─────────────────────────── Helpers ───────────────────────────

  private async recomputeRegistrationStatus(
    tx: Prisma.TransactionClient,
    registrationId: string,
    categoryFee?: bigint | null,
  ) {
    const paid = await tx.payment.aggregate({
      where: { registrationId, status: PaymentStatus.PAID },
      _sum: { grossAmount: true },
    });
    const reg = await tx.registration.findUniqueOrThrow({
      where: { id: registrationId },
      include: { tournament: { select: { registrationFee: true } } },
    });
    const amountDue = Number(categoryFee ?? reg.tournament.registrationFee ?? 0n);
    const totalPaid = Number(paid._sum.grossAmount ?? 0n);
    await tx.registration.update({
      where: { id: registrationId },
      data: { paymentStatus: rollUpPaymentStatus(totalPaid, amountDue) },
    });
  }
}

function err(code: string, message: string) {
  return { error: { code, message } };
}
