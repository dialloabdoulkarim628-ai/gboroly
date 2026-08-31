# AUTH — Authentification (Phase 2)

> Implémenté dans `apps/api/src/auth`. Logique crypto/token isolée en modules **purs** (`lib/password.ts`, `lib/tokens.ts`) pour testabilité sans DB. Voir aussi [SECURITY.md](./SECURITY.md) et [RBAC.md](./RBAC.md).

## 1. Vue d'ensemble

- **Hash mot de passe** : Argon2id (`@node-rs/argon2`, binaire précompilé — pas de compilation native).
- **Access token** : JWT HS256 court (défaut 15 min), stateless, vérifié par signature.
- **Refresh token** : opaque aléatoire, **stocké haché (SHA-256)** en base (`RefreshToken`), **rotatif** et **révocable**.
- **Sécurité par défaut** : `JwtAuthGuard` global (APP_GUARD) → toutes les routes protégées sauf `@Public()`.
- **Validation** : `ZodValidationPipe` par route, schémas partagés `@gboroly/validation`.
- **Anti-énumération** : `forgot-password` répond toujours de façon générique.
- **OTP/codes** : hachés en base (`AuthToken.codeHash`), TTL + limite de tentatives, comparaison en temps constant.

## 2. Endpoints (`/api/v1/auth`)

| Méthode | Route | Public | Rôle |
|---|---|:-:|---|
| POST | `/register` | ✅ | Crée un compte (email **ou** téléphone), émet tokens + défi de vérification |
| POST | `/login` | ✅ | Identifiants → tokens |
| POST | `/refresh` | ✅ | Rotation du refresh token → nouveau couple |
| POST | `/logout` | ✅ | Révoque le refresh token fourni |
| POST | `/forgot-password` | ✅ | Crée un code de reset (réponse générique) |
| POST | `/reset-password` | ✅ | `userId + code + newPassword` ; révoque toutes les sessions |
| POST | `/verify-email` | ✅ | `userId + code` → `emailVerifiedAt` |
| POST | `/verify-phone` | ✅ | `userId + code` (OTP) → `phoneVerifiedAt` |
| GET | `/me` | 🔒 | Profil de l'utilisateur authentifié |

## 3. Cycle des tokens

```
login/register
   ├─ accessToken  (JWT sub=userId, exp=15min)          → header Authorization: Bearer …
   └─ refreshToken (opaque)  ─ sha256 ─▶ RefreshToken.tokenHash (exp=30j, revokedAt=null)

refresh(refreshToken)
   ├─ lookup sha256 → non révoqué & non expiré ?
   ├─ révoque l'ancien (rotation)
   └─ émet un nouveau couple

logout(refreshToken) → revokedAt = now
reset-password        → révoque TOUTES les sessions de l'utilisateur
```

## 4. Vérification & codes

- Register avec **email** → `AuthToken(EMAIL_VERIFY)` (TTL 24h). Avec **téléphone** → `AuthToken(PHONE_OTP)` numérique 6 chiffres (TTL 10 min).
- Reset → `AuthToken(PASSWORD_RESET)` (TTL 30 min).
- En **dev** (`NODE_ENV != production`), le code est renvoyé dans la réponse (`devCode`, `userId`) pour tester sans provider email/SMS. En prod, envoi via le système de notifications (Phase 11).
- Codes stockés **hachés**, jamais en clair. Limite `OTP_MAX_ATTEMPTS = 5`.

## 5. Guards & RBAC

- `JwtAuthGuard` (global) : exige `Bearer` sauf `@Public()`, pose `request.user = { id }`.
- `@CurrentUser()` : injecte l'utilisateur authentifié.
- `PermissionsGuard` + `@RequirePermissions(...)` : **scaffold**. L'application effective des permissions dépend du contexte d'organisation (membership → rôle → permissions) et sera **branchée en PHASE 3**. Aujourd'hui, une route sans exigence passe ; une route exigeant une permission est refusée tant que la résolution n'est pas branchée.

## 6. Format d'erreur

```json
{ "error": { "code": "INVALID_CREDENTIALS", "message": "…", "details": {} } }
```
Codes : `VALIDATION_ERROR · UNAUTHENTICATED · INVALID_TOKEN · INVALID_CREDENTIALS · USER_ALREADY_EXISTS · INVALID_REFRESH_TOKEN · INVALID_CODE · USER_NOT_FOUND · INSUFFICIENT_PERMISSION`.

## 7. Tests

- **Unitaires** (sans DB, verts en local + CI) : `lib/password.spec.ts` (Argon2id), `lib/tokens.spec.ts` (JWT, OTP, sha256, temps constant).
- **Intégration** (`auth.integration.spec.ts`, **nécessite PostgreSQL**, ignoré sans `RUN_DB_TESTS=1`) : register→login→refresh(rotation)→logout, vérification email via `devCode`.
- **Smoke test HTTP validé** : bootstrap OK, `/health` 200, `/auth/me` sans token → 401, register invalide → 400 `VALIDATION_ERROR`.

```bash
# Intégration avec une vraie base :
pnpm docker:up
pnpm --filter @gboroly/database exec prisma db push
RUN_DB_TESTS=1 pnpm --filter @gboroly/api test
```

## 8. À finaliser (dépend de Docker/DB)

- Générer la **première migration Prisma** (`prisma migrate dev`) une fois Docker installé (actuellement le schéma existe, la migration sera créée au premier lancement de la base).
- Brancher l'envoi réel des codes (email/SMS/WhatsApp) en **Phase 11**.
- Application effective du RBAC en **Phase 3** (organisations + memberships).
