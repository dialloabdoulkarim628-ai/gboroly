import { describe, expect, it } from 'vitest';
import {
  generateSchedule,
  type ScheduleConfig,
  type SchedulableMatch,
} from './schedule-generator';

const config: ScheduleConfig = {
  days: ['2026-09-12'],
  startTime: '08:00',
  endTime: '20:00',
  matchDurationMin: 60,
  breakMin: 0,
  restMinutesPerTeam: 60,
};

function m(id: string, a: string, b: string, priority = 0): SchedulableMatch {
  return { id, teamAId: a, teamBId: b, priority };
}

describe('ScheduleGenerator', () => {
  it('planifie tous les matchs quand la capacité suffit', () => {
    const matches = [m('m1', 'A', 'B'), m('m2', 'C', 'D'), m('m3', 'E', 'F')];
    const res = generateSchedule(matches, ['F1'], config);
    expect(res.unscheduled).toHaveLength(0);
    expect(res.assignments).toHaveLength(3);
    // Sur un seul terrain : créneaux successifs, pas de chevauchement.
    const starts = res.assignments.map((a) => a.start).sort();
    expect(new Set(starts).size).toBe(3);
  });

  it('respecte le repos d’une équipe entre 2 matchs (pas de créneaux adjacents)', () => {
    // A joue 2 matchs ; avec 60 min de repos, ils ne peuvent pas être consécutifs.
    const matches = [m('m1', 'A', 'B'), m('m2', 'A', 'C')];
    const res = generateSchedule(matches, ['F1'], config);
    expect(res.unscheduled).toHaveLength(0);
    const [s1, s2] = res.assignments
      .map((x) => Date.parse(x.start))
      .sort((x, y) => x - y);
    expect(s2! - s1!).toBeGreaterThanOrEqual(120 * 60_000); // ≥ durée + repos
  });

  it('évite deux matchs simultanés pour une même équipe (2 terrains)', () => {
    const matches = [m('m1', 'A', 'B'), m('m2', 'A', 'C')];
    const res = generateSchedule(matches, ['F1', 'F2'], config);
    const times = res.assignments.map((a) => a.start);
    expect(new Set(times).size).toBe(2); // pas au même créneau malgré 2 terrains
  });

  it('parallélise des équipes distinctes sur plusieurs terrains', () => {
    const matches = [m('m1', 'A', 'B'), m('m2', 'C', 'D')];
    const res = generateSchedule(matches, ['F1', 'F2'], config);
    // Peuvent jouer en même temps (équipes distinctes).
    const starts = res.assignments.map((a) => a.start);
    expect(new Set(starts).size).toBe(1);
  });

  it('remonte les matchs non planifiables (capacité insuffisante)', () => {
    // 1 seul créneau utile : journée d’1h, durée 60 → un seul slot par terrain.
    const tight: ScheduleConfig = { ...config, startTime: '08:00', endTime: '09:00' };
    const matches = [m('m1', 'A', 'B'), m('m2', 'A', 'C')];
    const res = generateSchedule(matches, ['F1'], tight);
    expect(res.assignments).toHaveLength(1);
    expect(res.unscheduled).toHaveLength(1);
    expect(res.unscheduled[0]!.reason).toBe('NO_FEASIBLE_SLOT');
  });

  it('sans terrain → tout est non planifiable', () => {
    const res = generateSchedule([m('m1', 'A', 'B')], [], config);
    expect(res.unscheduled).toHaveLength(1);
    expect(res.unscheduled[0]!.reason).toBe('NO_FIELD');
  });
});
