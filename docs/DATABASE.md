# DATABASE — Schéma PostgreSQL (Prisma)

> Source de vérité unique. PostgreSQL + Prisma ORM. Fichiers en S3 (jamais en base). Conventions ci-dessous, puis schéma table par table, enums, index, et règles multi-tenant.

## Conventions

- **Clé primaire** : `id UUID` (v7 si possible, sinon v4) — *jamais* la référence métier comme clé.
- **Timestamps** : `createdAt`, `updatedAt` (auto). Soft-delete via `deletedAt` (nullable) sur les entités critiques.
- **Multi-tenant** : `organizationId` sur toute table métier privée. Filtré systématiquement côté backend (jamais confiance au client).
- **Money** : montants en **entier (plus petite unité, ex. FCFA)** → `BigInt`/`Int`, jamais `float`. `currency` en ISO 4217 (`XOF` par défaut).
- **Enums** : PostgreSQL enums via Prisma.
- **Concurrence** : `version Int @default(0)` (optimistic lock) sur `Match` et entités à écriture concurrente.
- **JSON validé** : les colonnes `Json` (formatConfig, rulesConfig, metadata) sont **toujours** validées par un schéma Zod côté application.
- **Index** : voir §Index à la fin.

---

## Domaine 1 — Identité, Organisation, RBAC

### User
| Colonne | Type | Notes |
|---|---|---|
| id | UUID PK | |
| firstName | String | |
| lastName | String | |
| email | String? | unique (nullable si inscription par téléphone) |
| phone | String? | unique, E.164 |
| passwordHash | String? | Argon2id |
| avatarUrl | String? | |
| status | UserStatus | ACTIVE/DISABLED |
| emailVerifiedAt | DateTime? | |
| phoneVerifiedAt | DateTime? | |
| createdAt/updatedAt | DateTime | |

### Organization
| id UUID PK · name · slug (unique) · logoUrl? · description? · country · city? · timezone · currency (XOF) · status (OrgStatus) · createdAt · updatedAt · deletedAt? |

### OrganizationMember  *(user ↔ organization, N‑N)*
| id · organizationId FK · userId FK · roleId FK · status (INVITED/ACTIVE/DISABLED) · invitedByUserId? · joinedAt? · createdAt · updatedAt |
- **Unique** `(organizationId, userId)`.

### Role
| id · organizationId? (null = rôle système global) · key (RoleKey) · name · isSystem Boolean · createdAt |
- Rôles système par défaut (voir [RBAC.md](./RBAC.md)) : `SUPER_ADMIN`, `ORGANIZATION_OWNER`, `ORGANIZATION_ADMIN`, `FINANCE_MANAGER`, `TOURNAMENT_MANAGER`, `MATCH_OPERATOR`, `COMMUNICATION_MANAGER`, `REFEREE`, `TEAM_MANAGER`.

### Permission
| id · key (unique, ex. `tournament.publish`) · description |

### RolePermission *(role ↔ permission, N‑N)*
| id · roleId FK · permissionId FK | **Unique** `(roleId, permissionId)`.

### Invitation
| id · organizationId FK · email/phone · roleId FK · token (unique) · status (PENDING/ACCEPTED/EXPIRED/REVOKED) · expiresAt · createdByUserId · createdAt |

### RefreshToken *(sessions révocables)*
| id · userId FK · tokenHash (unique) · userAgent? · ip? · expiresAt · revokedAt? · createdAt |

### AuthToken *(vérif email/téléphone + reset)*
| id · userId FK · type (EMAIL_VERIFY/PHONE_OTP/PASSWORD_RESET) · codeHash · expiresAt · consumedAt? · attempts Int · createdAt |

**Enums** : `UserStatus{ACTIVE,DISABLED}` · `OrgStatus{ACTIVE,SUSPENDED,ARCHIVED}` · `MemberStatus{INVITED,ACTIVE,DISABLED}` · `RoleKey{...}`.

---

## Domaine 2 — Sport & configuration

### Sport
| id · key (unique, ex. `maracana`) · name · defaultRules Json · isActive · createdAt |
- `defaultRules` = points, tiebreakers, statistiques activées, cartons, prolongation, tirs au but… (voir [BUSINESS-RULES.md](./BUSINESS-RULES.md)). Le **code** applique ces règles via `SportRules` ; la table sert de configuration de référence.

