# DEPLOYMENT — Environnements, CI/CD, infrastructure

## 1. Environnements

| Env | Usage |
|---|---|
| **development** | Local (Docker Compose). |
| **staging** | Tests & validation avant prod. |
| **production** | Réel. |

> Les données de test ne sont **jamais** mélangées à la production. Bases séparées par environnement.

## 2. Développement local (Docker Compose)

`docker/docker-compose.yml` fournit : **PostgreSQL**, **Redis**, **MinIO** (S3-compatible), (option) mailhog. Les apps (`web/api/worker`) tournent via pnpm/Turborepo.

```bash
pnpm install
docker compose -f docker/docker-compose.yml up -d   # postgres, redis, minio
pnpm --filter @gboroly/database migrate:dev
pnpm --filter @gboroly/database seed
pnpm dev            # turbo run dev (web + api + worker)
```

## 3. Infrastructure cible (décision D8 — ✅ ARRÊTÉE)

Stack confirmée (2026-08-31) : **Supabase + Vercel + conteneurs + GitHub** (l'architecture NestJS est conservée ; Supabase sert de Postgres managé + Storage).

| Composant | Choix |
|---|---|
| Web (Next.js) | **Vercel** |
| API (NestJS) | **Hébergeur conteneurs** (Railway / Render / Fly.io) — serveur persistant (WebSocket) |
| Worker (BullMQ) | Même hébergeur, **process séparé** |
| PostgreSQL | **Supabase** (Postgres managé) |
| Cache / Jobs | **Redis Upstash** |
| Object storage | **Supabase Storage** (endpoint S3-compatible) |
| CI/CD | **GitHub Actions** |

> ⚠️ **Vercel est serverless** : il héberge le **web Next.js**, mais **pas** l'API NestJS persistante (Socket.IO) ni le worker BullMQ → ceux-ci vont sur un hébergeur conteneurs. Supabase Auth **n'est pas** utilisé : l'auth reste custom NestJS (Argon2id/JWT).

### Prisma + Supabase (important)

Supabase place un **pooler PgBouncer** devant Postgres. Prisma nécessite **deux** URLs :
- `DATABASE_URL` → **poolée** (port **6543**, `?pgbouncer=true&connection_limit=1`) : utilisée par l'app à l'exécution.
- `DIRECT_URL` → **directe** (port **5432**) : utilisée par `prisma migrate`/introspection.

Le `datasource` déclare `url` + `directUrl` (voir `schema.prisma`). Migrations : `prisma migrate deploy` (CI/prod) via `DIRECT_URL`.

## 4. Variables d'environnement

```
DATABASE_URL
REDIS_URL
JWT_SECRET
JWT_REFRESH_SECRET
S3_ENDPOINT · S3_BUCKET · S3_ACCESS_KEY · S3_SECRET_KEY
EMAIL_PROVIDER · EMAIL_API_KEY
WHATSAPP_API_KEY
PAYMENT_PROVIDER_KEYS        # par provider
NEXT_PUBLIC_API_URL
```
`.env.example` (sans valeurs) commité ; secrets réels hors Git (voir [SECURITY.md](./SECURITY.md)).

## 5. Jobs asynchrones (worker)

BullMQ + Redis. Queues : `email · sms · whatsapp · notifications · exports · imports · pdf · analytics · media · payments · schedule`.
Chaque job **idempotent, retryable, observable** (backoff exponentiel, dead-letter). Outbox relay = process dédié.

## 6. CI/CD

```
Git Push → Lint → Typecheck → Unit Tests → Integration Tests → E2E → Build → Deploy Staging
                                                                              │
                                                        Validation manuelle → Deploy Production
```
- Migrations Prisma appliquées de façon contrôlée (jamais destructrices sans revue).
- La production n'est déployée **qu'après** validation staging.

## 7. Monitoring & observabilité

Erreurs applicatives, latence API, erreurs DB, échecs de queue, échecs de paiement, erreurs WebSocket, échecs d'auth. Logs structurés JSON. Alerting sur incidents critiques (paiements, auth, DB).

## 8. Sauvegarde / restauration

Backups automatiques base managée + test régulier de restauration. Rétention définie. Soft-delete + purge auditée.

---

# 🚀 Runbook de déploiement (production)

## Vue d'ensemble

| Composant | Cible | Notes |
|---|---|---|
| **Web** (Next.js) | **Vercel** | build depuis `apps/web` (monorepo) |
| **API** (NestJS) | **Conteneur** (Railway / Render / Fly.io) | `apps/api/Dockerfile` ; serveur persistant (SSE) |
| **Base** | **Supabase** (déjà en place) | migrations Prisma versionnées |
| **Worker / Redis** | *non requis au MVP* | l'outbox tourne dans l'API ; à activer si des jobs BullMQ sont ajoutés |

## 1. Migrations Prisma (versionnées)

Le projet est passé de `db push` à des **migrations versionnées** (`packages/database/prisma/migrations/`).

**Baseliner la base Supabase existante** (elle a déjà le schéma via `db push`) — une seule fois :
```bash
# avec DATABASE_URL/DIRECT_URL de prod dans l'environnement
pnpm --filter @gboroly/database exec prisma migrate resolve --applied 20260901000000_init
```
Ensuite, à chaque release, appliquer les migrations en attente :
```bash
pnpm --filter @gboroly/database exec prisma migrate deploy
```
> Pour une **base neuve** (nouveau projet Supabase, base vide), sauter le `resolve` : `migrate deploy` crée tout.

## 2. Déployer l'API (conteneur)

1. **Build/push de l'image** (contexte = racine du repo) :
   ```bash
   docker build -f apps/api/Dockerfile -t gboroly-api .
   ```
   La plupart des PaaS (Railway/Render/Fly) buildent directement depuis le repo : indiquer **Dockerfile path = `apps/api/Dockerfile`** et **contexte = racine**.
2. **Variables d'environnement** (voir checklist §5).
3. **Release command** (avant démarrage) : `pnpm --filter @gboroly/database exec prisma migrate deploy`.
4. **Port** : la plateforme fournit `PORT` ; l'API l'écoute automatiquement (`main.ts`). Healthcheck : `GET /api/v1/health`.

## 3. Déployer le Web (Vercel)

1. Importer le repo GitHub dans Vercel.
2. **Root Directory** = `apps/web` (Vercel détecte le workspace pnpm et installe depuis la racine).
3. Framework **Next.js** (auto). Build : `next build` (auto).
4. **Variables d'environnement** :
   - `NEXT_PUBLIC_API_URL` = `https://<api-domain>/api/v1` (client — pages publiques + SSE)
   - `API_BASE_URL` = `https://<api-domain>/api/v1` (server — SSR/ISR)

## 4. Câblage inter-services

- **CORS de l'API** : mettre `CORS_ORIGINS=https://<vercel-domain>` (l'API restreint les origines).
- **Realtime SSE** : `NEXT_PUBLIC_API_URL` doit pointer vers l'API (le navigateur ouvre `EventSource` dessus).

