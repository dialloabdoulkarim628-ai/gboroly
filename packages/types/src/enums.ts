// Gboroly — enums de domaine partagés. Alignés sur docs/DATABASE.md.

export const RoleKey = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ORGANIZATION_OWNER: 'ORGANIZATION_OWNER',
  ORGANIZATION_ADMIN: 'ORGANIZATION_ADMIN',
  FINANCE_MANAGER: 'FINANCE_MANAGER',
  TOURNAMENT_MANAGER: 'TOURNAMENT_MANAGER',
  MATCH_OPERATOR: 'MATCH_OPERATOR',
  COMMUNICATION_MANAGER: 'COMMUNICATION_MANAGER',
  REFEREE: 'REFEREE',
  TEAM_MANAGER: 'TEAM_MANAGER',
} as const;
export type RoleKey = (typeof RoleKey)[keyof typeof RoleKey];

export const TournamentStatus = {
  DRAFT: 'DRAFT',
  READY: 'READY',
  PUBLISHED: 'PUBLISHED',
  ONGOING: 'ONGOING',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
  CANCELLED: 'CANCELLED',
} as const;
export type TournamentStatus = (typeof TournamentStatus)[keyof typeof TournamentStatus];

export const Visibility = { PRIVATE: 'PRIVATE', PUBLIC: 'PUBLIC' } as const;
export type Visibility = (typeof Visibility)[keyof typeof Visibility];

export const RegistrationStatus = {
  DRAFT: 'DRAFT',
  INVITED: 'INVITED',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
} as const;
export type RegistrationStatus = (typeof RegistrationStatus)[keyof typeof RegistrationStatus];

export const PaymentStatus = {
  UNPAID: 'UNPAID',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
  REFUNDED: 'REFUNDED',
  CANCELLED: 'CANCELLED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const FormatType = {
  ROUND_ROBIN: 'ROUND_ROBIN',
  GROUP_STAGE: 'GROUP_STAGE',
  SINGLE_ELIMINATION: 'SINGLE_ELIMINATION',
  DOUBLE_ELIMINATION: 'DOUBLE_ELIMINATION',
  GROUP_TO_PLAYOFFS: 'GROUP_TO_PLAYOFFS',
  CUSTOM: 'CUSTOM',
} as const;
export type FormatType = (typeof FormatType)[keyof typeof FormatType];

export const RoundType = {
  ROUND_ROBIN: 'ROUND_ROBIN',
  GROUP_STAGE: 'GROUP_STAGE',
  KNOCKOUT: 'KNOCKOUT',
  PLACEMENT: 'PLACEMENT',
  FINAL: 'FINAL',
} as const;
export type RoundType = (typeof RoundType)[keyof typeof RoundType];

export const MatchStatus = {
  SCHEDULED: 'SCHEDULED',
  LIVE: 'LIVE',
  PAUSED: 'PAUSED',
  FINISHED: 'FINISHED',
  POSTPONED: 'POSTPONED',
  CANCELLED: 'CANCELLED',
  FORFEIT: 'FORFEIT',
} as const;
export type MatchStatus = (typeof MatchStatus)[keyof typeof MatchStatus];

export const MatchEventType = {
  GOAL: 'GOAL',
  OWN_GOAL: 'OWN_GOAL',
  YELLOW_CARD: 'YELLOW_CARD',
  RED_CARD: 'RED_CARD',
  SUBSTITUTION: 'SUBSTITUTION',
  INJURY: 'INJURY',
  PENALTY: 'PENALTY',
  PENALTY_MISS: 'PENALTY_MISS',
  FOUL: 'FOUL',
  OTHER: 'OTHER',
} as const;
export type MatchEventType = (typeof MatchEventType)[keyof typeof MatchEventType];

export const TieBreaker = {
  POINTS: 'POINTS',
  GOAL_DIFFERENCE: 'GOAL_DIFFERENCE',
  GOALS_FOR: 'GOALS_FOR',
  HEAD_TO_HEAD: 'HEAD_TO_HEAD',
  FAIR_PLAY: 'FAIR_PLAY',
  RANDOM_DRAW: 'RANDOM_DRAW',
} as const;
export type TieBreaker = (typeof TieBreaker)[keyof typeof TieBreaker];

export const PaymentMethodType = {
  CASH: 'CASH',
  WAVE: 'WAVE',
  ORANGE_MONEY: 'ORANGE_MONEY',
  MTN_MONEY: 'MTN_MONEY',
  MOOV_MONEY: 'MOOV_MONEY',
  CARD: 'CARD',
  MANUAL: 'MANUAL',
  OTHER: 'OTHER',
} as const;
export type PaymentMethodType = (typeof PaymentMethodType)[keyof typeof PaymentMethodType];
