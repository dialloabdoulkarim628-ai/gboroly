import { Injectable, type MessageEvent } from '@nestjs/common';
import { Observable, Subject, filter, map, merge, interval } from 'rxjs';

interface DomainEvent {
  tournamentId: string;
  event: string;
  payload: unknown;
}

/**
 * Bus temps réel en mémoire (SSE). MVP mono-instance.
 * Multi-instances → brancher un adaptateur Redis pub/sub (voir docs/REALTIME.md).
 */
@Injectable()
export class RealtimeService {
  private readonly stream$ = new Subject<DomainEvent>();

  publish(tournamentId: string, event: string, payload: unknown): void {
    this.stream$.next({ tournamentId, event, payload });
  }

  /** Flux SSE d'un tournoi : événements filtrés + heartbeat anti-timeout (proxies/réseau faible). */
  streamFor(tournamentId: string): Observable<MessageEvent> {
    const events$ = this.stream$.pipe(
      filter((e) => e.tournamentId === tournamentId),
      map((e): MessageEvent => ({ data: { event: e.event, payload: e.payload } })),
    );
    const heartbeat$ = interval(25_000).pipe(
      map((): MessageEvent => ({ data: { event: 'ping' } })),
    );
    return merge(events$, heartbeat$);
  }
}
