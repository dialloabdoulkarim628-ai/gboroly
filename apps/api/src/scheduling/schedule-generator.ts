/**
 * ScheduleGenerator — module PUR (testable sans DB).
 * Transforme des appariements en créneaux (jour × terrain × heure) sous contraintes.
 * Best-effort (le problème est NP-difficile) : renvoie les affectations + les matchs non planifiables.
 * Voir docs/SCHEDULING.md.
 */
export interface SchedulableMatch {
  id: string;
  teamAId: string;
  teamBId: string;
  /** Ordre de priorité (rounds/poules antérieurs planifiés en premier). */
  priority: number;
}

export interface ScheduleConfig {
  /** Jours du tournoi, ISO 'YYYY-MM-DD'. */
  days: string[];
  startTime: string; // 'HH:mm'
  endTime: string; // 'HH:mm'
  matchDurationMin: number;
  breakMin: number; // pause entre 2 matchs d'un même terrain
  restMinutesPerTeam: number; // repos minimal d'une équipe entre 2 matchs
}

export interface ScheduleAssignment {
  matchId: string;
  fieldId: string;
  start: string; // ISO
  end: string; // ISO
}

export interface ScheduleResult {
  assignments: ScheduleAssignment[];
  unscheduled: { matchId: string; reason: string }[];
}

interface Slot {
  fieldId: string;
  startMs: number;
  endMs: number;
}

const MINUTE = 60_000;

function at(day: string, time: string): number {
  return Date.parse(`${day}T${time}:00Z`);
}

/** Génère tous les créneaux (jour × terrain × heure), triés chronologiquement. */
function buildSlots(fieldIds: string[], config: ScheduleConfig): Slot[] {
  const slots: Slot[] = [];
  const step = (config.matchDurationMin + config.breakMin) * MINUTE;
  const durMs = config.matchDurationMin * MINUTE;
  for (const day of config.days) {
    const dayStart = at(day, config.startTime);
    const dayEnd = at(day, config.endTime);
    for (let t = dayStart; t + durMs <= dayEnd; t += step) {
      for (const fieldId of fieldIds) {
        slots.push({ fieldId, startMs: t, endMs: t + durMs });
      }
    }
  }
  return slots.sort((a, b) => a.startMs - b.startMs || a.fieldId.localeCompare(b.fieldId));
}

/** L'équipe respecte-t-elle le repos minimal vis-à-vis de ses matchs déjà placés ? */
function teamIsFree(
  intervals: Array<{ s: number; e: number }>,
  start: number,
  end: number,
  restMs: number,
): boolean {
  for (const iv of intervals) {
    const after = start >= iv.e + restMs;
    const before = end <= iv.s - restMs;
    if (!after && !before) return false; // chevauchement ou repos insuffisant
  }
  return true;
}

export function generateSchedule(
  matches: SchedulableMatch[],
  fieldIds: string[],
  config: ScheduleConfig,
): ScheduleResult {
  const result: ScheduleResult = { assignments: [], unscheduled: [] };
  if (fieldIds.length === 0) {
    return { assignments: [], unscheduled: matches.map((m) => ({ matchId: m.id, reason: 'NO_FIELD' })) };
  }

  const slots = buildSlots(fieldIds, config);
  const usedSlots = new Set<string>(); // `${fieldId}@${startMs}`
  const teamIntervals = new Map<string, Array<{ s: number; e: number }>>();
  const restMs = config.restMinutesPerTeam * MINUTE;
  const ordered = [...matches].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));

  for (const match of ordered) {
    const aIv = teamIntervals.get(match.teamAId) ?? [];
    const bIv = teamIntervals.get(match.teamBId) ?? [];
    let placed = false;

    for (const slot of slots) {
      const key = `${slot.fieldId}@${slot.startMs}`;
      if (usedSlots.has(key)) continue;
      if (!teamIsFree(aIv, slot.startMs, slot.endMs, restMs)) continue;
      if (!teamIsFree(bIv, slot.startMs, slot.endMs, restMs)) continue;

      usedSlots.add(key);
      aIv.push({ s: slot.startMs, e: slot.endMs });
      bIv.push({ s: slot.startMs, e: slot.endMs });
      teamIntervals.set(match.teamAId, aIv);
      teamIntervals.set(match.teamBId, bIv);
      result.assignments.push({
        matchId: match.id,
        fieldId: slot.fieldId,
        start: new Date(slot.startMs).toISOString(),
        end: new Date(slot.endMs).toISOString(),
      });
      placed = true;
      break;
    }

    if (!placed) result.unscheduled.push({ matchId: match.id, reason: 'NO_FEASIBLE_SLOT' });
  }

  return result;
}
