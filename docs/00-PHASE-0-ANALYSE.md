# PHASE 0 — Analyse & Décisions à valider

> Ce document est le **livrable central de la Phase 0**. Il synthétise l'analyse des deux documents de référence, relève les **incohérences / ambiguïtés**, expose les **risques techniques**, et surtout liste les **décisions qui nécessitent une validation explicite avant de démarrer la PHASE 1**.

---

## 1. Ce qui est clair et non négociable (verrouillé)

Ces choix sont posés par les documents sources et ne sont pas remis en question :

- **Modular Monolith** (pas de microservices au départ), NestJS.
- **Monorepo** pnpm + Turborepo : `apps/{web,api,worker}` + `packages/{ui,config,types,validation,competition-engine,database,utils}`.
- **Stack** : Next.js + React + TS + Tailwind + RHF + Zod + TanStack Query + PWA / NestJS + TS / PostgreSQL + Prisma / Redis + BullMQ / S3 / Socket.IO / Docker.
- **Competition Engine** : package **framework-agnostic**, testable avec de simples données JSON, cœur du produit.
- **Frontend = présentation uniquement**. Aucune règle métier (classement, qualification, tie-break) dans React.
- **Multi-tenant** par `organization_id`, isolation stricte inter-organisations.
- **PostgreSQL = source de vérité**. Redis = cache/jobs, jamais source de vérité. Fichiers en S3, jamais en base.
- **Argon2id** pour le hash des mots de passe.
- **API REST versionnée** `/api/v1/`.
- **FCFA (XOF)** natif, architecture multi-devises.
- **WhatsApp** comme canal de communication privilégié (via abstraction).
- **Ordre des phases 0 → 14** imposé (voir [ROADMAP.md](./ROADMAP.md)).
- **Design system** : palette et typographie fixées (voir [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md)).

---

## 2. Incohérences & ambiguïtés relevées dans les documents sources

