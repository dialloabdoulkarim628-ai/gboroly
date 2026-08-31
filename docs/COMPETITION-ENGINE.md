# COMPETITION-ENGINE — Le cœur technique de Gboroly

> ⭐ **Phase la plus importante (Phase 6).** Package `packages/competition-engine`. **Aucune** dépendance à Prisma, NestJS, React. Fonctions **pures**, entrées/sorties = données sérialisables (JSON). Couverture de tests **très élevée**. Développé et testé **avant** toute UI.

## 1. Principe

Le moteur ne connaît **ni la base, ni HTTP, ni le sport en dur**. Il reçoit des données de compétition, applique des règles, et renvoie des résultats déterministes.

```
Input JSON (competition config + registrations + results)
        │
   Competition Engine (pur, déterministe)
        │
Output JSON (fixtures | standings | qualified teams | bracket | next round)
```

**Règle d'or :** le frontend ne décide jamais qui est qualifié, combien de points, qui gagne, ni quel match vient ensuite. Le moteur décide.

## 2. API publique du package

```ts
// Toutes pures : (input) => output, sans effet de bord.
createCompetition(config: CompetitionConfig): Competition
generateFixtures(competition: Competition, teams: TeamRef[]): Match[]
recordResult(match: Match, result: MatchResult): Match           // validation + normalisation
calculateStandings(competition, matches, rules): Standing[]
applyTieBreakers(standings, matches, rules): Standing[]           // ordre configurable
determineQualifiedTeams(round, standings, rules): Qualification[]
generateBracket(rounds: Round[], seeds: Seeding): BracketNode[]
advanceTeams(bracket, results): BracketNode[]                    // résout "vainqueur QF1", etc.
handleForfeit(match, forfeitingTeam, rules): Match               // score administratif
recalculateCompetition(competition, matches, rules): CompetitionState  // recompute complet idempotent
```

## 3. Abstraction des formats

```ts
interface CompetitionFormat {
  readonly type: FormatType;
  generateStructure(config): { rounds: Round[]; groups: Group[] };
  generateFixtures(structure, teams): Match[];
  onResultRecorded(state, match): StateChange;   // quels dérivés recalculer
  computeStandings(state, matches, rules): Standing[];
  resolveQualifications(round, standings, rules): Qualification[];
}
```

Implémentations concrètes (MVP → avancé) :

| Format | MVP | Notes |
|---|---|---|
| `RoundRobinFormat` | ✅ | championnat simple/aller-retour |
| `GroupStageFormat` | ✅ | N groupes de M équipes |
| `SingleEliminationFormat` | ✅ | arbre knockout |
| `GroupToPlayoffsFormat` | ✅ | groupes → knockout (le plus courant maracana) |
| `DoubleEliminationFormat` | ⚠️ P1 | winner/loser bracket — tests exhaustifs requis |
| `CustomCompetitionFormat` | P2 | composition libre de rounds |

## 4. Abstraction du sport (`SportRules`)

```ts
interface SportRules {
  readonly sportKey: string;
  pointsFor(result: MatchOutcome): number;        // win/draw/loss/forfeit
  isDraw(match): boolean;
  calculateStatistics(events: MatchEvent[]): TeamStats;
  handleOvertime?(match): MatchResult;
  handlePenaltyShootout?(match): MatchResult;
  standingColumns(): StandingColumn[];             // colonnes affichées selon le sport
  enabledEventTypes(): MatchEventType[];
}
```

`MaracanaRules` = première implémentation : `win=3, draw=1, loss=0`, buts, cartons, tirs au but activés. Un autre sport = une nouvelle implémentation, **sans toucher au moteur**.

## 5. Classement (Standings)

Colonnes calculées : `played, wins, draws, losses, goalsFor, goalsAgainst, goalDifference, points, fairPlayPoints, position`.

Le classement est **toujours dérivé** des matchs `FINISHED`. Jamais stocké comme source. La table `Standing` est un **cache matérialisé** recalculable à tout moment (`recalculateCompetition`).

## 6. Tie-breakers (ordre configurable)

Ordre par défaut (surchargeable par catégorie via `rulesConfig`) :

```
1. points
2. goalDifference
3. goalsFor
4. headToHead        (mini-classement entre équipes à égalité — attention aux boucles)
5. fairPlay          (moins de cartons = mieux)
6. randomDraw        (tirage — dernier recours, doit être reproductible via seed)
```

⚠️ **Head-to-head** : calcul restreint aux confrontations directes entre les équipes encore à égalité ; si l'égalité persiste sur un sous-groupe > 2, appliquer la règle sur le sous-groupe puis redescendre. Zone de test critique.
⚠️ **randomDraw** : doit être **déterministe** (seed stocké) pour être reproductible et auditable.

## 7. Qualifications

Le moteur classe automatiquement 1er/2e… de chaque groupe et les **injecte** dans les rounds suivants selon `qualificationRules` :

```
1er Groupe A ─┐
              ├─▶ QF1 = A1 vs B2
2e  Groupe B ─┘
1er Groupe B ─┐
              ├─▶ QF2 = B1 vs A2
2e  Groupe A ─┘
```

