# PAYMENTS — Paiements & commissions

> Abstraction `PaymentProvider`. **Aucun** fournisseur codé en dur dans le domaine métier. FCFA (XOF) natif, multi-devises prêt. Idempotence stricte. MVP = **paiement manuel**, providers en ligne branchés progressivement.

## 1. Abstraction

```ts
interface PaymentProvider {
  readonly key: PaymentMethodType;
  createPayment(input: CreatePaymentInput): Promise<PaymentInitResult>;
  verifyPayment(ref: string): Promise<PaymentStatus>;
  refundPayment(ref: string, amount?: Money): Promise<RefundResult>;
  getPaymentStatus(ref: string): Promise<PaymentStatus>;
  verifyWebhook(payload, signature): boolean;
}
```

Providers prévus : `Manual (cash/reçu)`, `Wave`, `OrangeMoney`, `MTNMoney`, `MoovMoney`, `Card`. L'intégration réelle de chacun est ajoutée sans toucher au domaine.

## 2. Modèle financier (décomposition d'une transaction)

Chaque paiement distingue :

| Poste | Champ | Exemple (50 000 FCFA) |
|---|---|---|
| Montant brut inscription | `grossAmount` | 50 000 |
| Frais plateforme (commission Gboroly) | `platformFee` | 2 500 |
| Frais provider (Mobile Money/carte) | `paymentProcessingFee` | 1 000 |
| Reversé à l'organisateur | `organizerAmount` | 46 500 |
| Encaissé par Gboroly | `platformAmount` | 2 500 |

Montants en **entiers** (plus petite unité), jamais float. `currency` ISO 4217. Règles de commission **configurables** (par org / tournoi), non codées en dur.

## 3. Statuts

`PaymentStatus{ UNPAID, PARTIAL, PAID, REFUNDED, CANCELLED }` — reflété aussi sur `Registration.paymentStatus`.
Support du **paiement partiel** (plusieurs versements) : somme des `Payment.grossAmount` PAID vs `registrationFee` effectif.

## 4. Idempotence (critique)

- Header `Idempotency-Key` obligatoire sur `POST /payments`.
- Contrainte d'unicité DB : `Payment.idempotencyKey` unique, et `(provider, providerTxnRef)` unique.
- **Une même requête envoyée deux fois ne crée jamais deux paiements.**
- Webhooks : traités de façon idempotente (rejouables), signature vérifiée, `PaymentTransaction` append-only.

## 5. Flux

### Paiement manuel (MVP)
```
Organisateur enregistre : Équipe X — 50 000 FCFA — cash — reçu #1234
→ Payment(status=PAID, method=CASH) → Registration.paymentStatus=PAID
→ AuditLog(PAYMENT_UPDATED) → notification "paiement confirmé"
```

### Paiement en ligne (Phase 12+)
```
POST /payments (Idempotency-Key) → provider.createPayment() → PaymentInitResult(redirect/deeplink)
Utilisateur paie → provider webhook → verifyWebhook → PaymentTransaction(CAPTURED)
→ Payment.status=PAID (transaction) → OutboxEvent(PaymentCompleted) → notifications/realtime
```

## 6. Transactions & cohérence

- Écriture du `Payment` et mise à jour de `Registration.paymentStatus` dans une **transaction**.
- Un `Payment` capturé est **immuable** : correction via remboursement / nouvelle transaction.
- Réconciliation : `PaymentTransaction` conserve tous les événements provider (audit + litiges).

## 7. Commission / Marketplace (futur)

Modèle prévu pour la marketplace (Phase 14) : l'équipe paie via la plateforme, Gboroly prélève `platformFee`, reverse `organizerAmount`. Tables `Payment`/`PaymentTransaction`/`Subscription` déjà prêtes ; activation ultérieure selon le modèle économique retenu (décision D7).

## 8. Sécurité paiements

- Gboroly **n'entre jamais** de credentials bancaires/Mobile Money à la place de l'utilisateur : redirection vers le provider.
- Clés provider via variables d'environnement (jamais en base ni en Git).
- Montants et statuts **jamais** décidés par le frontend : vérifiés côté backend contre le provider.

## Implémentation (Phase 12)

MVP : **paiement manuel (cash/reçu)** uniquement (D5/D7) ; online derrière l'abstraction, non activé.

- **`fees.ts`** (pur, testé) : `computeFees(gross, {platformFeeBps, processingFeeFlat})` → `{grossAmount, platformFee, paymentProcessingFee, organizerAmount, platformAmount}` ; `rollUpPaymentStatus(totalPaid, amountDue)`. MVP `platformFeeBps=0` (gratuit organisateur) ; configurable via `PLATFORM_FEE_BPS`.
- **`PaymentProvider`** (abstraction : createPayment/verifyPayment/refundPayment/getPaymentStatus) + **`ManualPaymentProvider`** (confirme immédiatement). Providers Wave/Orange Money/MTN/Moov/carte = futurs, sans toucher au domaine.
- **`PaymentsService`** : `recordPayment` (fees → Payment + PaymentTransaction, **idempotence** `idempotencyKey` unique + gestion course P2002, **roll-up** `registration.paymentStatus` UNPAID/PARTIAL/PAID), `refund` (→ REFUNDED + recalcul), `listByTournament/Registration`, `summary` (gross/organizerRevenue/platformCommission).
- **Montants** : `BigInt` en base (plus petite unité, FCFA entier), jamais de flottant. `@@unique([provider, providerTxnRef])` + `idempotencyKey @unique`.
- **Endpoints** : `POST /registrations/:id/payments` (payment.manage), `GET .../payments`, `GET /tournaments/:id/payments[/summary]`, `POST /payments/:id/refund` (payment.refund).

**Suite** : brancher un provider Mobile Money (createPayment → redirectUrl ; webhook → PaymentTransaction + verifyPayment) ; relier `PaymentConfirmed` aux notifications (Phase 11).
