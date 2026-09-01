# syntax=docker/dockerfile:1
# Image de production de l'API Gboroly (NestJS).
# ⚠️ Construire depuis la RACINE du monorepo (contexte = repo root) :
#   docker build -f apps/api/Dockerfile -t gboroly-api .

# ---------- Builder ----------
FROM node:22-slim AS builder
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile \
 && pnpm --filter @gboroly/database exec prisma generate \
 && pnpm exec turbo run build --filter=@gboroly/api

# ---------- Runner ----------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Prisma (query engine) nécessite OpenSSL au runtime.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app ./
EXPOSE 4000
# Le port est fourni par la plateforme (PORT) ; l'API écoute dessus (voir main.ts).
CMD ["node", "apps/api/dist/main.js"]
