# Changelog — Gboroly

## [Phase 2] — Authentification — en cours

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
