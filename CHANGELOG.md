# Changelog — Gboroly

## [Phase 1] — Fondations — en cours

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
