import { describe, expect, it } from 'vitest';
import { computeFees, rollUpPaymentStatus } from './fees';

describe('computeFees', () => {
  it('exemple du cahier : 50 000 FCFA, 5 % + 1000 provider', () => {
    const b = computeFees(50_000, { platformFeeBps: 500, processingFeeFlat: 1000 });
    expect(b.platformFee).toBe(2500);
    expect(b.paymentProcessingFee).toBe(1000);
    expect(b.organizerAmount).toBe(46_500);
    expect(b.platformAmount).toBe(2500);
  });

  it('MVP gratuit organisateur (0 %, 0 provider) → tout à l’organisateur', () => {
    const b = computeFees(50_000, { platformFeeBps: 0, processingFeeFlat: 0 });
    expect(b.platformFee).toBe(0);
    expect(b.organizerAmount).toBe(50_000);
  });

  it('arrondit la commission', () => {
    const b = computeFees(33_333, { platformFeeBps: 500, processingFeeFlat: 0 });
    expect(b.platformFee).toBe(1667); // round(1666.65)
    expect(b.organizerAmount).toBe(31_666);
  });

  it('refuse un montant négatif', () => {
    expect(() => computeFees(-1, { platformFeeBps: 0, processingFeeFlat: 0 })).toThrow();
  });
});

describe('rollUpPaymentStatus', () => {
  it('UNPAID / PARTIAL / PAID', () => {
    expect(rollUpPaymentStatus(0, 50_000)).toBe('UNPAID');
    expect(rollUpPaymentStatus(20_000, 50_000)).toBe('PARTIAL');
    expect(rollUpPaymentStatus(50_000, 50_000)).toBe('PAID');
    expect(rollUpPaymentStatus(60_000, 50_000)).toBe('PAID');
  });

  it('sans montant dû, tout paiement > 0 = PAID', () => {
    expect(rollUpPaymentStatus(10_000, 0)).toBe('PAID');
  });
});
