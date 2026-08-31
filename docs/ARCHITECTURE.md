# ARCHITECTURE — Gboroly

## 1. Vue d'ensemble

Gboroly est un **Modular Monolith** TypeScript full-stack, multi-tenant, mobile-first, temps réel, conçu pour évoluer vers le multisport et le multi-pays.

```
                         ┌───────────────────────────┐
                         │        Clients            │
                         │  Web PWA · Mobile · Public │
                         └─────────────┬─────────────┘
                                       │ HTTPS (REST /api/v1) + WSS (Socket.IO)
                         ┌─────────────▼─────────────┐
                         │      apps/web (Next.js)    │
                         │  Marketing · Dashboard ·   │
                         │  Match Day · Pages publiques│
                         └─────────────┬─────────────┘
                                       │ REST + WebSocket
                         ┌─────────────▼─────────────┐
                         │      apps/api (NestJS)     │
                         │  Modular Monolith          │
                         │  Presentation→Application→ │
                         │  Domain→Infrastructure     │
                         └──────┬───────────┬────────┘
                                │           │ enqueue jobs
              ┌─────────────────┼───────┐   │
              ▼                 ▼       ▼   ▼
        ┌──────────┐     ┌──────────┐ ┌────────┐   ┌─────────────────┐
        │PostgreSQL│     │  Redis   │ │   S3   │   │ apps/worker     │
        │ (vérité) │     │cache/jobs│ │ files  │◀──│ BullMQ consumers│
        └──────────┘     └──────────┘ └────────┘   └───────┬─────────┘
                                                           │
                                          External: Email · SMS · WhatsApp · Payments · Push
```

**Règle fondatrice :** ne PAS commencer par des microservices. Séparation stricte des **domaines** à l'intérieur d'un seul déploiement NestJS ; extraction en services possible plus tard sans réécriture métier.

## 2. Monorepo (pnpm + Turborepo)

```
gboroly/
├── apps/
│   ├── web/        # Next.js (App Router) : UI, PWA, pages publiques SSR/ISR
│   ├── api/        # NestJS : REST + WebSocket, use cases, RBAC, persistance
│   └── worker/     # BullMQ consumers : calendrier, PDF, imports/exports, notifications
├── packages/
│   ├── competition-engine/  # ⭐ moteur PUR (aucune dépendance framework)
│   ├── types/               # types partagés (Tournament, Match, Standing, ...)
│   ├── validation/          # schémas Zod partagés (front + back)
│   ├── database/            # schéma Prisma, client, migrations, seed
│   ├── ui/                  # design system React (Button, Table, DataTable, ...)
│   ├── config/              # eslint, tsconfig, tailwind preset partagés
│   └── utils/               # helpers purs (dates, money, slug, ...)
├── docs/
├── docker/                  # Dockerfiles, docker-compose.yml (dev)
├── scripts/
├── .env.example
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

### Responsabilité des apps

| App | Responsabilités |
|---|---|
| **web** | Site marketing, auth UI, dashboard organisateur, dashboard admin, Match Day, pages publiques tournoi/équipe/joueur, marketplace (futur). |
| **api** | Auth, RBAC, logique métier (use cases), API REST, WebSocket gateway, orchestration du moteur, paiements, audit, admin. |
| **worker** | Génération de calendrier, PDF, affiches, notifications, emails, WhatsApp, stats lourdes, imports/exports, traitements différés. |

### Packages clés

- **`competition-engine`** — expose des fonctions pures : `generateFixtures`, `calculateStandings`, `applyTieBreakers`, `determineQualifiedTeams`, `generateBracket`, `advanceTeams`, `handleForfeit`, `recalculateCompetition`. **Aucune** dépendance à Prisma/NestJS/React. Testable avec du JSON. Détail : [COMPETITION-ENGINE.md](./COMPETITION-ENGINE.md).
- **`types`** — source unique des types de domaine partagés front/back.
- **`validation`** — schémas Zod partagés (une règle de validation = un seul endroit).
- **`database`** — Prisma schema + client généré + migrations + seed. Seule couche qui touche PostgreSQL.

## 3. Architecture backend en couches (NestJS)

```
Presentation   Controllers · DTO · Guards · Pipes · WebSocket Gateways · Interceptors
      │
Application    Use Cases / Commands / Queries (CreateTournament, RegisterTeam,
      │        GenerateSchedule, StartMatch, RecordMatchEvent, FinishMatch,
      │        RecalculateStandings, AdvanceQualifiedTeams, ProcessPayment)
      │
