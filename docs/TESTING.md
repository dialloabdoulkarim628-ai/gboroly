# TESTING — Stratégie de tests

> Une phase n'est jamais « terminée » parce que le code compile. Le **Competition Engine** doit avoir une couverture **très élevée**.

## 1. Pyramide

| Niveau | Outil (proposé) | Cible |
|---|---|---|
| **Unit** | Vitest/Jest | `competition-engine` (prioritaire), `utils`, `validation`, services domaine |
| **Integration** | Jest + Testcontainers (Postgres) | use cases API + Prisma (inscription, paiement, création tournoi, finish match) |
| **E2E** | Playwright | Golden Path complet (UI + API + DB) |
| **Contract** | Zod schemas partagés | cohérence front/back |

## 2. Competition Engine — tests obligatoires

```
Round Robin      · fixtures = n(n-1)/2, chaque équipe n-1 matchs, nb impair (bye)
Group Stage      · partition, standings par groupe, tailles inégales
Single Elim.     · arbre, advanceTeams, finale
Double Elim.     · winner/loser bracket, grande finale + reset
Standings        · played/W/D/L/GF/GA/GD/points corrects
Tie Breakers     · points>gd>gf>headToHead>fairPlay>draw(seed) — chaque niveau isolé
Qualification    · mapping A1/B2, meilleurs 3es, règles configurables
Bracket          · résolution des slots "vainqueur QF1"/"2e Groupe B"
Forfeit          · score administratif, impact classement/qualif, pas de double comptage
Draw / Penalty   · match nul knockout → prolongation/tirs au but
Reschedule       · report sans corruption du reste
Team Withdrawal  · walkover + recalcul
Recalculate      · idempotent (2 runs = même état)
```

Le moteur est **pur** → tests rapides, déterministes, sur données JSON (l'heure est injectée, pas `Date.now()`).

## 3. Intégration (API + DB)

- Inscription équipe (statuts, unicité `(categoryId, teamId)`).
- Paiement (idempotence : double POST = un seul Payment).
- Finish match transactionnel (rollback si étape échoue ; standings/qualifs cohérents).
- RBAC & isolation tenant (un membre org A n'accède pas aux données org B → 403/404).

## 4. E2E — Golden Path (test de référence)

```
Create Organization → Create Tournament → Create Category
   → Add Teams → Add Players → Configure Format
   → Generate Groups → Generate Schedule → Assign Fields
   → Start Match → Add Goal → Finish Match
   → Calculate Standings → Determine Qualified Teams
   → Generate Next Round → Publish Result
   → Public user views tournament (sans compte)
```
Ce scénario **doit fonctionner de bout en bout** avant de considérer le MVP fonctionnel.

## 5. Cas limites (à couvrir aux niveaux appropriés)

nombre impair d'équipes · équipe retirée · forfait · match nul · égalité parfaite · changement de terrain/heure · match reporté · équipe ajoutée tardivement · joueur suspendu · paiement partiel · paiement annulé · tournoi multi-catégories · multi-terrains · multi-jours · réseau instable (mutations en file/retry).

## 6. Non-régression (après chaque fonctionnalité)

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```
Aucune fonctionnalité existante ne doit être cassée. Une phase est terminée uniquement si :
**Feature + Unit + Integration + E2E (si pertinent) + Typecheck + Lint + Build + Docs à jour + Sécurité vérifiée + Non-régression.**

## 7. Données de test

Seed reproductible (voir [DATABASE.md](./DATABASE.md)) : org démo, sport maracana, 16 équipes / 4 groupes de 4, calendrier généré. Les données de test ne sont **jamais** mélangées à la production (voir [DEPLOYMENT.md](./DEPLOYMENT.md)).
