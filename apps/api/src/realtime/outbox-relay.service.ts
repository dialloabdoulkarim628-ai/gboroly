import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from './realtime.service';

/** Un événement d'outbox → un ou plusieurs événements temps réel. */
const EVENT_MAP: Record<string, string[]> = {
  MatchStarted: ['match.started'],
  MatchScoreUpdated: ['match.score.updated'],
  MatchFinished: ['match.finished', 'standings.updated'],
  ResultPublished: ['tournament.updated'],
  AnnouncementCreated: ['announcement.created'],
};

const POLL_MS = 2000;
const MAX_ATTEMPTS = 5;

/**
 * Relais Outbox → temps réel (SSE). Découplé de la transaction métier (finish-chain) :
 * les effets réseau ne bloquent jamais la transaction critique et ne sont jamais perdus.
 * Voir docs/ARCHITECTURE.md §7 (Outbox).
 */
@Injectable()
export class OutboxRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  onModuleInit(): void {
    if (process.env.OUTBOX_RELAY_DISABLED === '1') return;
    this.timer = setInterval(() => void this.drain(), POLL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Traite un lot d'événements en attente. Idempotent et résilient. */
  async drain(): Promise<void> {
    if (this.running) return; // pas de recouvrement
    this.running = true;
    try {
      const pending = await this.prisma.outboxEvent.findMany({
        where: { status: 'PENDING', availableAt: { lte: new Date() } },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });
      for (const evt of pending) {
        try {
          const targets = EVENT_MAP[evt.eventType] ?? [];
          const payload = evt.payload as { tournamentId?: string } | null;
          if (payload?.tournamentId) {
            for (const name of targets) {
              this.realtime.publish(payload.tournamentId, name, payload);
            }
          }
          await this.prisma.outboxEvent.update({
            where: { id: evt.id },
            data: { status: 'DONE', processedAt: new Date() },
          });
        } catch (err) {
          const attempts = evt.attempts + 1;
          await this.prisma.outboxEvent.update({
            where: { id: evt.id },
            data: {
              attempts,
              status: attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
              availableAt: new Date(Date.now() + attempts * POLL_MS),
            },
          });
          this.logger.warn(`Outbox ${evt.id} échec (tentative ${attempts}): ${String(err)}`);
        }
      }
    } catch (err) {
      this.logger.error(`Drain outbox échoué: ${String(err)}`);
    } finally {
      this.running = false;
    }
  }
}
