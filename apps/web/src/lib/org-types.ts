/** Types partagés des données organisateur (dashboard). */

export type TournamentStatus =
  | 'DRAFT'
  | 'READY'
  | 'PUBLISHED'
  | 'ONGOING'
  | 'COMPLETED'
  | 'ARCHIVED'
  | 'CANCELLED';

export interface Tournament {
  id: string;
  name: string;
  slug: string;
  status: TournamentStatus;
  visibility: 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
  country: string;
  city?: string | null;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  registrationFee?: string | null; // BigInt sérialisé en chaîne
  currency: string;
  maxTeams?: number | null;
  createdAt: string;
}

export type TeamStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
export interface Team {
  id: string;
  name: string;
  shortName?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  status: TeamStatus;
  createdAt: string;
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  position?: string | null;
  nationality?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  dateOfBirth?: string | null;
  createdAt: string;
}

export interface RosterEntry {
  id: string; // teamPlayer id
  jerseyNumber?: number | null;
  position?: string | null;
  status: string;
  player: { id: string; firstName: string; lastName: string; position?: string | null; photoUrl?: string | null };
}

export const TEAM_STATUS_META: Record<TeamStatus, { label: string; className: string }> = {
  ACTIVE: { label: 'Active', className: 'bg-field/15 text-field' },
  SUSPENDED: { label: 'Suspendue', className: 'bg-danger/10 text-danger' },
  ARCHIVED: { label: 'Archivée', className: 'bg-slate-100 text-slate-500' },
};

export type MatchStatus =
  | 'SCHEDULED'
  | 'LIVE'
  | 'PAUSED'
  | 'FINISHED'
  | 'POSTPONED'
  | 'CANCELLED'
  | 'FORFEIT';

export interface MatchView {
  id: string;
  status: MatchStatus;
  scheduledAt?: string | null;
  round?: string | null;
  roundOrder: number;
  field?: string | null;
  homeRegistrationId?: string | null;
  awayRegistrationId?: string | null;
  home?: string | null;
  away?: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
}

export const MATCH_STATUS_META: Record<MatchStatus, { label: string; className: string }> = {
  SCHEDULED: { label: 'À jouer', className: 'bg-slate-100 text-slate-600' },
  LIVE: { label: 'En direct', className: 'bg-danger/10 text-danger' },
  PAUSED: { label: 'Pause', className: 'bg-amber-100 text-amber-700' },
  FINISHED: { label: 'Terminé', className: 'bg-field/15 text-field' },
  POSTPONED: { label: 'Reporté', className: 'bg-amber-100 text-amber-700' },
  CANCELLED: { label: 'Annulé', className: 'bg-slate-100 text-slate-500' },
  FORFEIT: { label: 'Forfait', className: 'bg-danger/10 text-danger' },
};

export interface Standing {
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  group: string | null;
  team: { name: string; logoUrl?: string | null };
}

export interface BracketNode {
  matchId: string;
  roundName: string;
  roundOrder: number;
  homeLabel: string;
  awayLabel: string;
  winnerTeamId?: string;
  homeTeamId?: string;
  awayTeamId?: string;
}

export interface Scorer {
  playerId: string;
  name: string;
  team: string | null;
  goals: number;
}

export interface Payment {
  id: string;
  team: string | null;
  registrationId: string | null;
  amount: number;
  currency: string;
  method: string;
  status: string;
  receiptRef?: string | null;
  paidAt?: string | null;
  createdAt: string;
}
export interface PaymentSummary {
  count: number;
  gross: number;
  organizerRevenue: number;
  platformCommission: number;
}
export interface Registration {
  id: string;
  status: string;
  paymentStatus?: string | null;
  team: { id: string; name: string; logoUrl?: string | null };
}

export const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'WAVE', label: 'Wave' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'MTN_MONEY', label: 'MTN Money' },
  { value: 'MOOV_MONEY', label: 'Moov Money' },
  { value: 'CARD', label: 'Carte' },
  { value: 'MANUAL', label: 'Manuel' },
  { value: 'OTHER', label: 'Autre' },
];
export const PAYMENT_METHOD_LABEL: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.value, m.label]),
);

export interface Field {
  id: string;
  name: string;
  capacity?: number | null;
  venueId?: string | null;
}
export interface Venue {
  id: string;
  name: string;
  address?: string | null;
  fields: Field[];
}
export interface CompetitionInfo {
  id: string;
  category: string;
  formatType: string;
  status: string;
  matchesTotal: number;
  matchesUnscheduled: number;
}

export interface ChecklistItem {
  key: string;
  label: string;
  met: boolean;
  required: boolean;
}
export interface Checklist {
  status: TournamentStatus;
  items: ChecklistItem[];
}

export const STATUS_META: Record<TournamentStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Brouillon', className: 'bg-slate-100 text-slate-600' },
  READY: { label: 'Prêt', className: 'bg-amber-100 text-amber-700' },
  PUBLISHED: { label: 'Publié', className: 'bg-field/15 text-field' },
  ONGOING: { label: 'En cours', className: 'bg-brand/15 text-brand' },
  COMPLETED: { label: 'Terminé', className: 'bg-victory/20 text-amber-700' },
  ARCHIVED: { label: 'Archivé', className: 'bg-slate-100 text-slate-500' },
  CANCELLED: { label: 'Annulé', className: 'bg-danger/10 text-danger' },
};

export function fmtFee(fee?: string | null, currency = 'XOF') {
  if (fee == null || fee === '0') return 'Gratuit';
  return `${Number(fee).toLocaleString('fr-FR')} ${currency}`;
}
export function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(iso),
  );
}
