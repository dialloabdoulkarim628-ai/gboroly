# API — REST v1

> API REST versionnée `/api/v1/`. NestJS. Validation Zod/DTO à l'entrée. Aucune confiance au frontend. GraphQL non retenu au MVP (décision A9).

## 1. Conventions

- **Base** : `/api/v1`.
- **Auth** : `Authorization: Bearer <accessToken>` (JWT court) + refresh via cookie httpOnly. Voir [SECURITY.md](./SECURITY.md).
- **Tenant** : l'organisation active est déduite du token / header `X-Organization-Id` **vérifié** contre les memberships (jamais confiance aveugle).
- **Idempotence** : header `Idempotency-Key` obligatoire sur `POST /payments` et opérations critiques.
- **Pagination** : `?page=&pageSize=` (max 100) → réponse `{ data, meta:{ page, pageSize, total } }`. Curseur pour gros volumes (`?cursor=`).
- **Filtrage/tri** : `?status=&sort=scheduledAt:asc`.
- **Réponses** : JSON `{ data }` ou `{ error: { code, message, details } }`.
- **Validation** : `Frontend(Zod) → API → DTO validation → Domain validation → DB`.

## 2. Auth
```
POST   /auth/register
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
POST   /auth/forgot-password
POST   /auth/reset-password
POST   /auth/verify-email
POST   /auth/verify-phone         # OTP
GET    /auth/me
```

## 3. Organisations, membres, RBAC
```
POST   /organizations
GET    /organizations/:id
PATCH  /organizations/:id
GET    /organizations/:id/members
POST   /organizations/:id/invitations
POST   /invitations/:token/accept
PATCH  /organizations/:id/members/:memberId       # rôle
DELETE /organizations/:id/members/:memberId
GET    /roles                                     # rôles + permissions
```

## 4. Tournois & configuration
```
GET    /tournaments                               # de l'org active
POST   /tournaments                               # wizard: brouillon
GET    /tournaments/:id
PATCH  /tournaments/:id
POST   /tournaments/:id/publish                   # checklist requise
POST   /tournaments/:id/duplicate
DELETE /tournaments/:id                           # soft-delete

POST   /tournaments/:id/categories
PATCH  /categories/:id
POST   /tournaments/:id/venues
POST   /venues/:id/fields
POST   /tournaments/:id/referees
POST   /tournaments/:id/sponsors
GET    /format-templates
```

## 5. Équipes, joueurs, inscriptions
```
GET    /teams                                     # référentiel org
POST   /teams
PATCH  /teams/:id
POST   /teams/:id/players                          # TeamPlayer
GET    /players
POST   /players
POST   /players/import        (CSV/Excel → job worker : upload→parse→validate→preview→confirm)
POST   /teams/import

POST   /registrations                              # inscription équipe↔catégorie
GET    /tournaments/:id/registrations
POST   /registrations/:id/approve
POST   /registrations/:id/reject
POST   /registrations/:id/withdraw
```

## 6. Compétition, groupes, calendrier
```
POST   /categories/:id/competition                 # crée/configure la compétition (format)
POST   /competitions/:id/generate-groups           # moteur
POST   /competitions/:id/generate-fixtures         # moteur → matchs
POST   /tournaments/:id/schedule/generate          # ScheduleGenerator (async worker)
PATCH  /matches/:id/schedule                        # déplacer (date/heure/terrain)
GET    /tournaments/:id/standings                   # dérivé
GET    /tournaments/:id/bracket                     # dérivé
```

## 7. Matchs & Match Day
```
GET    /tournaments/:id/matches
POST   /tournaments/:id/matches                     # match manuel
GET    /matches/:id
POST   /matches/:id/start
POST   /matches/:id/pause
POST   /matches/:id/resume
POST   /matches/:id/events                          # but/carton/... (append)
DELETE /matches/:id/events/:eventId                 # void (soft)
PATCH  /matches/:id/score
POST   /matches/:id/finish                          # chaîne transactionnelle
POST   /matches/:id/forfeit
POST   /matches/:id/postpone
POST   /matches/:id/cancel
POST   /matches/:id/officials
POST   /matches/:id/complaints
```

## 8. Paiements
```
POST   /payments                                    # Idempotency-Key requis (manuel ou init provider)
GET    /tournaments/:id/payments
GET    /payments/:id
POST   /payments/:id/refund
POST   /webhooks/payments/:provider                 # idempotent, signature vérifiée
```

## 9. Communication
```
POST   /tournaments/:id/announcements
GET    /tournaments/:id/announcements
GET    /notifications                               # in-app de l'utilisateur
POST   /notifications/:id/read
```

## 10. Public (lecture, sans auth, tournois PUBLISHED)
```
GET    /public/tournaments
GET    /public/tournaments/:slug
GET    /public/tournaments/:slug/matches
GET    /public/tournaments/:slug/results
GET    /public/tournaments/:slug/standings
GET    /public/tournaments/:slug/teams
GET    /public/tournaments/:slug/players
GET    /public/tournaments/:slug/bracket
GET    /public/tournaments/:slug/statistics
```

## 11. Admin Gboroly (SUPER_ADMIN)
```
GET    /admin/organizations · /admin/users · /admin/tournaments
GET    /admin/payments · /admin/transactions · /admin/subscriptions
GET    /admin/reports · /admin/complaints · /admin/audit-logs
PATCH  /admin/system-settings · GET/POST /admin/sports
```

## 12. Export (async → worker)
```
POST   /tournaments/:id/exports        # {type: teams|players|matches|schedule|standings|statistics|payments|summary, format: csv|xlsx|pdf}
GET    /exports/:jobId                  # statut + url S3 quand prêt
```

## 13. Codes d'erreur métier (stables)
```
TEAM_ALREADY_REGISTERED · PLAYER_ALREADY_REGISTERED · TOURNAMENT_NOT_PUBLISHED
MATCH_ALREADY_FINISHED · INVALID_SCORE · INVALID_QUALIFICATION
PAYMENT_ALREADY_COMPLETED · FIELD_UNAVAILABLE · INSUFFICIENT_PERMISSION
CHECKLIST_INCOMPLETE · MODIFICATION_LOCKED · IDEMPOTENCY_CONFLICT
```
Format : `{ error: { code, message, details? } }`, statut HTTP cohérent (400/401/403/404/409/422).

## 14. Sécurité transversale
Rate limiting (Redis), CORS strict, validation stricte des uploads, RBAC par endpoint (guards), audit des actions sensibles. Voir [SECURITY.md](./SECURITY.md) et [RBAC.md](./RBAC.md).