Domain         Entities · Value Objects · Domain Events · Competition rules
      │        (invariants métier ; s'appuie sur competition-engine)
      │
Infrastructure Prisma repositories · Redis · S3 · Email/SMS/WhatsApp · Payment providers
```

**Interdits :** fichier « monstre » (`tournament.service.ts` de milliers de lignes), duplication d'une règle métier, logique métier dans un controller. Chaque module = dossier `application/ · domain/ · infrastructure/ · presentation/`.

### Modules backend (NestJS)

```
auth · users · organizations · memberships · roles · tournaments · sports · categories
teams · players · registrations · competitions · rounds · groups · matches · match-events
standings · scheduling · venues · fields · referees · payments · subscriptions
notifications · communications · sponsors · media · public · analytics · complaints
audit · admin · realtime · outbox
```

Les modules **transverses** (`audit`, `outbox`, `realtime`, `media`, `notifications`) sont consommés par les modules métier via des **événements de domaine**, pas par couplage direct.

## 4. Frontend (Next.js App Router)

Trois zones fonctionnelles :

| Zone | Rendu | Notes |
|---|---|---|
| **Marketing** (`/`, `/tarifs`, `/contact`…) | SSG/ISR | SEO fort |
| **Dashboard** (`/dashboard/**`) | CSR + Server Actions/route handlers, protégé | TanStack Query, RHF+Zod, optimistic UI |
| **Public tournoi** (`/t/[slug]/**`) | **ISR + revalidation on-demand** + hydratation temps réel | SEO + Open Graph + rapide sur réseau faible |

- **State serveur** : TanStack Query (cache, retry, invalidation par événement WS).
- **Formulaires** : React Hook Form + Zod (schémas issus de `packages/validation`).
- **PWA** : manifeste + service worker (cache des ressources, install mobile). Offline complet hors MVP.
- **Design system** : `packages/ui` (voir [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md)).

## 5. Architecture temps réel

Socket.IO. Rooms par ressource publique (`tournament:{id}`, `match:{id}`). Émissions déclenchées par événements de domaine via l'outbox. Détail : [REALTIME.md](./REALTIME.md).

## 6. Architecture des jobs (worker)

BullMQ + Redis. Queues : `email · sms · whatsapp · notifications · exports · imports · pdf · analytics · media · payments · schedule`. Chaque job **idempotent, retryable, observable**. Détail : [DEPLOYMENT.md](./DEPLOYMENT.md) §Jobs.

## 7. Architecture event-driven interne + Outbox

```
Use case critique (transaction PostgreSQL)
   ├─ persiste les entités (Match, Standings, …)
   └─ écrit un OutboxEvent (même transaction)  ← garantit "au moins une fois"
                    │
        Worker relais lit l'outbox
                    ├─▶ realtime (Socket.IO)
                    ├─▶ notifications (email/WhatsApp/push)
                    └─▶ analytics
```

Événements de domaine : `TournamentCreated`, `TeamRegistered`, `RegistrationApproved`, `MatchStarted`, `MatchEventRecorded`, `MatchFinished`, `StandingsUpdated`, `TeamsQualified`, `ResultPublished`, `PaymentCompleted`.

**Bénéfice :** les side-effects réseau (WhatsApp, WS) ne sont **jamais** dans la transaction critique → pas de perte d'événement, pas de blocage.

## 8. Principes architecturaux (rappel)

1. Le moteur décide, le frontend affiche.
2. Une règle métier n'existe **qu'à un seul endroit** (dans `competition-engine` ou le domain).
3. PostgreSQL = source de vérité ; Redis = cache ; S3 = fichiers.
4. Automatiser sans retirer le contrôle (calendrier/classement modifiables manuellement).
5. Multi-tenant : `organization_id` partout où pertinent, filtré côté backend.
6. Pas de sur-ingénierie : construire la meilleure fondation, pas la plus complexe.

## 9. Trajectoire d'évolution

- **Multisport** : `Sport` + `SportRules` (stratégies) ; ne jamais coder « Maracana » en dur.
- **Extraction future** : le worker et le moteur sont déjà isolés → extraction en service possible sans toucher au domaine.
- **API publique** (Phase 14+) : `/public/**` en lecture pour partenaires/médias/écrans de stade.
