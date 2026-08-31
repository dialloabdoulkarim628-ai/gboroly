/**
 * Money — arithmétique sûre en entiers (plus petite unité). Jamais de float.
 * Devise par défaut XOF (FCFA). Voir docs/PAYMENTS.md.
 */
export interface Money {
  /** Montant en plus petite unité entière (ex. FCFA n'a pas de sous-unité usuelle → unité = 1 FCFA). */
  readonly amount: bigint;
  readonly currency: string;
}

export function money(amount: bigint | number, currency = 'XOF'): Money {
  return { amount: BigInt(amount), currency };
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amount: a.amount + b.amount, currency: a.currency };
}

export function subMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amount: a.amount - b.amount, currency: a.currency };
}

/** Applique un pourcentage entier en points de base (bps). 500 bps = 5%. Arrondi vers le bas. */
export function percentOf(base: Money, bps: number): Money {
  return { amount: (base.amount * BigInt(Math.round(bps))) / 10000n, currency: base.currency };
}

export function formatMoney(m: Money, locale = 'fr-FR'): string {
  const value = Number(m.amount);
  return `${new Intl.NumberFormat(locale).format(value)} ${m.currency === 'XOF' ? 'FCFA' : m.currency}`;
}
