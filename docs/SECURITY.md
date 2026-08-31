# SECURITY — Sécurité & authentification

> « Un organisateur ne doit jamais pouvoir accéder aux données d'un autre organisateur. » Sécurité côté backend uniquement ; le frontend n'est jamais une couche de sécurité.

## 1. Authentification

- **Mots de passe** : hash **Argon2id** (paramètres mémoire/temps raisonnables). Jamais en clair, jamais loggés.
- **Méthodes** : email + mot de passe, téléphone + OTP. OAuth possible ultérieurement.
- **Vérification** : email et/ou téléphone (`AuthToken` : EMAIL_VERIFY / PHONE_OTP), OTP à durée limitée + limite de tentatives.
- **Sessions (décision D9)** : Access token **JWT court (~15 min)** + **Refresh token rotatif** persistant et **révocable** (`RefreshToken.tokenHash`), cookie `httpOnly` + `Secure` + `SameSite=Lax/Strict`. Rotation à chaque refresh, révocation = « déconnexion partout ».
- **Reset mot de passe** : token à usage unique, expirant, consommé.

## 2. Autorisation

- RBAC vérifié **côté backend** pour chaque endpoint (guards + `@RequirePermissions`). Voir [RBAC.md](./RBAC.md).
- Vérification de **portée** (scope) en plus du rôle : la ressource appartient bien au tenant/tournoi/match concerné.
- `SUPER_ADMIN` cross-tenant uniquement via `/admin`, audité.

## 3. Isolation multi-tenant

- `organizationId` filtré systématiquement côté serveur (jamais depuis un paramètre client non vérifié).
- Non-fuite d'existence inter-tenant : 404 plutôt que 403 révélateur quand pertinent.
- Slugs publics (pas d'énumération d'IDs).

## 4. Validation & entrées

- `Frontend(Zod) → API → DTO validation → Domain validation → DB`. **Ne jamais faire confiance au frontend.**
- Validation stricte des **uploads** : type MIME réel, taille max, extension, antivirus optionnel, stockage S3 avec clés non devinables. Jamais d'exécution de fichier uploadé.
- Protection **SQL injection** via ORM (Prisma, requêtes paramétrées).

## 5. Protections web

- **HTTPS** partout (prod).
- **CORS** strict (origines whitelistées).
- **CSRF** : cookies `SameSite` + double-submit token si cookies de session ; API bearer moins exposée.
- **XSS** : échappement, CSP, pas d'HTML utilisateur non assaini.
- **Rate limiting** (Redis) sur auth, paiements, endpoints sensibles + anti-bruteforce OTP/login.
- **Headers** de sécurité (helmet) : HSTS, X-Content-Type-Options, etc.

## 6. Secrets

- **Jamais** commités. `.env.example` sans valeurs réelles ; `.env.local`/secrets hors Git.
- Secrets sensibles : `DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_REFRESH_SECRET, S3_*, EMAIL_API_KEY, WHATSAPP_API_KEY, PAYMENT_PROVIDER_KEYS`.
- Rotation possible ; accès restreint par environnement.

## 7. Données sensibles & vie privée

- Minimisation des PII (téléphones, photos, dates de naissance).
- **Mineurs** (catégories U17/U20) : prudence accrue, confidentialité par défaut, consentement.
- Confidentialité **paramétrable par joueur** (ce qui est public sur la page joueur).
- Chiffrement au repos (base managée) + en transit (TLS).

## 8. Audit & journalisation

- `AuditLog` sur toute action sensible (scores, validations, suppressions, paiements, déplacements, publication).
- **Logs structurés** (JSON) ; **ne jamais logger** : mots de passe, tokens, secrets, données bancaires.
- Monitoring : erreurs app, latence API, erreurs DB/queue, échecs paiement/WS, échecs d'auth.

## 9. Concurrence & intégrité

- Optimistic locking (`version`) sur `Match` ; vérification de statut avant transition.
- Opérations critiques **transactionnelles** (finish match, paiement).
- Idempotence paiements (voir [PAYMENTS.md](./PAYMENTS.md)).

## 10. Sauvegarde & résilience

- Backups automatiques base managée + test de restauration.
- Soft-delete + purge auditée pour données critiques.
- Outbox → pas de perte d'événement critique.
