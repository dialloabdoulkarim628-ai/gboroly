import { Controller, NotFoundException, Param, Sse, type MessageEvent } from '@nestjs/common';
import { from, switchMap, throwError, type Observable } from 'rxjs';
import { Public } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from './realtime.service';

const PUBLIC_STATUSES = ['PUBLISHED', 'ONGOING', 'COMPLETED', 'ARCHIVED'];

/** Flux temps réel public (SSE). Score/classement en direct sans rechargement. */
@Public()
@Controller('public/tournaments')
export class RealtimeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  @Sse(':slug/live')
  live(@Param('slug') slug: string): Observable<MessageEvent> {
    return from(this.resolveTournamentId(slug)).pipe(
      switchMap((id) =>
        id
          ? this.realtime.streamFor(id)
          : throwError(
              () =>
                new NotFoundException({
                  error: { code: 'TOURNAMENT_NOT_FOUND', message: 'Tournoi introuvable' },
                }),
            ),
      ),
    );
  }

  private resolveTournamentId(slug: string): Promise<string | null> {
    return this.prisma.tournament
      .findFirst({
        where: { slug, visibility: 'PUBLIC', status: { in: PUBLIC_STATUSES as never }, deletedAt: null },
        select: { id: true },
      })
      .then((t) => t?.id ?? null);
  }
}