## 5. Checklist variables d'environnement (prod)

**API (conteneur)**
```
DATABASE_URL          # Supabase poolé (6543, pgbouncer=true&connection_limit=1)
DIRECT_URL            # Supabase direct (5432) — migrations
JWT_SECRET            # long, aléatoire
JWT_REFRESH_SECRET    # long, aléatoire (si utilisé)
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=2592000
CORS_ORIGINS          # https://<vercel-domain>
NODE_ENV=production
# Optionnels (features futures) : REDIS_URL, S3_*, EMAIL_*, WHATSAPP_*, PAYMENT_PROVIDER_KEYS, PLATFORM_FEE_BPS
```
**Web (Vercel)** : `NEXT_PUBLIC_API_URL`, `API_BASE_URL`.

> 🔐 Les secrets se saisissent **dans les dashboards** (Vercel / hébergeur), jamais dans le repo. `.env` reste local et gitignoré.

## 6. Vérifications post-déploiement

- `GET https://<api>/api/v1/health` → 200.
- `GET https://<api>/api/v1/public/discover` → 200 (liste JSON).
- Ouvrir `https://<vercel-domain>/discover` → tournois affichés.
- Créer un tournoi (dashboard), le publier, vérifier `/t/<slug>` + mise à jour live.

## 7. CI/CD

- **CI** (`.github/workflows/ci.yml`) : lint, typecheck, `migrate deploy` (Postgres éphémère), seed, tests, build — à chaque push/PR sur `main`.
- **Web** : Vercel auto-déploie à chaque push sur `main` (via son intégration Git).
- **API** : brancher l'auto-déploiement du PaaS sur `main`, avec le release command `migrate deploy`.
