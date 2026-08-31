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

## 3. Infrastructure cible (décision D8 — à confirmer)

Piste par défaut (conteneurs, cloud moderne) :

| Composant | Option par défaut |
|---|---|
| Web (Next.js) | Vercel (ou conteneur) |
| API (NestJS) | PaaS conteneurs (Railway / Render / Fly.io) |
| Worker (BullMQ) | Même PaaS, process séparé |
| PostgreSQL | Managé (Neon / Supabase / RDS) |
| Redis | Managé (Upstash / autre) |
| S3 | Cloudflare R2 / AWS S3 |

À arbitrer selon budget et disponibilité en Afrique de l'Ouest (latence). **Question ouverte D8.**

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
