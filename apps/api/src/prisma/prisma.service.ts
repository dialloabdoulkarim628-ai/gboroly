import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@gboroly/database';

/**
 * Normalise l'URL de connexion pour Supabase.
 *
 * Le pooler Supabase en **mode transaction** (port 6543, PgBouncer) route chaque
 * requête vers un backend potentiellement différent. Prisma, par défaut, utilise
 * des *prepared statements* nommés → ils n'existent pas sur l'autre backend, d'où
 * des erreurs intermittentes « prepared statement "sXX" does not exist » (code 26000).
 *
 * Le paramètre `pgbouncer=true` demande à Prisma de désactiver les prepared statements.
 * On l'ajoute d'office sur toute URL poolée (6543) qui l'omettrait, pour rendre le
 * déploiement robuste quelle que soit la chaîne exacte saisie dans le dashboard.
 */
export function normalizeDbUrl(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  try {
    const u = new URL(raw);
    // Cible UNIQUEMENT le pooler transaction (port 6543). Le pooler session (5432)
    // conserve les prepared statements et ne doit pas recevoir connection_limit=1.
    const isTransactionPooler = u.port === '6543';
    if (isTransactionPooler && u.searchParams.get('pgbouncer') !== 'true') {
      u.searchParams.set('pgbouncer', 'true');
      if (!u.searchParams.has('connection_limit')) u.searchParams.set('connection_limit', '1');
      return u.toString();
    }
    return raw;
  } catch {
    return raw; // URL non parsable → on laisse Prisma gérer/signaler.
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const url = normalizeDbUrl(process.env.DATABASE_URL);
    // On ne passe `datasources` que si on a effectivement une URL (sinon Prisma lit l'env/schema).
    super(url ? { datasources: { db: { url } } } : {});
    if (url && url !== process.env.DATABASE_URL) {
      this.logger.log('DATABASE_URL normalisée (pgbouncer=true ajouté pour le pooler Supabase).');
    }
  }

  async onModuleInit(): Promise<void> {
    // Connexion tolérante : Prisma se connecte aussi en lazy à la 1re requête.
    // L'API démarre même si la base n'est pas encore disponible (les routes DB échoueront alors).
    try {
      await this.$connect();
    } catch (e) {
      this.logger.warn(`Base de données non disponible au démarrage: ${(e as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
