import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@gboroly/database';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

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
