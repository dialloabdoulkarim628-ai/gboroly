import type { PaymentMethodType } from '@gboroly/types';

export interface PaymentInitRequest {
  amount: number;
  currency: string;
  reference: string; // idempotencyKey / notre référence interne
  metadata?: Record<string, unknown>;
}

export interface PaymentInitResult {
  /** 'COMPLETED' pour le manuel/cash ; 'PENDING' + redirectUrl pour l'online. */
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  providerRef?: string;
  redirectUrl?: string;
}

export interface PaymentStatusResult {
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'REFUNDED';
  providerRef?: string;
}

/**
 * Abstraction fournisseur de paiement — le domaine ne dépend d'aucun prestataire.
 * Providers futurs (derrière cette interface, sans toucher au domaine) :
 * Wave, Orange Money, MTN Money, Moov Money, carte bancaire.
 */
export interface PaymentProvider {
  readonly method: PaymentMethodType;
  createPayment(req: PaymentInitRequest): Promise<PaymentInitResult>;
  verifyPayment(providerRef: string): Promise<PaymentStatusResult>;
  refundPayment(providerRef: string): Promise<PaymentStatusResult>;
  getPaymentStatus(providerRef: string): Promise<PaymentStatusResult>;
}

/**
 * Paiement manuel (cash / reçu) — le SEUL provider actif au MVP (décision D5/D7).
 * L'organisateur enregistre un encaissement déjà reçu → confirmé immédiatement.
 */
export class ManualPaymentProvider implements PaymentProvider {
  readonly method = 'MANUAL' as PaymentMethodType;

  createPayment(req: PaymentInitRequest): Promise<PaymentInitResult> {
    return Promise.resolve({ status: 'COMPLETED', providerRef: req.reference });
  }
  verifyPayment(providerRef: string): Promise<PaymentStatusResult> {
    return Promise.resolve({ status: 'COMPLETED', providerRef });
  }
  refundPayment(providerRef: string): Promise<PaymentStatusResult> {
    return Promise.resolve({ status: 'REFUNDED', providerRef });
  }
  getPaymentStatus(providerRef: string): Promise<PaymentStatusResult> {
    return Promise.resolve({ status: 'COMPLETED', providerRef });
  }
}
