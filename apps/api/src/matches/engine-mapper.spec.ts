import { describe, expect, it } from 'vitest';
import { toEngineMatch, winnerFromScore, type DbMatchLike } from './engine-mapper';

const dbMatch: DbMatchLike = {
  id: 'm1',
  roundId: 'r1',
  groupId: 'g1',
  homeTeamId: 'regA',
  awayTeamId: 'regB',
  homeSourceRef: 'seed:1',
  awaySourceRef: 'seed:4',
  status: 'FINISHED',
  homeScore: 2,
  awayScore: 1,
  homePenalties: null,
  awayPenalties: null,
  winnerRegistrationId: 'regA',
  forfeitTeamId: null,
  resultType: 'NORMAL',
  feedsIntoMatchId: 'm5',
  feedsIntoSlot: 'home',
};

describe('mapper DB → moteur', () => {
  it('convertit un match terminé', () => {
    const e = toEngineMatch(dbMatch);
    expect(e.homeTeamId).toBe('regA');
    expect(e.result).toEqual({ homeScore: 2, awayScore: 1, homePenalties: undefined, awayPenalties: undefined });
    expect(e.feedsIntoSlot).toBe('home');
    expect(e.homeSourceRef).toBe('seed:1');
  });

  it('un match sans score n’a pas de result', () => {
    const e = toEngineMatch({ ...dbMatch, homeScore: null, awayScore: null, status: 'SCHEDULED' });
    expect(e.result).toBeUndefined();
  });
});

describe('winnerFromScore', () => {
  it('score décisif', () => {
    expect(winnerFromScore(dbMatch)).toBe('regA');
    expect(winnerFromScore({ ...dbMatch, homeScore: 0, awayScore: 3 })).toBe('regB');
  });
  it('nul sans tirs au but → null', () => {
    expect(winnerFromScore({ ...dbMatch, homeScore: 1, awayScore: 1 })).toBeNull();
  });
  it('tirs au but départagent', () => {
    expect(
      winnerFromScore({ ...dbMatch, homeScore: 1, awayScore: 1, homePenalties: 5, awayPenalties: 4 }),
    ).toBe('regA');
  });
});
