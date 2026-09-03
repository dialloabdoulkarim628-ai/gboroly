/** Icônes outline 24×24 (stroke=currentColor), sans dépendance externe. */
export type IconName =
  | 'dashboard'
  | 'trophy'
  | 'teams'
  | 'players'
  | 'matches'
  | 'calendar'
  | 'standings'
  | 'fields'
  | 'referees'
  | 'sponsors'
  | 'payments'
  | 'comms'
  | 'stats'
  | 'settings'
  | 'search'
  | 'bell'
  | 'chat'
  | 'menu'
  | 'close'
  | 'plus'
  | 'import'
  | 'logout'
  | 'chevron'
  | 'crown'
  | 'pin';

const P: Record<IconName, React.ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>,
  trophy: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></>,
  teams: <><circle cx="9" cy="8" r="3" /><path d="M15 8a3 3 0 1 0 0-.001M3 20a6 6 0 0 1 12 0M15 14a6 6 0 0 1 6 6" /></>,
  players: <><circle cx="12" cy="7" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
  matches: <><circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18" /></>,
  calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></>,
  standings: <><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></>,
  fields: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M12 5v14M3 10h3v4H3M21 10h-3v4h3" /></>,
  referees: <><path d="M6 3l12 18M6 3h4M6 3v4" /><rect x="14" y="3" width="4" height="4" rx="1" /></>,
  sponsors: <><path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 21l-4.9-2.6.9-5.5-4-3.9L9.5 8Z" /></>,
  payments: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></>,
  comms: <><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /></>,
  stats: <><path d="M3 3v18h18" /><path d="M7 15l3-4 3 3 5-7" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.3 1a7 7 0 0 0-1.7-1L14.5 3h-4l-.4 2.4a7 7 0 0 0-1.7 1l-2.3-1-2 3.4L4 11a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.4 2.4h4l.4-2.4a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.6a7 7 0 0 0 .1-1Z" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  bell: <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></>,
  chat: <><path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z" /></>,
  menu: <><path d="M3 6h18M3 12h18M3 18h18" /></>,
  close: <><path d="M6 6l12 12M18 6 6 18" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  import: <><path d="M12 3v12M8 11l4 4 4-4M4 21h16" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></>,
  chevron: <><path d="m6 9 6 6 6-6" /></>,
  crown: <><path d="M3 7l4 4 5-6 5 6 4-4v11H3Z" /></>,
  pin: <><path d="M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></>,
};

export function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {P[name]}
    </svg>
  );
}