### FormatTemplate  *(presets réutilisables)*
| id · sportId FK? · key · name · teamsCount · config Json (nb groupes, taille, qualifiés/groupe, enchaînement knockout) · isSystem · organizationId? (templates privés) · createdAt |
- Ex. `{teams:8, groups:2, perGroup:4, qualifyPerGroup:2, knockout:["SF","F"]}`.

---

## Domaine 3 — Tournoi

### Tournament
| Colonne | Type | Notes |
|---|---|---|
| id UUID PK | | |
| organizationId | FK | tenant |
| sportId | FK | |
| name · slug (unique global) · description? | | |
| logoUrl? · bannerUrl? | | S3 |
| country · city? · venueDescription? | | |
| startDate? · endDate? · startTime? | | |
| registrationStart? · registrationEnd? | | |
| maxTeams? | Int? | |
| registrationFee? | BigInt? | surchargée par catégorie possible |
| currency | String | XOF |
| timezone | String | |
| visibility | Visibility | PRIVATE/PUBLIC |
| status | TournamentStatus | voir enum |
| createdByUserId | FK | |
| createdAt/updatedAt/deletedAt? | | |

`TournamentStatus{DRAFT, READY, PUBLISHED, ONGOING, COMPLETED, ARCHIVED, CANCELLED}` · `Visibility{PRIVATE, PUBLIC}`.

### TournamentCategory
| id · tournamentId FK · name (ex. Senior, U20, Féminin) · slug · registrationFee? (override) · rulesConfig Json (points, tiebreakers…) · maxTeams? · minSquad? · maxSquad? · status · order · createdAt |
- Chaque catégorie a **sa** config, ses équipes (via Registration), son calendrier, son classement.

### Venue
| id · tournamentId FK · name · address? · lat? · lng? · createdAt |

### Field  *(terrain d'un venue)*
| id · venueId FK · tournamentId FK · name (ex. Terrain A) · availabilityConfig Json (jours/horaires) · capacity? · createdAt |

### Referee
| id · organizationId FK · tournamentId? FK · firstName · lastName · phone? · availabilityConfig Json? · status · createdAt |

### Sponsor
| id · tournamentId FK · name · logoUrl? · websiteUrl? · level (SponsorLevel) · order · createdAt |
`SponsorLevel{MAIN, GOLD, SILVER, PARTNER}`.

---

## Domaine 4 — Équipes & joueurs

### Team  *(référentiel niveau organisation — voir décision D2)*
| id · organizationId FK · name · shortName? · slug (unique par org) · logoUrl? · captainPlayerId? · managerUserId? · phone? · status (TeamStatus) · createdAt · deletedAt? |
`TeamStatus{ACTIVE, SUSPENDED, ARCHIVED}`.

### Player  *(référentiel niveau organisation — voir D3)*
| id · organizationId FK · firstName · lastName · dateOfBirth? · photoUrl? · phone? · position? · nationality? · privacyConfig Json? · status · createdAt · deletedAt? |

### TeamPlayer  *(historique joueur ↔ équipe, contextualisé)*
| id · teamId FK · playerId FK · tournamentId? FK · categoryId? FK · jerseyNumber? · position? · status (ACTIVE/SUSPENDED/REMOVED) · joinedAt · leftAt? |
- **Unique** `(teamId, playerId, tournamentId)`.
- **Contrôle de cohérence** : un joueur ne peut être `ACTIVE` que dans **une** équipe par (tournoi, catégorie). Voir [BUSINESS-RULES.md](./BUSINESS-RULES.md).

### Registration  *(participation d'une équipe à un tournoi/catégorie)*
| id · tournamentId FK · categoryId FK · teamId FK · seed? Int · status (RegistrationStatus) · paymentStatus (PaymentStatus) · submittedAt? · approvedAt? · rejectedAt? · rejectionReason? · createdAt · deletedAt? |
- **Unique** `(categoryId, teamId)`.
- `RegistrationStatus{DRAFT, INVITED, PENDING, APPROVED, REJECTED, WITHDRAWN}` · `PaymentStatus{UNPAID, PARTIAL, PAID, REFUNDED, CANCELLED}`.

---

## Domaine 5 — Compétition (moteur)

### Competition  *(voir décision A1 — 1‑N depuis Category)*
| id · categoryId FK · tournamentId FK (dénormalisé pour requêtes) · formatType (FormatType) · formatConfig Json · status · order · createdAt |
`FormatType{ROUND_ROBIN, GROUP_STAGE, SINGLE_ELIMINATION, DOUBLE_ELIMINATION, GROUP_TO_PLAYOFFS, CUSTOM}`.

