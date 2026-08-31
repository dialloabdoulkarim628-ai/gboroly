# DOMAIN-MODEL — Modèle de domaine Gboroly

> Agrégats, relations, cycles de vie (machines à états). Complète [DATABASE.md](./DATABASE.md) (persistance) et [COMPETITION-ENGINE.md](./COMPETITION-ENGINE.md) (calculs).

## 1. Agrégats (Aggregate Roots)

| Agrégat | Racine | Contenu / invariants clés |
|---|---|---|
| **Organization** | Organization | Members, Roles. Un Owner minimum. Isolation tenant. |
| **Tournament** | Tournament | Categories, Venues, Fields, Referees, Sponsors. Slug public unique. |
| **Competition** | Competition | Rounds, Groups, Standings. Structure cohérente avec `formatType`. |
| **Registration** | Registration | Lien Team↔(Tournament,Category). Statut + paiement indépendants. |
| **Team** | Team | TeamPlayers. Référentiel org, réutilisable. |
| **Match** | Match | MatchEvents, MatchOfficials. Optimistic lock. Transitions strictes. |
| **Payment** | Payment | Transactions. Idempotent, immuable après capture. |

Règle : on ne modifie un agrégat que par sa racine (ex. on n'écrit pas un `Standing` directement — il est produit par la compétition).

## 2. Hiérarchie de compétition

```
Sport
  └─ Tournament (organizationId, sportId)
       └─ TournamentCategory (Senior, U20, Féminin…)
            └─ Competition (formatType, formatConfig)
                 └─ Round (GROUP_STAGE | KNOCKOUT | …)
                      ├─ Group (si GROUP_STAGE) ─ GroupTeam ─ Standing
                      └─ Match ─ MatchEvent
```

Décisions actées (voir [00-PHASE-0-ANALYSE.md](./00-PHASE-0-ANALYSE.md)) :
- **A1** : `Competition` est une entité distincte, 1‑N depuis `Category` (MVP : 1 competition auto-créée par catégorie).
- **A2b** : `GroupTeam` = appartenance/seed (entrée) ; `Standing` = ligne calculée (dérivé).

## 3. Machines à états

### Tournament
```
DRAFT ─▶ READY ─▶ PUBLISHED ─▶ ONGOING ─▶ COMPLETED ─▶ ARCHIVED
   └──────────────▶ CANCELLED (depuis tout état non terminal)
```
- `PUBLISHED` requiert la **checklist** validée (voir [BUSINESS-RULES.md](./BUSINESS-RULES.md)).
- `ONGOING` dès qu'un match passe `LIVE`/`FINISHED`.
- Certaines modifs (nb d'équipes, format) **bloquées** après `ONGOING` sans procédure spéciale + avertissement.

### Registration (statut)
```
DRAFT ─▶ INVITED ─▶ PENDING ─▶ APPROVED
                        └────▶ REJECTED
APPROVED/PENDING ─▶ WITHDRAWN
```
### Registration (paiement — axe indépendant)
```
UNPAID ─▶ PARTIAL ─▶ PAID
   └─▶ REFUNDED / CANCELLED
```
> **A6** : statut d'inscription, paiement, et statut d'équipe sont **3 axes séparés**. « Éliminée »/« Forfait » sont des états de compétition (au niveau Match/participation), pas d'équipe.

### Match
```
SCHEDULED ─▶ LIVE ⇄ PAUSED ─▶ FINISHED
     ├─▶ POSTPONED ─▶ (reprogrammé) SCHEDULED
     ├─▶ CANCELLED
     └─▶ FORFEIT (score administratif)
```
- `FINISHED` déclenche la chaîne transactionnelle (standings, qualifs, outbox).
- Transitions vérifiées côté domaine ; toute transition sensible → `AuditLog`.

### Team
```
ACTIVE ⇄ SUSPENDED ─▶ ARCHIVED (soft-delete)
```

## 4. Value Objects

- **Money** `{ amount: bigint, currency: string }` — arithmétique sûre, jamais float.
- **Score** `{ home: int, away: int, homePen?: int, awayPen?: int }`.
- **Slug** — génération + unicité par scope.
- **TimeWindow** `{ start, end }` — disponibilités terrains/arbitres.
- **QualificationRule** — mapping groupe/position → slot round suivant.

## 5. Événements de domaine

`TournamentCreated · TournamentPublished · TeamRegistered · RegistrationApproved · RegistrationRejected · ScheduleGenerated · MatchStarted · MatchEventRecorded · ScoreUpdated · MatchFinished · MatchPostponed · MatchCancelled · StandingsUpdated · TeamsQualified · ResultPublished · PaymentInitiated · PaymentCompleted · AnnouncementPublished`

Chaque événement critique est écrit dans `OutboxEvent` (même transaction) puis relayé (realtime, notifications, analytics). Voir [ARCHITECTURE.md](./ARCHITECTURE.md) §7.

## 6. Invariants métier majeurs

1. Un joueur ne peut être `ACTIVE` que dans **une** équipe par (tournoi, catégorie).
2. Une équipe ne peut avoir qu'**une** `Registration` par catégorie (`unique(categoryId, teamId)`).
3. Effectif d'une équipe borné par `minSquad`/`maxSquad` de la catégorie.
4. Un `Match` ne peut être `FINISHED` qu'avec un score valide (ou résultat administratif).
5. Un `Standing` n'est jamais écrit hors du moteur de compétition.
6. Un `Payment` capturé est **immuable** (corrections via remboursement/nouvelle transaction).
7. Publication d'un tournoi conditionnée par la checklist.
8. Isolation tenant : aucune entité privée accessible hors de son `organizationId`.

## 7. Duplication de tournoi

`duplicateTournament(source)` réutilise : format, règles, catégories, terrains, paramètres, branding.
**N'est jamais copié** : résultats, matchs joués, classements, paiements, historique (données actives ≠ archives). Le clone naît en `DRAFT`.