`qualificationRules` (JSON) décrit : combien de qualifiés par groupe, meilleurs 3es éventuels, mapping vers les slots du round suivant. Configurable, jamais codé en dur.

## 8. Bracket

Le bracket **n'est pas** un système séparé : c'est la **représentation** des rounds knockout du moteur.

```
Competition Engine → Rounds(KNOCKOUT) → BracketNode[] (graphe feedsInto)
```

Chaque `Match` knockout référence `homeSourceRef`/`awaySourceRef` (« vainqueur QF1 », « 2e Groupe B ») tant que l'équipe réelle n'est pas résolue, puis `advanceTeams` remplit `homeTeamId`/`awayTeamId` et `feedsIntoMatchId`.

## 9. Chaîne « Finish Match » (transactionnelle)

Orchestrée côté API (le moteur fournit les calculs purs) :

```
Finish Match
  BEGIN (transaction PostgreSQL)
    persist match (status=FINISHED, scores, winner)
    persist match events
    standings = engine.calculateStandings(...) ; engine.applyTieBreakers(...)  → upsert Standing
    qualifs   = engine.determineQualifiedTeams(...)                            → advanceTeams → maj matchs suivants
    write OutboxEvent(MatchFinished)
  COMMIT   (ou ROLLBACK si une étape échoue)
        │
   Worker (hors transaction) : realtime · notifications · public page revalidate
```

Idempotence : `recalculateCompetition` peut être rejoué sans effet de bord divergent (recompute déterministe).

## 10. Cas limites que le moteur DOIT gérer (→ tests)

- Nombre **impair** d'équipes (round robin avec « bye »).
- **Forfait** : score administratif + impact classement + effet sur qualification.
- **Match nul** interdit en knockout → prolongation / tirs au but.
- **Égalité parfaite** au classement (tous les critères épuisés → tirage reproductible).
- **Retrait d'une équipe** en cours (walkover des matchs restants, recalcul).
- **Report / annulation** d'un match (classement provisoire cohérent).
- **Équipe ajoutée tardivement** (avant génération des fixtures uniquement, sinon procédure spéciale).
- Groupes de tailles **inégales** (ex. 3+3+2).
- **Double élimination** : parcours winner/loser bracket, grande finale avec reset.

## 11. Contrats de test (extrait)

```
describe RoundRobin: fixtures count = n(n-1)/2 ; chaque équipe joue n-1 matchs
describe GroupStage: partition correcte ; standings par groupe
describe TieBreakers: points > gd > gf > h2h > fairplay > draw(seed) — chaque niveau isolé
describe Qualification: mapping A1/B2 exact ; meilleurs 3es
describe Bracket: advanceTeams résout les slots ; finale = dernier round
describe Forfeit: score administratif ; pas de double comptage
describe Recalculate: idempotent (2 exécutions = même état)
```

Voir [TESTING.md](./TESTING.md) pour la stratégie complète.

## 11bis. Implémentation (Phase 6)

Modules du package `packages/competition-engine` (tous purs, 26 tests) :

| Fichier | Contenu |
|---|---|
| `fixtures.ts` | Round robin (cercle), byes pour nombre impair |
| `standings.ts` | Calcul du classement (dérivé des matchs terminés) |
| `tiebreakers.ts` | Départages configurables (points > diff > BP > confrontation directe > fair-play > tirage seedé) |
| `groups.ts` | Distribution "serpent" en N groupes, fixtures de poules, classement par groupe |
| `knockout.ts` | `seedOrder` standard, single elimination, byes, `advanceKnockout`, `resolveWinner` (score → tirs au but) |
| `qualifications.ts` | `determineQualifiedTeams` : N/groupe + meilleurs Nes (repêchage cross-groupe) |
| `group-to-playoffs.ts` | Orchestration poules → qualifiés → phases finales |
| `double-elimination.ts` | Winner/Loser brackets + grande finale (tailles 4 et 8) |
| `forfeit.ts` | `applyForfeit` : score administratif, impact classement |
| `bracket.ts` | `buildBracketView` : vue d'affichage (labels de slots non résolus) |

**Chaînage bracket** : `EngineMatch.homeSourceRef/awaySourceRef` encodent l'origine d'un slot (`seed:3`, `group:A#2`, `winner:<id>`, `loser:<id>`) ; `feedsIntoMatchId/Slot` (et `loserFeedsInto*` en double élim) chaînent les matchs ; `advanceKnockout`/`advanceDoubleElimination` résolvent les slots dès qu'un vainqueur est connu — **idempotents**.

**Limites assumées (MVP)** : double élimination pour 4/8 équipes (tailles courantes) ; le seeding group→playoffs est une heuristique (croisement vainqueurs/2es) que l'organisateur peut ajuster manuellement (automatisation avec contrôle). Head-to-head restreint aux paires ; sous-groupes >2 à égalité = amélioration ultérieure.

## 12. Ce que le moteur ne fait PAS

- Pas d'accès base / réseau / date système (l'heure est passée en paramètre → tests déterministes).
- Pas de règle de sport codée en dur hors des `SportRules`.
- Pas de génération de calendrier horaire (c'est le `ScheduleGenerator`, voir [SCHEDULING.md](./SCHEDULING.md)) — le moteur produit les **appariements**, le scheduler leur donne **date/heure/terrain**.
