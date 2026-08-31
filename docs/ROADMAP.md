# ROADMAP — Plan de développement par phases

> Ordre **imposé**. Chaque phase = analyser → développer → tester → intégrer → valider → documenter → non-régression. Aucune phase n'est terminée juste parce que le code compile.

## Vue d'ensemble

| Phase | Contenu | Priorité |
|---|---|---|
| **0** | ⭐ Analyse & architecture (ce dossier `docs/`) — **en cours de validation** | — |
| **1** | Fondations : monorepo, Next.js, NestJS, PostgreSQL/Prisma, Redis, Docker, CI, Design System | P0 |
| **2** | Authentification : register/login/logout/refresh, forgot/reset, vérif email/téléphone, RBAC | P0 |
| **3** | Organisations : Organization, membres, rôles, permissions, invitations | P0 |
| **4** | Tournois : create/edit, wizard, catégories, visibilité, publication (checklist) | P0 |
| **5** | Équipes / Joueurs : teams, players, TeamPlayer, registrations, approbations | P0 |
| **6** | ⭐ **Competition Engine** : formats, groups, rounds, fixtures, standings, tie-breakers, qualifications, bracket. **Ne pas avancer tant que les tests ne sont pas solides.** | P0 |
| **7** | Matchs : Match, Match Day, events, score, officials, forfait, report, annulation | P0 |
| **8** | Calendrier : ScheduleGenerator, venues/fields, contraintes, édition manuelle | P0 |
| **9** | Pages publiques : tournoi, matchs, résultats, classement, équipes, joueurs, bracket, stats | P0 |
| **10** | Temps réel : WebSockets, live score, live events, live standings | P0 (finalise le cœur) |
| **11** | Communication : notifications, email, WhatsApp (abstraction), annonces | P1 |
| **12** | Paiements : abstraction, manuel & en ligne, transactions, commissions | P1 |
| **13** | Avancé : sponsors, stats avancées, exports/imports, QR codes, duplication, analytics | P1/P2 |
| **14** | Marketplace : découverte de tournois, inscription équipe, paiement en ligne, commission, profils publics, historique | P2 |

## Priorités (rappel du cahier)

- **P0 (bloquant)** : auth, organisations, tournoi, équipes, joueurs, moteur, matchs, calendrier, résultats, classement, bracket, page publique.
- **P1 (important)** : inscriptions publiques, paiements, notifications, WhatsApp, statistiques, arbitres, sponsors.
- **P2 (évolution)** : marketplace, commission, profils publics, palmarès, multisport avancé, apps natives.

## MVP = Golden Path

À la fin du MVP (fin Phase 10 environ), un organisateur peut, **sans Excel ni papier** :

```
1. Créer son organisation      6. Générer les groupes         11. Calculer les classements
2. Créer son tournoi           7. Générer le calendrier        12. Déterminer les qualifiés
3. Choisir son format          8. Affecter terrains/arbitres   13. Générer les phases finales
4. Ajouter ses équipes         9. Jouer les matchs             14. Publier les résultats
5. Ajouter les joueurs        10. Saisir les scores            15. Public suit le tournoi
```

Si ce workflow fonctionne parfaitement, **Gboroly a son cœur de produit** ; tout le reste s'ajoute autour.

## Critère de fin de phase (checklist)

```
[ ] Fonctionnalité implémentée
[ ] Tests unitaires
[ ] Tests d'intégration
[ ] Tests E2E (si pertinent)
[ ] Typecheck   [ ] Lint   [ ] Build
[ ] Documentation mise à jour (docs/ + CHANGELOG)
[ ] Sécurité vérifiée
[ ] Non-régression vérifiée (pnpm lint/typecheck/test/test:e2e/build)
```

## Documentation à maintenir en continu

`README · ARCHITECTURE · DATABASE · DOMAIN-MODEL · COMPETITION-ENGINE · SCHEDULING · API · RBAC · REALTIME · PAYMENTS · NOTIFICATIONS · SECURITY · TESTING · DEPLOYMENT · BUSINESS-RULES · DESIGN-SYSTEM · CHANGELOG`.

## Prochaine action

**Validation de la Phase 0** (décisions D1–D10 dans [00-PHASE-0-ANALYSE.md](./00-PHASE-0-ANALYSE.md)) **avant** de démarrer la Phase 1. Ne pas commencer la Phase 1 sans accord explicite.
