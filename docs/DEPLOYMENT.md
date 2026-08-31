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
