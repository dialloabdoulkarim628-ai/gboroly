# Changelog — Gboroly

## [Phase 3] — Organisations & RBAC — en cours

### Ajouté
- Matrice RBAC canonique dans `@gboroly/types` (`PERMISSIONS`, `ROLE_PERMISSIONS`, `permissionsForRole`) — source unique de vérité.
- Seed enrichi : attache les permissions aux 9 rôles système (`RolePermission`).
- Module `organizations` : création (créateur = OWNER), lecture/màj, membres (rôle, retrait), invitations (créer/lister/révoquer/accepter). Garde-fou dernier propriétaire.
- `RbacService` (résolution membership → permissions) + `RbacModule` global.
- `PermissionsGuard` **effectif** : org active via `:orgId` ou `X-Organization-Id`, vérification des permissions, `request.membership`.
- Décorateurs `@RequireMembership`, `@ActiveMembership` ; schémas Zod org/invitation.

### Vérifié
- typecheck 14/14, lint OK, build 8/8, tests 27 (dont 4 RBAC) + 5 d'intégration DB gated.
- Smoke test HTTP : 10 routes org mappées, 401 sans/mauvais token.

## [Phase 2] — Authentification

### Ajouté
- Module `auth` (NestJS) : register, login, logout, refresh (rotation), forgot/reset password, verify-email, verify-phone (OTP).
- Hash **Argon2id** (`@node-rs/argon2`) ; access token **JWT** court + **refresh rotatif révocable** (haché en base).
- `JwtAuthGuard` global (sécurité par défaut) + `@Public`, `@CurrentUser` ; scaffold `PermissionsGuard` + `@RequirePermissions` (RBAC effectif en Phase 3).
- `ZodValidationPipe` + schémas d'auth étendus (`@gboroly/validation`).
- Modules purs testables `auth/lib/{password,tokens}` + tests unitaires (10) ; test d'intégration DB gated (`RUN_DB_TESTS`).
- `PrismaService` tolérant à l'absence de DB au démarrage (connexion lazy).
- Doc [AUTH.md](docs/AUTH.md).

### Vérifié
- typecheck 14/14, lint OK, build 8/8, tests 23 (10 auth + 5 utils + 5 moteur + 3 validation).
- Smoke test HTTP : `/health` 200 · `/auth/me` sans token 401 · register invalide 400.

## [Phase 1] — Fondations

### Ajouté
- Monorepo pnpm + Turborepo (`apps/*`, `packages/*`).
- `apps/api` (NestJS) : bootstrap, config, Helmet/CORS/ValidationPipe, module Prisma, health check.
- `apps/web` (Next.js App Router) : Tailwind + charte Gboroly, landing marketing, PWA manifest.
- `apps/worker` (BullMQ) : squelette des 12 queues.
- `packages/competition-engine` : round-robin, standings, tie-breakers (purs + testés).
- `packages/database` : schéma Prisma complet (identité/RBAC, tournois, compétition, matchs, paiements, communication, système) + client + seed Phase 1.
- `packages/types`, `packages/validation` (Zod), `packages/ui` (Button/Card/StatCard/Badge), `packages/config`, `packages/utils` (money/slug).
- Infra dev : `docker-compose` (Postgres/Redis/MinIO), CI GitHub Actions, `.env.example`.

## [Phase 0] — Analyse & Architecture — 2026-08-31
- Documentation de référence complète (`docs/`) : architecture, DB, domain model, competition engine, scheduling, API, RBAC, realtime, payments, notifications, security, testing, deployment, business rules, design system, roadmap.
- Analyse des incohérences et décisions D1–D10 validées (GO défauts).
