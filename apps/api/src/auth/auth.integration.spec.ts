/**
 * Tests d'intégration de l'authentification (nécessitent PostgreSQL).
 * Exécution :
 *   pnpm docker:up
 *   pnpm --filter @gboroly/database exec prisma db push
 *   RUN_DB_TESTS=1 pnpm --filter @gboroly/api test
 *
 * Sans RUN_DB_TESTS, ces tests sont ignorés (pas de DB en local par défaut).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@gboroly/database';
import { AuthService } from './auth.service';

const runDb = process.env.RUN_DB_TESTS === '1';

const config = {
  get: (key: string, def?: string) =>
    ({
      JWT_SECRET: 'itest-secret',
      JWT_ACCESS_TTL: '900',
      JWT_REFRESH_TTL: '2592000',
      NODE_ENV: 'test',
    })[key] ??
    def ??
    undefined,
};

describe.skipIf(!runDb)('AuthService (intégration DB)', () => {
  const prisma = new PrismaClient();
  const auth = new AuthService(prisma as never, config as never);
  const email = `itest_${Date.now()}@gboroly.test`;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it('register → login → refresh → logout', async () => {
    const reg = await auth.register(
      { firstName: 'Int', lastName: 'Test', email, password: 'motdepasse1' },
      {},
    );
    expect(reg.accessToken).toBeTruthy();
    expect(reg.refreshToken).toBeTruthy();
    expect('passwordHash' in reg.user).toBe(false);

    const login = await auth.login({ identifier: email, password: 'motdepasse1' }, {});
    expect(login.accessToken).toBeTruthy();

    const refreshed = await auth.refresh(login.refreshToken, {});
    expect(refreshed.refreshToken).not.toBe(login.refreshToken); // rotation

    // L'ancien refresh est révoqué → refus.
    await expect(auth.refresh(login.refreshToken, {})).rejects.toThrow();

    const out = await auth.logout(refreshed.refreshToken);
    expect(out.success).toBe(true);
  });

  it('vérification email via devCode', async () => {
    const email2 = `itest2_${Date.now()}@gboroly.test`;
    const reg = await auth.register(
      { firstName: 'V', lastName: 'E', email: email2, password: 'motdepasse1' },
      {},
    );
    const code = (reg.verification as { devCode: string; userId: string }).devCode;
    const userId = (reg.verification as { devCode: string; userId: string }).userId;
    const res = await auth.verifyEmail({ userId, code });
    expect(res.success).toBe(true);
    await prisma.user.deleteMany({ where: { email: email2 } });
  });
});
