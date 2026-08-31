# Gboroly — Documentation technique

> **Gboroly — The African Sports Tournament OS.**
> Plateforme SaaS de digitalisation et d'automatisation des tournois sportifs.
> Sport initial : **Maracana** — Marché initial : **Côte d'Ivoire** — Vision : plateforme africaine multisports.

Ce dossier `docs/` contient la documentation de référence du projet. Elle est produite en **PHASE 0 (Analyse & Architecture)** à partir des deux documents sources (`Gboroly_Cahier_des_charges_v1.0.pdf`, `Gboroly_Architecture_technique_v1.0.pdf`) et des maquettes.

> ⚠️ **Statut : PHASE 0 — aucun code n'a encore été écrit.** Ces documents décrivent l'architecture *cible*. Le développement (PHASE 1+) ne démarrera qu'après validation explicite.

## Index des documents

| Fichier | Contenu |
|---|---|
| [00-PHASE-0-ANALYSE.md](./00-PHASE-0-ANALYSE.md) | **⭐ Livrable central** : synthèse, incohérences, ambiguïtés, risques, et **décisions à valider** |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Architecture globale, monorepo, apps, packages, backend en couches, event-driven |
| [DATABASE.md](./DATABASE.md) | Schéma PostgreSQL complet : tables, colonnes, FK, enums, index, contraintes |
| [DOMAIN-MODEL.md](./DOMAIN-MODEL.md) | Modèle de domaine, agrégats, relations, cycles de vie / machines à états |
| [COMPETITION-ENGINE.md](./COMPETITION-ENGINE.md) | ⭐ Cœur technique : abstractions, formats, standings, tie-breakers, qualifications, bracket |
| [SCHEDULING.md](./SCHEDULING.md) | Générateur de calendrier, contraintes, édition manuelle |
| [API.md](./API.md) | API REST v1, conventions, endpoints, erreurs, pagination |
| [RBAC.md](./RBAC.md) | Rôles, permissions, matrice, guards, multi-tenancy |
| [REALTIME.md](./REALTIME.md) | WebSockets / Socket.IO, événements, rooms, stratégie temps réel |
| [PAYMENTS.md](./PAYMENTS.md) | Abstraction PaymentProvider, transactions, commissions, idempotence |
| [NOTIFICATIONS.md](./NOTIFICATIONS.md) | Abstraction NotificationProvider, canaux, WhatsApp, templates |
| [SECURITY.md](./SECURITY.md) | Auth, hashing, sessions, isolation tenant, audit, secrets |
| [TESTING.md](./TESTING.md) | Stratégie de tests, pyramide, E2E Golden Path, non-régression |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Environnements, Docker, CI/CD, variables d'environnement |
| [BUSINESS-RULES.md](./BUSINESS-RULES.md) | Règles métier : formats, classements, qualifications, paiements, inscriptions, cas limites |
| [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) | Charte, couleurs, typographie, composants, principes UX, mobile-first |
| [ROADMAP.md](./ROADMAP.md) | Roadmap par phases (0 → 14), MVP, critères de fin de phase |

## Documents sources (référence, ne pas modifier)

- `../Gboroly_Cahier_des_charges_v1.0.pdf`
- `../Gboroly_Architecture_technique_v1.0.pdf`
- `../Charte_Graphique_Gboroly.pdf`
- `../Maquette Gboroly PC.png`, `../Maquette Gboroly Mobile.png`
- `../Logo Gboroly Blanc.png`, `../Logo Gboroly Bleu.png`

## Principe directeur

> **La complexité est dans le logiciel, jamais dans la tête de l'utilisateur.**
> Le **Competition Engine** décide (qualifiés, points, vainqueur, match suivant, tie-break).
> Le **frontend** demande, affiche et permet d'agir — il ne décide jamais.
