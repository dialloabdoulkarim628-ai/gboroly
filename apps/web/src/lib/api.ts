/**
 * Client de l'API publique Gboroly (lecture seule).
 * Consommé par les Server Components des pages /t/[slug] (SSR/ISR).
 */
const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/api/v1';
const REVALIDATE = 60; // ISR : rafraîchit les pages publiques toutes les 60 s.

export interface TeamRef {
  name: string;
  logoUrl?: string | null;
  shortName?: string | null;
}

export interface PublicTournament {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  country: string;
  city?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
  sport: { key: string; name: string };
  organization: { name: string; logoUrl?: string | null; slug: string };
  categories: { id: string; name: string; slug: string }[];
  stats: { teams: number; matchesPlayed: number; matchesTotal: number };
}

export interface PublicMatch {
  id: string;
  status: string;
  scheduledAt?: string | null;
  round: string;
  field?: string | null;
  home: TeamRef | null;
  away: TeamRef | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
}

export interface PublicStanding {
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
  categoryId: string;
  team: TeamRef;
}

export interface PublicTeam {
  registrationId: string;
  team: TeamRef;
  category: string;
  seed: number | null;
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

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { next: { revalidate: REVALIDATE } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null; // API indisponible → l'appelant gère (notFound / état vide).
  }
}

export const getTournament = (slug: string) =>
  get<PublicTournament>(`/public/tournaments/${slug}`);
export const getMatches = (slug: string, query = '') =>
  get<PublicMatch[]>(`/public/tournaments/${slug}/matches${query}`);
export const getStandings = (slug: string) =>
  get<PublicStanding[]>(`/public/tournaments/${slug}/standings`);
export const getTeams = (slug: string) =>
  get<PublicTeam[]>(`/public/tournaments/${slug}/teams`);
export const getBracket = (slug: string) =>
  get<BracketNode[]>(`/public/tournaments/${slug}/bracket`);
