/**
 * Calcul de commission — module PUR (testable). Montants en plus petite unité (FCFA entier).
 * Voir docs/PAYMENTS.md §Commission et cahier §57.
 */
export interface FeeConfig {
  /** Commission Gboroly en points de base (500 = 5 %). MVP : 0 (gratuit organisateur, D7). */
  platformFeeBps: number;
  /** Frais du prestataire de paiement (fixe). 0 pour le paiement manuel/cash. */
  processingFeeFlat: number;
}

export interface FeeBreakdown {
  grossAmount: number;
  platformFee: number;
  paymentProcessingFee: number;
  organizerAmount: number;
  platformAmount: number;
}

export function computeFees(grossAmount: number, config: FeeConfig): FeeBreakdown {
  if (grossAmount < 0) throw new Error('grossAmount négatif');
  const platformFee = Math.round((grossAmount * config.platformFeeBps) / 10_000);
  const paymentProcessingFee = Math.max(0, Math.round(config.processingFeeFlat));
  const organizerAmount = Math.max(0, grossAmount - platformFee - paymentProcessingFee);
  return {
    grossAmount,
    platformFee,
    paymentProcessingFee,
    organizerAmount,
    platformAmount: platformFee,
  };
}

/** Roule le statut de paiement d'une inscription selon le total encaissé vs le montant dû. */
export function rollUpPaymentStatus(
  totalPaid: number,
  amountDue: number,
): 'UNPAID' | 'PARTIAL' | 'PAID' {
  if (totalPaid <= 0) return 'UNPAID';
  if (amountDue > 0 && totalPaid < amountDue) return 'PARTIAL';
  return 'PAID';
}
