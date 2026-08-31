import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password (argon2id)', () => {
  it('hash puis vérifie avec succès', async () => {
    const h = await hashPassword('motdepasse-solide-1');
    expect(h).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(h, 'motdepasse-solide-1')).toBe(true);
  });

  it('rejette un mauvais mot de passe', async () => {
    const h = await hashPassword('bon-mot-de-passe');
    expect(await verifyPassword(h, 'mauvais')).toBe(false);
  });

  it('deux hash du même mot de passe diffèrent (sel aléatoire)', async () => {
    const a = await hashPassword('identique');
    const b = await hashPassword('identique');
    expect(a).not.toBe(b);
  });
});
