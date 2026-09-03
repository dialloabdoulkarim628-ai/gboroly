import type { IconName } from './_icons';

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  soon?: boolean; // section pas encore construite (branchement à venir)
}

/** Menu principal du tableau de bord (ordre de la maquette). */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', href: '/dashboard', icon: 'dashboard' },
  { label: 'Mes tournois', href: '/dashboard/tournois', icon: 'trophy' },
  { label: 'Équipes', href: '/dashboard/equipes', icon: 'teams' },
  { label: 'Joueurs', href: '/dashboard/joueurs', icon: 'players' },
  { label: 'Matchs', href: '/dashboard/matchs', icon: 'matches' },
  { label: 'Calendrier', href: '/dashboard/calendrier', icon: 'calendar' },
  { label: 'Classements', href: '/dashboard/classements', icon: 'standings' },
  { label: 'Terrains', href: '/dashboard/terrains', icon: 'fields' },
  { label: 'Arbitres', href: '/dashboard/arbitres', icon: 'referees', soon: true },
  { label: 'Sponsors', href: '/dashboard/sponsors', icon: 'sponsors', soon: true },
  { label: 'Paiements', href: '/dashboard/paiements', icon: 'payments' },
  { label: 'Communications', href: '/dashboard/communications', icon: 'comms', soon: true },
  { label: 'Statistiques', href: '/dashboard/statistiques', icon: 'stats', soon: true },
  { label: 'Paramètres', href: '/dashboard/parametres', icon: 'settings', soon: true },
];

/** Barre du bas (mobile) — sous-ensemble. */
export const MOBILE_NAV: NavItem[] = [
  { label: 'Accueil', href: '/dashboard', icon: 'dashboard' },
  { label: 'Tournois', href: '/dashboard/tournois', icon: 'trophy', soon: true },
  { label: 'Calendrier', href: '/dashboard/calendrier', icon: 'calendar' },
  { label: 'Alertes', href: '/dashboard/communications', icon: 'bell', soon: true },
  { label: 'Menu', href: '#menu', icon: 'menu' },
];
