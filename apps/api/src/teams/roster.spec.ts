import { describe, expect, it } from 'vitest';
import { canAddPlayer, meetsMinimum } from './roster';

describe('règles d’effectif', () => {
  it('autorise l’ajout sous le maximum', () => {
    expect(canAddPlayer(5, { max: 12 }).ok).toBe(true);
  });

  it('refuse l’ajout au-delà du maximum', () => {
    const r = canAddPlayer(12, { max: 12 });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('SQUAD_MAX');
  });

  it('sans maximum, toujours autorisé', () => {
    expect(canAddPlayer(100, {}).ok).toBe(true);
    expect(canAddPlayer(100, { max: null }).ok).toBe(true);
  });

  it('détecte un effectif sous le minimum', () => {
    expect(meetsMinimum(4, { min: 6 }).ok).toBe(false);
    expect(meetsMinimum(6, { min: 6 }).ok).toBe(true);
  });
});
