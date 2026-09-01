import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

// Sérialisation JSON des BigInt (montants en plus petite unité) → chaîne.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function (this: bigint) {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const prefix = process.env.API_PREFIX ?? '/api/v1';
  app.setGlobalPrefix(prefix.replace(/^\//, ''));

  app.use(helmet());
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(','),
    credentials: true,
  });
  // Validation via ZodValidationPipe appliqué par route (schémas @gboroly/validation).

  // PaaS (Railway/Render/Fly) injectent PORT ; fallback API_PORT puis 4000 en local.
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  console.log(`🟢 Gboroly API sur le port ${port} (préfixe ${prefix})`);
}

void bootstrap();
