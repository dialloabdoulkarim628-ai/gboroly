# Gboroly — The African Sports Tournament OS

Plateforme SaaS de digitalisation et d'automatisation des tournois sportifs.
Sport initial : **Maracana** · Marché : **Côte d'Ivoire** · Vision : plateforme africaine multisports.

> **ORGANISEZ • GÉREZ • FAITES VIVRE** — Vos tournois, simplement.

## Monorepo

```
apps/
  web/     Next.js (App Router, PWA) — marketing, dashboard, Match Day, pages publiques
  api/     NestJS — REST /api/v1, WebSocket, use cases, RBAC, persistance
  worker/  BullMQ — calendrier, PDF, imports/exports, notifications, outbox relay
packages/
  competition-engine/  ⭐ moteur PUR (aucune dépendance framework)
  database/            Prisma (schéma, client, migrations, seed)
  types/ validation/   types + schémas Zod partagés
  ui/                  design system React (charte Gboroly)
  config/ utils/       tsconfig/eslint/tailwind + helpers purs
docs/                  documentation de référence (Phase 0)
```

## Démarrage (développement)

Prérequis : **Node ≥ 20**, **pnpm**, **Docker** (pour Postgres/Redis/MinIO).

```bash
pnpm install
cp .env.example .env.local              # renseigner si besoin
pnpm docker:up                          # postgres + redis + minio
pnpm db:generate                        # client Prisma
pnpm db:migrate                         # migrations
pnpm db:seed                            # sport, permissions, rôles
pnpm dev                                # web (3000) + api (4000) + worker
```

Vérification API : http://localhost:4000/api/v1/health

## Scripts

```bash
pnpm lint         # ESLint (tous les packages)
pnpm typecheck    # TypeScript
pnpm test         # tests unitaires (dont competition-engine)
pnpm build        # build de tout le monorepo
```

## Documentation

Voir [`docs/`](./docs/README.md) — architecture, base de données, competition engine, API, RBAC, sécurité, roadmap, etc.

## État

**Phase 1 — Fondations** (monorepo, apps, packages, Prisma, Docker, CI, design system). Voir [docs/ROADMAP.md](./docs/ROADMAP.md).
