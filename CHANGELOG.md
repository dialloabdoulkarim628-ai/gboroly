# Changelog — Gboroly

## [Phase 9] — Pages publiques — en cours

### Ajouté — Backend (module `public`, lecture seule, non authentifié)
- `GET /public/tournaments/:slug` (+ `/standings`, `/matches`, `/teams`, `/bracket`) — **filtrés `visibility=PUBLIC` et statut PUBLISHED/ONGOING/COMPLETED/ARCHIVED** ; DTOs sûrs (aucune donnée privée : paiements, notes). Bracket construit via `buildBracketView` du moteur.
- Test d'intégration gated : vérifie qu'un tournoi DRAFT/PRIVATE est **masqué** (404).

### Ajouté — Frontend (Next.js App Router, `/t/[slug]`)
- Layout public : header (logo/nom/lieu/date/statut) + onglets (Accueil/Matchs/Classement/Équipes/Bracket), **SEO + Open Graph + Twitter card** via `generateMetadata`, `canonical`.
- Pages : **Accueil** (stats + prochains matchs + derniers résultats), **Matchs** (groupés par jour), **Classement** (tables par groupe), **Équipes** (grille), **Bracket** (colonnes par tour), page **404** dédiée.
- Mobile-first, design tokens de la charte (navy/brand/energy…), **ISR** (revalidate 60 s), rendu dynamique, bundles légers (~103–106 kB) pour réseaux faibles.
- Client API public `apps/web/src/lib/api.ts` (fetch résilient : API indisponible → état vide / notFound).

### Vérifié
- typecheck 14/14, lint OK, build 8/8 (5 routes `/t/[slug]/*` compilées, dynamiques), **70 tests** + 20 d'intégration DB gated.

## [Phase 8] — Calendrier

### Ajouté
- **`ScheduleGenerator` (module pur, 6 tests)** : place les appariements sur des créneaux jour×terrain×heure, best-effort. Contraintes respectées : repos minimal par équipe, pas de match simultané pour une équipe, un match par créneau et par terrain. Renvoie les affectations + les matchs non planifiables (`NO_FIELD` / `NO_FEASIBLE_SLOT`).
- **Venues / Fields** : CRUD (`POST /tournaments/:id/venues`, `POST /venues/:id/fields`, `GET …/venues|fields`, `PATCH/DELETE /fields/:id`) — RBAC `venue.manage`. Suppression bloquée si le terrain est utilisé.
- **Génération de calendrier** : `POST /competitions/:id/schedule` (RBAC `schedule.generate`) — lit les matchs planifiables (SCHEDULED, deux équipes connues) + terrains, applique le plan (scheduledAt/fieldId/venueId) sauf `dryRun`. Édition manuelle déjà couverte par `PATCH /matches/:id/schedule`.
- **Checklist de publication** : critères `format`, `terrains`, `calendrier` désormais **bloquants** ; le critère « calendrier » compte les matchs avec `scheduledAt`.

### Vérifié
- typecheck 14/14, lint OK, build 8/8, **70 tests** (dont 6 scheduler) + 18 d'intégration DB gated.

## [Phase 7] — Matchs & Match Day

### Ajouté (branchement moteur ↔ DB)
- **Module `competitions`** : `POST /categories/:id/competition` génère la structure (ROUND_ROBIN / GROUP_STAGE / SINGLE_ELIMINATION / DOUBLE_ELIMINATION / GROUP_TO_PLAYOFFS) depuis les inscriptions validées → persiste rounds/groups/groupTeams/matches (chaînage `feedsInto`/`loserFeedsInto` remappé en ids DB). Régénération sûre tant qu'aucun match n'a démarré. `POST /competitions/:id/playoffs` (phases finales des qualifiés). `GET …/standings`, `GET …/matches`.
- **Module `matches`** : cycle de vie complet — `schedule`, `start` (→ tournoi ONGOING), `events` (but ⇒ score), `score`, **`finish`**, `forfeit`, `postpone`, `cancel`.
- **⭐ Chaîne transactionnelle `finish`** : match FINISHED → recompute classement (delete+createMany idempotent) → `advanceKnockout`/`advanceDoubleElimination` (résout les slots aval) → `OutboxEvent(MatchFinished)`, le tout dans une transaction PostgreSQL. **Verrou optimiste** (`version`) contre la concurrence.
- Mapper pur DB↔moteur (`toEngineMatch`, `winnerFromScore`) unit-testé (5 tests).
- Schéma `Match` : ajout `loserFeedsIntoMatchId/Slot` + `order`.
- RBAC réutilisé (`competition.configure`, `match.operate`, `match.reschedule`, `match.cancel`, `standing.view`).

