# SCHEDULING — Génération de calendrier

> Le moteur de compétition produit les **appariements** (qui joue qui). Le `ScheduleGenerator` leur attribue **date, heure, terrain** sous contraintes. Best-effort (pas d'optimalité garantie — problème NP-difficile). Édition manuelle toujours possible.

## 1. Entrées

```ts
interface ScheduleInput {
  matches: MatchRef[];              // appariements du moteur (groupes + knockout planifiables)
  fields: Field[];                  // terrains + disponibilités
  tournamentDays: DateRange[];      // jours du tournoi
  startTime: string; endTime: string;
  matchDuration: number;            // minutes
  breakDuration: number;            // entre 2 matchs sur un terrain
  restConstraint: number;          // repos min. d'une équipe entre 2 de ses matchs
  refereeAvailability?: Availability[];
  categoryConstraints?: ...;        // ex. ne pas chevaucher 2 catégories sur 1 terrain
}
```

## 2. Contraintes (à éviter autant que possible)

1. Deux matchs **simultanés** pour une même équipe.
2. **Repos insuffisant** entre deux matchs d'une équipe.
3. **Conflit de terrain** (deux matchs même terrain même créneau).
4. **Conflit d'arbitre** (si arbitres affectés au moment de la génération).
5. **Terrain indisponible** (hors fenêtre de dispo).
6. **Surcharge** d'un terrain (répartition équilibrée).

Les contraintes 1–3 et 5 sont **dures** (jamais violées). 4 et 6 sont **souples** (minimisées, signalées si non satisfaites).

## 3. Algorithme (MVP — heuristique gloutonne)

```
1. Ordonner les matchs (round puis groupe ; knockout après phases de groupes).
2. Générer les créneaux disponibles par terrain (jour × [start,end] / (matchDuration+break)).
3. Pour chaque match, choisir le premier créneau faisable :
     - terrain disponible,
     - aucune équipe déjà occupée à ce créneau,
     - repos min. respecté pour les 2 équipes,
     - (souple) arbitre dispo, équilibrage terrain.
4. Si aucun créneau faisable → relâcher les contraintes souples, sinon marquer "à placer".
5. Produire un rapport : matchs placés, conflits résiduels, matchs non placés.
```

Amélioration ultérieure possible (P2) : recherche locale / backtracking limité pour réduire les conflits souples. Pas nécessaire au MVP.

## 4. Sortie

```ts
interface ScheduleResult {
  scheduled: { matchId; fieldId; scheduledAt }[];
  unplaced: { matchId; reason }[];
  conflicts: { matchId; type; detail }[];   // souples non satisfaites
}
```

Exécution : **job worker asynchrone** (`schedule` queue) pour les gros tournois ; petit tournoi = synchrone possible. Résultat appliqué en base (matchs mis à jour), puis l'organisateur ajuste.

## 5. Édition manuelle (automatisation avec contrôle)

L'organisateur peut : déplacer un match (date/heure/terrain), échanger deux matchs, réordonner, réaffecter arbitre. Chaque déplacement :
- revalide les contraintes dures (refus si conflit terrain/équipe) ;
- affiche un avertissement si contrainte souple violée ;
- écrit un `AuditLog(MATCH_POSTPONED/…)` et émet `tournament.updated` (realtime + revalidation page publique).

## 6. Multi-jours / multi-catégories / multi-terrains

- Multi-jours : créneaux répartis sur `tournamentDays`.
- Multi-catégories : mêmes terrains partagés ; contrainte de non-chevauchement configurable.
- Knockout : planifié après que les phases de groupes soient jouables ; les dates des tours finaux peuvent rester provisoires tant que les qualifiés ne sont pas connus (slots « vainqueur QF1 »).

## 7. Non-régression (tests)

- Aucune équipe à deux endroits en même temps.
- Aucun double-booking de terrain.
- Repos minimal respecté.
- Report d'un match → recalcul cohérent, pas de corruption des autres créneaux.
- Tournoi sur-contraint → dégradation propre (rapport de conflits, pas de crash).

## Implémentation (Phase 8)

- **Module pur** `apps/api/src/scheduling/schedule-generator.ts` (`generateSchedule(matches, fieldIds, config)`), 6 tests unitaires — aucune dépendance DB. Greedy chronologique : génère les créneaux (jour×terrain×heure, pas = durée + pause), puis affecte chaque match (priorité = `round.order`×1000 + `match.order`) au premier créneau libre où **les deux équipes** respectent le repos minimal (`teamIsFree`). Best-effort : les matchs non plaçables sont renvoyés (`NO_FIELD` / `NO_FEASIBLE_SLOT`) plutôt que forcés.
- Contraintes **dures** appliquées : 1 (simultané équipe), 2 (repos), 3 (1 match/créneau/terrain). Arbitres (4) et équilibrage (6) : non traités au MVP (édition manuelle possible).
- **Service** `scheduling.service.ts` : lit les matchs planifiables (SCHEDULED, 2 équipes connues) + `Field` du tournoi, applique `scheduledAt`/`fieldId`/`venueId` en transaction (sauf `dryRun`).
- **Édition manuelle** : `PATCH /matches/:id/schedule` (Phase 7) — « automatisation avec contrôle ».
- Endpoint : `POST /competitions/:competitionId/schedule` (RBAC `schedule.generate`).