### Round
| id · competitionId FK · roundType (RoundType) · name (ex. "Quarts") · order Int · status · qualificationRules Json? · createdAt |
`RoundType{ROUND_ROBIN, GROUP_STAGE, KNOCKOUT, PLACEMENT, FINAL}`.

### Group  *(dans un round GROUP_STAGE)*
| id · roundId FK · name (ex. Groupe A) · order · createdAt |

### GroupTeam  *(appartenance + seed — donnée d'entrée, ≠ Standing)*
| id · groupId FK · registrationId FK (→ équipe participante) · seed? · position? (position finale figée après phase) |
- **Unique** `(groupId, registrationId)`.

### Standing  *(ligne calculée — donnée dérivée, recalculable)*
| id · competitionId FK · groupId? FK (null pour round robin global) · registrationId FK · played · wins · draws · losses · goalsFor · goalsAgainst · goalDifference · points · fairPlayPoints · position · updatedAt |
- **Unique** `(competitionId, groupId, registrationId)`.
- ⚠️ Jamais saisi à la main : produit par `competition-engine`.

---

## Domaine 6 — Matchs

### Match
| Colonne | Type | Notes |
|---|---|---|
| id UUID PK · version Int | | optimistic lock |
| tournamentId · categoryId · competitionId · roundId · groupId? | FK | dénormalisations utiles |
| homeTeamId? · awayTeamId? | FK Registration | nullable tant que le bracket n'est pas alimenté |
| homeSourceRef? · awaySourceRef? | Json? | ex. « vainqueur QF1 », « 2e Groupe B » avant résolution |
| venueId? · fieldId? · refereeId? | FK | |
| scheduledAt? | DateTime | |
| status | MatchStatus | |
| homeScore? · awayScore? | Int | |
| homePenalties? · awayPenalties? | Int | tirs au but |
| winnerRegistrationId? | FK | |
| forfeitTeamId? | FK | équipe forfait |
| resultType? | ResultType | NORMAL/FORFEIT/WALKOVER |
| feedsIntoMatchId? · feedsIntoSlot? | FK/str | chaînage bracket (vainqueur) |
| loserFeedsIntoMatchId? · loserFeedsIntoSlot? | FK/str | chaînage double élimination (perdant) |
| order | Int | ordre intra-round (bracket/affichage) |
| notes? | String | |
| startedAt? · finishedAt? · postponedFrom? | DateTime | |
| createdAt/updatedAt/deletedAt? | | |

`MatchStatus{SCHEDULED, LIVE, PAUSED, FINISHED, POSTPONED, CANCELLED, FORFEIT}` · `ResultType{NORMAL, FORFEIT, WALKOVER, AWARDED}`.

### MatchEvent
| id · matchId FK · registrationId FK (équipe) · playerId? FK · type (MatchEventType) · minute? · additionalTime? · metadata Json? · createdByUserId · createdAt · voidedAt? |
`MatchEventType{GOAL, OWN_GOAL, YELLOW_CARD, RED_CARD, SUBSTITUTION, INJURY, PENALTY, PENALTY_MISS, FOUL, OTHER}`.

### MatchOfficial  *(N arbitres par match)*
| id · matchId FK · refereeId FK · role (MAIN/ASSISTANT/FOURTH) | **Unique** `(matchId, refereeId)`.

### Complaint  *(réclamation liée à un match)*
| id · tournamentId FK · matchId? FK · teamId? FK · subject · body · status (OPEN/REVIEWING/RESOLVED/REJECTED) · createdByUserId · createdAt |

---

## Domaine 7 — Paiements & facturation

### Payment
| id · organizationId FK · tournamentId FK · registrationId? FK · teamId? FK · grossAmount BigInt · platformFee BigInt · paymentProcessingFee BigInt · organizerAmount BigInt · platformAmount BigInt · currency · status (PaymentStatus) · method (PaymentMethodType) · provider? · providerTxnRef? · idempotencyKey (unique) · receiptRef? · paidAt? · createdByUserId? · createdAt · updatedAt |
- **Unique** `(provider, providerTxnRef)` (anti double-crédit) et `idempotencyKey`.
- `PaymentMethodType{CASH, WAVE, ORANGE_MONEY, MTN_MONEY, MOOV_MONEY, CARD, MANUAL, OTHER}`.

### PaymentTransaction  *(événements provider / webhooks)*
| id · paymentId FK · type (INIT/AUTHORIZED/CAPTURED/FAILED/REFUNDED/WEBHOOK) · providerPayload Json · amount BigInt? · createdAt |

