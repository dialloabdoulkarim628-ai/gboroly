import { describe, expect, it } from 'vitest';
import { addMoney, money, percentOf, subMoney, formatMoney } from './money.js';

describe('money', () => {
  it('additionne en même devise', () => {
    expect(addMoney(money(50000), money(2500)).amount).toBe(52500n);
  });

  it('refuse les devises différentes', () => {
    expect(() => addMoney(money(1, 'XOF'), money(1, 'EUR'))).toThrow();
  });

  it('calcule une commission de 5% (500 bps)', () => {
    // 50 000 FCFA * 5% = 2 500 FCFA
    expect(percentOf(money(50000), 500).amount).toBe(2500n);
  });

  it('soustrait la commission du montant brut', () => {
    const gross = money(50000);
    const fee = percentOf(gross, 500);
    expect(subMoney(gross, fee).amount).toBe(47500n);
  });

  it('formate en FCFA', () => {
    expect(formatMoney(money(50000))).toContain('FCFA');
  });
});
