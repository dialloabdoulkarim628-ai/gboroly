/**
 * Règles marketplace — module PUR (testable).
 * Détermine si les inscriptions publiques d'un tournoi sont ouvertes.
 */
export interface RegistrationWindow {
  status: string;
  visibility: string;
  registrationStart?: Date | null;
  registrationEnd?: Date | null;
  maxTeams?: number | null;
}

export type OpenReason =
  | 'OPEN'
  | 'NOT_PUBLIC'
  | 'NOT_PUBLISHED'
  | 'NOT_STARTED'
  | 'CLOSED'
  | 'FULL';

export interface OpenResult {
  open: boolean;
  reason: OpenReason;
}

export function isRegistrationOpen(
  t: RegistrationWindow,
  approvedCount: number,
  now: Date = new Date(),
): OpenResult {
  if (t.visibility !== 'PUBLIC') return { open: false, reason: 'NOT_PUBLIC' };
  if (t.status !== 'PUBLISHED') return { open: false, reason: 'NOT_PUBLISHED' };
  if (t.registrationStart && now < t.registrationStart) return { open: false, reason: 'NOT_STARTED' };
  if (t.registrationEnd && now > t.registrationEnd) return { open: false, reason: 'CLOSED' };
  if (t.maxTeams != null && approvedCount >= t.maxTeams) return { open: false, reason: 'FULL' };
  return { open: true, reason: 'OPEN' };
}
