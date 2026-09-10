/**
 * Tests d'intégration de l'authentification (nécessitent PostgreSQL).
 * Exécution :
 *   pnpm docker:up
 *   pnpm --filter @gboroly/database exec prisma db push
 *   RUN_DB_TESTS=1 pnpm --filter @gboroly/api test
 *
 * Sans RUN_DB_TESTS, ces tests sont ignorés (pas de DB en local par défaut).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@gboroly/database';
import { AuthService } from './auth.service';

const runDb = process.env.RUN_DB_TESTS === '1';

// Mock du vérificateur Google : on injecte le payload d'ID token à volonté,
// sans jamais appeler le vrai réseau Google.
const googleMock = vi.hoisted(() => ({ payload: null as Record<string, unknown> | null }));
vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    verifyIdToken() {
      return Promise.resolve({ getPayload: () => googleMock.payload });
    }
  },
}));

const config = {
  get: (key: string, def?: string) =>
    ({
      JWT_SECRET: 'itest-secret',
      JWT_ACCESS_TTL: '900',
      JWT_REFRESH_TTL: '2592000',
      GOOGLE_CLIENT_ID: 'itest-google-client-id',
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
    // Supprimer les enfants avant les users (pas d'ON DELETE CASCADE — soft-delete en prod).
    const users = await prisma.user.findMany({
      where: { email: { startsWith: 'itest' } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.authToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
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
    // Nettoyage centralisé dans afterAll (supprime les enfants avant les users).
  });

  it('Google : 1er login crée le compte (isNew), le 2e réutilise le lien', async () => {
    const gEmail = `itest_google_${Date.now()}@gboroly.test`;
    const sub = `sub_${Date.now()}`;
    googleMock.payload = {
      sub,
      email: gEmail,
      email_verified: true,
      given_name: 'Awa',
      family_name: 'Koné',
      picture: 'https://example.test/a.png',
    };

    const first = await auth.oauthGoogle('fake-id-token', {});
    expect(first.isNew).toBe(true);
    expect(first.accessToken).toBeTruthy();
    expect((first.user as { email: string }).email).toBe(gEmail);
    expect('passwordHash' in first.user).toBe(false); // sanitizé

    const created = await prisma.user.findUnique({
      where: { email: gEmail },
      include: { oauthAccounts: true },
    });
    expect(created?.passwordHash).toBeNull(); // compte sans mot de passe
    expect(created?.emailVerifiedAt).not.toBeNull(); // email Google vérifié
    expect(created?.oauthAccounts).toHaveLength(1);
    expect(created?.oauthAccounts[0]?.providerAccountId).toBe(sub);

    // 2e passage : même sub → réutilise le compte, ne recrée rien.
    const second = await auth.oauthGoogle('fake-id-token', {});
    expect(second.isNew).toBe(false);
    expect((second.user as { id: string }).id).toBe((first.user as { id: string }).id);

    const links = await prisma.oAuthAccount.count({ where: { providerAccountId: sub } });
    expect(links).toBe(1);
  });

  it('Google : rattache le compte à un utilisateur email existant', async () => {
    const email3 = `itest_link_${Date.now()}@gboroly.test`;
    await auth.register({ firstName: 'Lien', lastName: 'Test', email: email3, password: 'motdepasse1' }, {});

    googleMock.payload = {
      sub: `sub_link_${Date.now()}`,
      email: email3,
      email_verified: true,
      given_name: 'Lien',
      family_name: 'Test',
    };
    const res = await auth.oauthGoogle('fake-id-token', {});
    expect(res.isNew).toBe(false); // pas un nouveau compte : rattachement
    expect((res.user as { email: string }).email).toBe(email3);

    const user = await prisma.user.findUnique({
      where: { email: email3 },
      include: { oauthAccounts: true },
    });
    expect(user?.passwordHash).not.toBeNull(); // conserve son mot de passe
    expect(user?.oauthAccounts).toHaveLength(1); // + lien Google
  });
});
