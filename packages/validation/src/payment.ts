import { z } from 'zod';
import { PaymentMethodType } from '@gboroly/types';

export const RecordPaymentSchema = z.object({
  /** Montant reçu (brut), en plus petite unité (FCFA = entier). */
  amount: z.number().int().positive().max(1_000_000_000),
  method: z.nativeEnum(PaymentMethodType).default(PaymentMethodType.CASH),
  currency: z.string().length(3).default('XOF'),
  receiptRef: z.string().max(80).optional(),
  /** Clé d'idempotence (anti double-paiement). Générée si absente. */
  idempotencyKey: z.string().min(8).max(128).optional(),
});
export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>;