### Vérifié
- typecheck 14/14, lint OK, build 8/8, **62 tests** (dont 5 unitaires mapper) + **18 d'intégration DB gated** (nouveau : Golden Path génération→matchs→classement→phases finales→champion).

## [Phase 6] — ⭐ Competition Engine

### Ajouté (package pur `competition-engine`, 26 tests)
- **Groupes** : distribution "serpent", fixtures de poules, classement par groupe.
- **Single elimination** : seeding standard, byes automatiques, `advanceKnockout`, `resolveWinner` (score → tirs au but).
- **Qualifications** configurables : N par groupe + meilleurs Nes (repêchage cross-groupe).
- **Group → Playoffs** : orchestration poules → qualifiés → phases finales (testée de bout en bout jusqu'au champion).
- **Double élimination** (4/8) : winner/loser brackets + grande finale, `advanceDoubleElimination` (déroulé complet testé).
- **Forfait** : score administratif + impact classement. **Bracket view** pour affichage.
- Types moteur enrichis (`PlannedGroup/Round`, `CompetitionPlan`, `QualificationConfig`, `BracketNode`, refs de slots + chaînage).

### Vérifié
- typecheck 14/14, lint OK, build 8/8, **57 tests** (moteur 26) + 13 d'intégration DB gated.
- Idempotence des fonctions d'avancement (bracket recalculable sans divergence).

## [Phase 5] — Équipes, Joueurs, Inscriptions

### Ajouté
- Module `teams` : référentiel org (create/list/get/update/status/soft-delete) + **roster** `TeamPlayer` (ajout/liste/màj/retrait).
  - Règle de cohérence : **un joueur ne peut être ACTIF que dans une équipe par tournoi** (`PLAYER_ALREADY_REGISTERED`).
  - Bornes d'effectif : `canAddPlayer`/`meetsMinimum` (module pur testé) → `SQUAD_MAX` au-delà du max de catégorie.
- Module `players` : référentiel org (CRUD + soft-delete).
- Module `registrations` : inscription équipe↔catégorie, unicité `(categoryId, teamId)` (`TEAM_ALREADY_REGISTERED`), `approve`/`reject`/`withdraw` ; statut d'inscription et de paiement séparés.
- Checklist de publication : critère **« équipes validées (min 2) » activé (bloquant)**.
- RBAC : `team.manage`, `player.manage`, `registration.review`. Schémas Zod team/player/registration.

### Vérifié
- typecheck 14/14, lint OK, build 8/8, tests 36 (dont roster) + 13 d'intégration DB gated.
- Smoke test HTTP : 20 routes (équipes/joueurs/inscriptions) mappées, 401 sans token.

## [Phase 4] — Tournois

### Ajouté
- Module `tournaments` : create (DRAFT), list/get **scopés multi-tenant** (org via `X-Organization-Id`), update, visibilité, cancel, soft-delete.
- **Publication avec checklist** (module pur `checklist.ts` testé) : critères `info` + `categories` bloquants dès la Phase 4, critères équipes/format/terrains/calendrier prêts (activés aux phases suivantes). `CHECKLIST_INCOMPLETE` si non rempli.
- **Catégories** : create/list/update/delete (RBAC `category.manage`).
- **Duplication** : réutilise config + catégories + branding, statut → DRAFT, **ne copie jamais** résultats/matchs/paiements.
- Machine à états + verrou de modification (`MODIFICATION_LOCKED` sur statuts ONGOING/COMPLETED/ARCHIVED/CANCELLED).
- Sérialisation JSON des `BigInt` (montants) ; schémas Zod tournoi/catégorie/visibilité.

### Vérifié
- typecheck 14/14, lint OK, build 8/8, tests 31 (dont 4 checklist) + 10 d'intégration DB gated.
- Smoke test HTTP : 14 routes tournois/catégories mappées, 401 sans token.

## [Phase 3] — Organisations & RBAC

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
