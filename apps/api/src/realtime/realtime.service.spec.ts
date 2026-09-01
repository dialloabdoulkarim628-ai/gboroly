import { describe, expect, it } from 'vitest';
import { RealtimeService } from './realtime.service';

describe('RealtimeService', () => {
  it('diffuse les événements du bon tournoi et filtre les autres', () => {
    const svc = new RealtimeService();
    const received: unknown[] = [];
    const sub = svc.streamFor('t1').subscribe((m) => received.push(m.data));

    svc.publish('t1', 'match.finished', { tournamentId: 't1', matchId: 'm1' });
    svc.publish('t2', 'match.finished', { tournamentId: 't2', matchId: 'm9' }); // autre tournoi → filtré
    svc.publish('t1', 'standings.updated', { tournamentId: 't1' });

    sub.unsubscribe();

    expect(received).toEqual([
      { event: 'match.finished', payload: { tournamentId: 't1', matchId: 'm1' } },
      { event: 'standings.updated', payload: { tournamentId: 't1' } },
    ]);
  });

  it('ne reçoit rien après désabonnement', () => {
    const svc = new RealtimeService();
    const received: unknown[] = [];
    const sub = svc.streamFor('t1').subscribe((m) => received.push(m.data));
    sub.unsubscribe();
    svc.publish('t1', 'match.started', { tournamentId: 't1' });
    expect(received).toHaveLength(0);
  });
});