| # | Sujet | Constat | Proposition de résolution |
|---|---|---|---|
| A1 | **`Competition` vs `Category`** | Le modèle logique pose `Tournament → Category → Competition → Round → Group → Match`, mais la liste d'entités mélange parfois les deux et le MVP semble traiter « catégorie = compétition ». | Modéliser **`Competition` comme entité à part entière** rattachée 1‑N à `Category` (une catégorie a en général **une** compétition principale, mais le schéma autorise plusieurs, ex. phase de groupes + play-offs modélisés comme 2 compétitions liées). Pour le MVP : 1 Category → 1 Competition créée automatiquement. Détail dans [DOMAIN-MODEL.md](./DOMAIN-MODEL.md). |
| A2 | **`Round` de groupes vs `Round` de bracket** | « Round 1 = Groupes, Round 2 = Quarts… » traite groupes et phases finales comme des rounds homogènes, mais leurs structures diffèrent (groupes = mini-championnats ; knockout = arbre). | Un `Round` porte un `roundType` (`GROUP_STAGE`, `KNOCKOUT`, `ROUND_ROBIN`, `PLACEMENT`). Un round `GROUP_STAGE` contient des `Group`; un round `KNOCKOUT` contient des matchs reliés par `feedsInto`. Voir [COMPETITION-ENGINE.md](./COMPETITION-ENGINE.md). |
| A2b | **`GroupTeam` vs `Standing`** | Deux notions proches : position d'une équipe dans un groupe, et ligne de classement calculée. | `GroupTeam` = **appartenance + seed** (donnée d'entrée). `Standing` = **ligne calculée** (donnée dérivée, recalculable). Ne jamais confondre. |
| A3 | **Frais d'inscription : par tournoi ou par catégorie ?** | `Tournament.registrationFee` existe, mais chaque catégorie « peut avoir ses propres paramètres ». | Autoriser un `registrationFee` **au niveau catégorie** qui *surcharge* celui du tournoi (nullable → hérite du tournoi). |
| A4 | **`Team` rattachée à l'organisation ou au tournoi ?** | `Team.organizationId` suggère un référentiel d'équipes par organisation, mais une équipe s'inscrit à un tournoi via `Registration`. | Confirmer le modèle : **`Team` = référentiel réutilisable au niveau organisation**, la participation à un tournoi passe par `Registration`. Une équipe peut ainsi rejouer d'un tournoi à l'autre (utile pour l'historique et la marketplace). ⚠️ Voir décision **D2**. |
| A5 | **Joueur : global ou par organisation ?** | Le doc dit « le joueur ne doit pas être enfermé dans un seul tournoi » et introduit `TeamPlayer`. Mais où vit le `Player` : au niveau org, ou global plateforme ? | MVP : `Player.organizationId` (référentiel par organisation) + relation `TeamPlayer` (historique). L'identité **globale cross-organisation** (profil public joueur, marketplace) est repoussée en Phase 14. Voir **D3**. |
| A6 | **Statuts d'équipe : deux listes différentes** | Cahier des charges §7 : `Brouillon, Invitation envoyée, Inscription en attente, Validée, Paiement en attente, Payée, Refusée, Suspendue, Éliminée, Forfait`. Ces statuts mélangent **statut d'équipe**, **statut d'inscription** et **statut de paiement**. | Séparer en **3 axes** : `Team.status` (ACTIVE/SUSPENDED/ARCHIVED), `Registration.status` (DRAFT/INVITED/PENDING/APPROVED/REJECTED/WITHDRAWN), `Registration.paymentStatus` (UNPAID/PARTIAL/PAID/REFUNDED). `ELIMINATED`/`FORFEIT` sont des états **de compétition** (au niveau participation/match), pas d'équipe. Détail dans [BUSINESS-RULES.md](./BUSINESS-RULES.md). |
| A7 | **Statuts de match : `READY`, `HALFTIME`** | La liste inclut `READY` et `HALFTIME` en plus de `SCHEDULED/LIVE/FINISHED/...`. `HALFTIME` est spécifique au football/maracana. | Garder un enum générique `SCHEDULED, LIVE, PAUSED, FINISHED, POSTPONED, CANCELLED, FORFEIT` + un champ `period`/`clock` optionnel piloté par les `SportRules`. `HALFTIME` = `PAUSED` + `period=HT`. |
| A8 | **`MatchTeam` (jointure) vs `homeTeamId`/`awayTeamId`** | La liste d'entités contient `MatchTeam`, mais `Match` a déjà `homeTeamId`/`awayTeamId`. | Pour des sports à 2 équipes (maracana/foot), **`homeTeamId`/`awayTeamId` directement sur `Match`** suffisent (plus simple, plus rapide). `MatchTeam` (N participants) est repoussé au support multisport avancé. Voir **D4**. |
| A9 | **REST vs GraphQL** | Cahier §38 : « REST ou GraphQL ». Archi technique : **REST v1** partout. | Trancher **REST** (aligné avec l'archi technique et NestJS). GraphQL non retenu pour le MVP. |
| A10 | **`FormatTemplate` vs `TournamentFormat` vs `SportRuleSet`** | Trois notions de configuration cohabitent. | `Sport` porte les `SportRules` (code, pas table). `FormatTemplate` = **presets réutilisables** (8→2 groupes de 4, etc.) stockés en base. La config *effective* d'une compétition vit dans `Competition.formatConfig` (JSON validé par Zod). |
| A11 | **Live/HALFTIME chrono** | Le cahier veut « temps » affiché en live, mais aucune horloge serveur n'est spécifiée. | MVP : **pas d'horloge de match temps réel serveur**. La minute d'un événement est saisie par l'opérateur (`MatchEvent.minute`). Un chrono visuel côté client est cosmétique. |
| A12 | **Numérotation slug** | Slugs sur `Organization`, `Tournament`, `Team`. Risque de collision et de fuite d'info inter-tenant. | Slugs **uniques par scope** : `tournament.slug` unique (public, global) ; `team.slug` unique **par organisation**. Slugs générés + suffixe court anti-collision. |

---

## 3. Risques techniques majeurs

| # | Risque | Impact | Mitigation |
|---|---|---|---|
| R1 | **Complexité du Competition Engine** (formats, tie-breakers head-to-head, double élimination, qualifications configurables). | Élevé — c'est le cœur. Bugs = classements/qualifications faux = perte de confiance. | Package isolé, 100% pur (aucun I/O), **couverture de tests très élevée**, développé avant toute UI (Phase 6). Head-to-head et double élimination = zones à tester exhaustivement. |
| R2 | **Cohérence transactionnelle du « Finish Match »** (match → events → result → standings → qualification → next round → realtime). | Élevé — données incohérentes si échec partiel. | Transaction PostgreSQL englobant la persistance ; **Outbox pattern** pour realtime/notifications (pas dans la même transaction que les side-effects réseau). Optimistic locking sur `Match`. |
| R3 | **Concurrence** : deux opérateurs modifient le même match. | Moyen. | `version` (optimistic lock) sur `Match`, vérification de statut, audit log, verrouillage logique côté UI. |
| R4 | **Connectivité africaine faible** (opérateur sur le terrain). | Élevé UX. | Payloads réduits, Match Day ultra-léger, retry, mutation queue côté client, PWA. **Offline complet non-MVP** (noté dans le cahier). Voir **D6**. |
| R5 | **Idempotence des paiements** (Mobile Money, double soumission). | Élevé (financier). | `Idempotency-Key` obligatoire, contrainte d'unicité sur `(provider, providerTxnRef)`, webhooks idempotents. |
| R6 | **Génération de calendrier sur-contrainte** (peu de terrains, beaucoup d'équipes, multi-catégories, multi-jours). | Moyen. | Générateur **best-effort** avec relâchement de contraintes + rapport de conflits + édition manuelle. Ne pas viser l'optimalité (NP-difficile) au MVP. |
| R7 | **Volume de messages WhatsApp / coûts / conformité API** (Meta Cloud API vs non-officiel). | Moyen (métier + légal). | Abstraction `NotificationProvider`; démarrer par **notifications in-app + email + liens `wa.me` cliquables** (gratuit, sans API), API WhatsApp officielle en option payante ultérieure. Voir **D5**. |
| R8 | **Coût & disponibilité des intégrations Mobile Money** (Wave/OM/MTN/Moov) selon pays. | Moyen. | Démarrer **paiement manuel** (cash/reçu) au MVP, providers en ligne branchés progressivement derrière l'abstraction. |
| R9 | **PII & RGPD-like** (photos joueurs, téléphones, mineurs U17/U20). | Moyen (légal). | Confidentialité paramétrable par joueur, minimisation, consentement, soft-delete + purge. Attention aux **mineurs** (catégories U17). |

---

## 4. ⭐ Décisions nécessitant TA validation

> Pour chacune, une **recommandation par défaut** est proposée. Sans retour de ta part, la PHASE 1 démarrera sur ces valeurs par défaut.

### D1 — Emplacement du repository
Le monorepo sera initialisé dans **`C:\Users\Mon ordi\Documents\Gboroly`** (dossier existant contenant déjà les PDF/maquettes), avec la doc dans `docs/`.
**Recommandation :** ✅ garder ce dossier comme racine du monorepo. *(Alternative : dossier dédié `Documents\gboroly-app` séparé des assets.)*

### D2 — `Team` au niveau organisation (référentiel réutilisable)
**Recommandation :** ✅ `Team.organizationId`, participation via `Registration`. Permet historique + duplication de tournoi + future marketplace.

### D3 — Identité joueur : par organisation au MVP
**Recommandation :** ✅ `Player.organizationId` + `TeamPlayer` (historique). Profil joueur **global cross-plateforme** repoussé en Phase 14 (marketplace).

### D4 — Matchs à 2 équipes (home/away) au MVP
**Recommandation :** ✅ `homeTeamId`/`awayTeamId` sur `Match`. Support N-participants (`MatchTeam`) = multisport avancé, hors MVP.

### D5 — Stratégie WhatsApp au lancement
**Recommandation :** ✅ démarrer **liens `wa.me` + templates copiables + notifications in-app/email**, sans API payante. Brancher l'**API WhatsApp Cloud officielle (Meta)** en Phase 11+ si budget validé.
*Question ouverte : as-tu déjà un compte WhatsApp Business API / budget dédié ?*

### D6 — Niveau d'offline visé au MVP
**Recommandation :** ✅ **PWA + cache lecture + file de mutations résiliente** sur le Match Day (retry), **sans** synchronisation offline complète (conforme à la note « offline complet non obligatoire pour le MVP »).

### D7 — Modèle économique activé au MVP
Le cahier propose 3 modèles (paiement par tournoi / abonnement / commission).
**Recommandation :** ✅ MVP **gratuit pour l'organisateur** + suivi des **paiements d'inscription (manuel)**. Les tables `Subscription`/`commission` sont **prévues** mais non activées. Décider du modèle facturé plus tard.
*Question ouverte : quel modèle veux-tu tester en premier sur le marché ivoirien ?*

### D8 — Hébergement / déploiement cible ✅ ARRÊTÉE (2026-08-31)
**Stack confirmée : Supabase + Vercel + conteneurs + GitHub** (architecture NestJS conservée).
- **Supabase** = Postgres managé (+ Storage S3-compatible). Prisma via pooler → `DATABASE_URL` (6543) + `DIRECT_URL` (5432).
- **Vercel** = web Next.js. **API NestJS + worker BullMQ** = hébergeur conteneurs (Railway/Render/Fly). **Redis** = Upstash. **CI** = GitHub Actions.
- **Auth** : reste **custom NestJS** (Argon2id/JWT) — Supabase Auth non utilisé.
Détail dans [DEPLOYMENT.md](./DEPLOYMENT.md).

### D9 — Gestion des sessions : JWT stateless vs sessions serveur
**Recommandation :** ✅ **Access token JWT court (15 min) + Refresh token rotatif** stocké en base (`RefreshToken` révocable), cookie `httpOnly`+`Secure`+`SameSite`. Permet révocation et « déconnexion partout ».

### D10 — Langue par défaut & i18n
**Recommandation :** ✅ **Français par défaut**, architecture i18n prête (fr/en) dès le départ, autres langues plus tard. UI et contenus publics traduisibles.

---

## 5. Dépendances entre modules (ordre technique)

```
auth ──▶ organizations/RBAC ──▶ tournaments ──▶ teams/players/registrations
                                                        │
                                          competition-engine (package pur)
                                                        │
                                     matches ──▶ scheduling ──▶ public pages
                                                        │
                                     realtime ──▶ notifications ──▶ payments
```

- `competition-engine` ne dépend de **rien** (ni DB, ni NestJS). Il est consommé par le module `competitions`/`matches` côté API.
- `standings`, `bracket`, `qualifications` sont des **dérivés** du moteur, jamais des sources indépendantes.
- `realtime` et `notifications` sont **déclenchés par des événements de domaine** (`MatchFinished`, etc.) via l'outbox — pas d'appel direct depuis les use cases critiques.

---

## 6. Définition du MVP (rappel — « Golden Path »)

Le MVP est atteint quand **un organisateur, sans Excel ni papier**, peut dérouler intégralement :

```
Créer organisation → Créer tournoi → Créer catégorie → Ajouter équipes → Ajouter joueurs
→ Configurer format → Générer groupes → Générer calendrier → Affecter terrains
→ Démarrer match → Ajouter but → Terminer match → Calculer classement
→ Déterminer qualifiés → Générer phase suivante → Publier résultat → Public consulte
```

Ce scénario est le **test E2E de référence** (voir [TESTING.md](./TESTING.md)).

---

## 7. Livrables produits en Phase 0

Tous les documents listés dans [README.md](./README.md) sont produits. Le schéma de base complet ([DATABASE.md](./DATABASE.md)) et l'architecture du moteur ([COMPETITION-ENGINE.md](./COMPETITION-ENGINE.md)) constituent les fondations à valider en priorité.

**➡️ Prochaine étape : ta validation de ces décisions (D1–D10) et de l'architecture, avant démarrage de la PHASE 1 (Fondations).**