### Subscription  *(futur — prévu, non activé MVP)*
| id · organizationId FK · plan (FREE/STARTER/PRO/ENTERPRISE) · status · currentPeriodEnd? · createdAt |

---

## Domaine 8 — Communication & médias

### Announcement
| id · tournamentId FK · title · body · publishedAt? · createdByUserId · createdAt |

### Notification
| id · userId? FK · organizationId? FK · channel (IN_APP/EMAIL/SMS/WHATSAPP/PUSH) · type · payload Json · status (PENDING/SENT/FAILED/READ) · sentAt? · readAt? · createdAt |

### Media  *(métadonnées fichiers — fichier réel en S3)*
| id · organizationId? FK · ownerType (TOURNAMENT/TEAM/PLAYER/SPONSOR/...) · ownerId · url · key · mimeType · size Int · metadata Json? · createdAt |

---

## Domaine 9 — Système

### AuditLog
| id · userId? FK · organizationId? FK · action (AuditAction) · entityType · entityId · oldValue Json? · newValue Json? · ipAddress? · userAgent? · createdAt |
`AuditAction{TEAM_APPROVED, TEAM_REJECTED, MATCH_STARTED, SCORE_UPDATED, MATCH_FINISHED, MATCH_CANCELLED, MATCH_POSTPONED, PAYMENT_UPDATED, PLAYER_REMOVED, TOURNAMENT_SETTINGS_UPDATED, TOURNAMENT_PUBLISHED, ...}`.

### OutboxEvent  *(outbox pattern)*
| id · aggregateType · aggregateId · eventType · payload Json · status (PENDING/PROCESSING/DONE/FAILED) · attempts Int · availableAt · processedAt? · createdAt |
- Écrit dans la **même transaction** que la mutation métier. Consommé par le worker relais.

---

## Relations principales (résumé)

```
Organization 1─N User(via OrganizationMember) · 1─N Tournament · 1─N Team · 1─N Player
Tournament   1─N Category · 1─N Venue · 1─N Referee · 1─N Sponsor · 1─N Registration · 1─N Match · 1─N Announcement · 1─N Payment
Category     1─N Competition · 1─N Registration
Competition  1─N Round · 1─N Standing
Round        1─N Group · 1─N Match
Group        1─N GroupTeam · 1─N Match · 1─N Standing
Registration N─1 Team · 1─N GroupTeam · 1─N Standing · N Match (home/away)
Team         1─N TeamPlayer · 1─N Registration
Player       1─N TeamPlayer
Match        1─N MatchEvent · 1─N MatchOfficial · 0/1 Complaint
Payment      1─N PaymentTransaction
```

## Index (déterminés par les requêtes réelles)

- `Tournament(organizationId, status)`, `Tournament(slug)` unique, `Tournament(sportId)`.
- `TournamentCategory(tournamentId)`.
- `Registration(categoryId, status)`, `Registration(teamId)`, unique `(categoryId, teamId)`.
- `Match(tournamentId, scheduledAt)`, `Match(categoryId, roundId)`, `Match(status)`, `Match(fieldId, scheduledAt)`.
- `MatchEvent(matchId)`, `MatchEvent(playerId)`.
- `Standing(competitionId, groupId)`.
- `Payment(tournamentId, status)`, unique `(provider, providerTxnRef)`, unique `idempotencyKey`.
- `AuditLog(organizationId, createdAt)`, `AuditLog(entityType, entityId)`.
- `OutboxEvent(status, availableAt)`.
- `OrganizationMember(organizationId, userId)` unique.
- `TeamPlayer(teamId, playerId, tournamentId)` unique.

## Règles multi-tenant (non négociables)

1. Toute requête métier filtre par `organizationId` du contexte utilisateur (guard/tenant middleware), jamais depuis un paramètre client non vérifié.
2. Un `SUPER_ADMIN` Gboroly peut traverser les tenants **explicitement** (espace `/admin`), avec audit.
3. Les endpoints publics `/public/**` et `/t/[slug]` n'exposent **que** des données de tournois `PUBLISHED`/`PUBLIC`, en lecture, filtrées.
4. Soft-delete (`deletedAt`) sur données critiques ; purge physique = job dédié + audit.

## Migrations & seed

- Migrations Prisma versionnées (`packages/database/prisma/migrations`).
- Seed de développement : 1 organisation démo, 1 sport `maracana`, 16 équipes, joueurs, 4 groupes de 4, calendrier généré — pour dérouler le Golden Path (voir [TESTING.md](./TESTING.md)).
