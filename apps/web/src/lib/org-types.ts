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
