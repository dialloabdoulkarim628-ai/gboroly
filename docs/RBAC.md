# RBAC & Multi-tenancy

> Toutes les permissions sont vérifiées **côté backend**. Le frontend n'est jamais une couche de sécurité. Isolation stricte par organisation.

## 1. Rôles

| Rôle | Portée | Résumé |
|---|---|---|
| `SUPER_ADMIN` | Plateforme (Gboroly) | Tout, cross-tenant, via `/admin`, audité. |
| `ORGANIZATION_OWNER` | Organisation | Propriétaire ; gère membres, facturation, tous les tournois. |
| `ORGANIZATION_ADMIN` | Organisation | Gestion complète des tournois de l'org (sauf suppression org / facturation). |
| `FINANCE_MANAGER` | Organisation | Paiements, transactions, remboursements, exports financiers. |
| `TOURNAMENT_MANAGER` | Tournoi | Config tournoi, équipes, format, calendrier, publication. |
| `MATCH_OPERATOR` | Tournoi/Match | Match Day : scores, événements, terminer un match. |
| `COMMUNICATION_MANAGER` | Tournoi | Annonces, notifications, page publique, sponsors. |
| `REFEREE` | Match | Consulte ses matchs, saisit résultats/événements de ses matchs. |
| `TEAM_MANAGER` | Équipe | Gère son équipe/joueurs, inscription, consulte ses matchs. |

Rôles système (`isSystem=true`) semés par migration ; une org peut créer des rôles custom (post-MVP).

## 2. Permissions (clés)

Format `domaine.action`. Extrait :
```
organization.manage · member.invite · member.manage · billing.manage
tournament.create · tournament.update · tournament.publish · tournament.delete · tournament.duplicate
category.manage · venue.manage · referee.manage · sponsor.manage
team.manage · player.manage · registration.review (approve/reject)
competition.configure · schedule.generate · schedule.edit
match.operate (start/score/event/finish) · match.reschedule · match.cancel
standing.view · payment.manage · payment.refund
announcement.publish · notification.send
public.manage · export.run · audit.view
admin.platform (super admin)
```

## 3. Matrice rôle × permission (extrait)

| Permission | OWNER | ORG_ADMIN | FINANCE | TOURN_MGR | MATCH_OP | COMM_MGR | REFEREE | TEAM_MGR |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| tournament.create/update | ✅ | ✅ | – | ✅¹ | – | – | – | – |
| tournament.publish | ✅ | ✅ | – | ✅ | – | – | – | – |
| registration.review | ✅ | ✅ | – | ✅ | – | – | – | – |
| competition.configure | ✅ | ✅ | – | ✅ | – | – | – | – |
| schedule.generate/edit | ✅ | ✅ | – | ✅ | – | – | – | – |
| match.operate | ✅ | ✅ | – | ✅ | ✅ | – | ✅² | – |
| payment.manage/refund | ✅ | ✅ | ✅ | – | – | – | – | – |
| announcement.publish | ✅ | ✅ | – | ✅ | – | ✅ | – | – |
| team.manage (sa propre équipe) | ✅ | ✅ | – | ✅ | – | – | – | ✅³ |
| audit.view | ✅ | ✅ | – | – | – | – | – | – |
| billing/org.manage | ✅ | – | – | – | – | – | – | – |

¹ limité aux tournois qui lui sont assignés · ² uniquement ses matchs assignés · ³ uniquement son équipe.

## 4. Implémentation (NestJS)

- **`JwtAuthGuard`** : authentifie, charge `user` + memberships.
- **`TenantGuard`** : résout l'organisation active, vérifie l'appartenance, injecte `organizationId` dans le contexte de requête.
- **`PermissionsGuard`** + décorateur `@RequirePermissions('match.operate')` : vérifie la permission effective (rôle → permissions) **et** la portée (tournoi/match assigné).
- **Scope checks** : au-delà du rôle, vérifier l'appartenance de la ressource (`match.tournament.organizationId === ctx.organizationId`, opérateur assigné, etc.).
- Toute décision d'autorisation refusée → `403 INSUFFICIENT_PERMISSION` (jamais 404 silencieux qui masque, sauf pour non-fuite d'existence inter-tenant → 404).

## 5. Multi-tenancy — règles

1. `organizationId` présent sur toute table métier privée, filtré côté backend systématiquement.
2. Aucune donnée accessible entre organisations sans permission explicite.
3. `SUPER_ADMIN` traverse les tenants **uniquement** via `/admin`, chaque accès audité.
4. Endpoints publics : lecture seule, tournois `PUBLISHED`, données filtrées.
5. Les identifiants exposés publiquement sont des **slugs** (pas d'énumération d'ID inter-tenant).

## 5bis. Implémentation (Phase 3)

- **Source unique de vérité** : `packages/types/src/rbac.ts` — `PERMISSIONS` + `ROLE_PERMISSIONS` (matrice) + `permissionsForRole()`. Consommée par le **seed** (attache les `RolePermission`) et par le **guard** (permissions effectives).
- **`RbacService`** (`apps/api/src/rbac`) — `resolveMembership(userId, orgId)` → `{ organizationId, roleKey, permissions:Set }` ; `getUserOrganizations(userId)`.
- **`PermissionsGuard`** (effectif) — résout l'org active depuis le paramètre de route **`:orgId`** puis, à défaut, l'en-tête **`X-Organization-Id`** ; charge le membership, vérifie l'inclusion des permissions requises, attache `request.membership`.
- **Décorateurs** : `@RequirePermissions('member.manage')`, `@RequireMembership()` (membre actif sans permission précise), `@ActiveMembership()` (injection du contexte org).
- **Organisations** (`apps/api/src/organizations`) : `POST /organizations` (créateur = OWNER), `GET /organizations/mine`, `GET/PATCH /organizations/:orgId`, membres (`GET`, `PATCH role`, `DELETE`), invitations (`POST`/`GET`/`DELETE` + `POST /invitations/accept`). Garde-fou : impossible de retirer/rétrograder le **dernier propriétaire**.
- **SUPER_ADMIN plateforme (cross-tenant)** : espace `/admin` dédié → **Phase 13** ; ici le RBAC est **org-scopé**.
- **Portée fine** (REFEREE/TEAM_MANAGER limités à leurs matchs/équipe) : affinée aux **Phases 5–7** ; Phase 3 applique le niveau permission.

## 6. Audit

Toute action sensible (voir `AuditAction` dans [DATABASE.md](./DATABASE.md)) écrit un `AuditLog` : `userId, organizationId, action, entityType, entityId, oldValue, newValue, ip, userAgent, createdAt`. Particulièrement : scores, validations d'équipe, suppressions de joueur, paiements, déplacements de match, publication.
