import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Filtre global : journalise toute exception non gérée (avec stack) et renvoie
 * une réponse JSON cohérente. Les HttpException conservent leur statut/corps.
 * Pour les erreurs inconnues (500), le détail n'est jamais exposé publiquement —
 * sauf présence d'un header de diagnostic secret (débogage temporaire prod).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status >= 500) this.logger.error(`${req.method} ${req.url}`, exception.stack);
      res.status(status).json(exception.getResponse());
      return;
    }

    // Erreur non gérée → 500. On loggue toujours la stack complète côté serveur.
    const err = exception as Error;
    this.logger.error(
      `Unhandled ${err?.name ?? 'Error'} on ${req.method} ${req.url}: ${err?.message}`,
      err?.stack,
    );

    const expose = req.headers['x-debug-key'] === 'gboroly-diag';
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: 500,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        ...(expose ? { name: err?.name, detail: err?.message } : {}),
      },
    });
  }
}
