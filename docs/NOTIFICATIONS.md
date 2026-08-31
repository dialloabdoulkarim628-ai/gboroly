# NOTIFICATIONS — Communication multicanale

> Système centralisé, découplé des fournisseurs. Abstraction `NotificationProvider`. WhatsApp = canal privilégié, sans coupler le domaine à un fournisseur. Déclenché par événements de domaine (outbox).

## 1. Abstraction

```ts
interface NotificationProvider {
  readonly channel: NotificationChannel;   // IN_APP | EMAIL | SMS | WHATSAPP | PUSH
  send(message: NotificationMessage): Promise<SendResult>;
}
```

Providers : `InAppProvider`, `EmailProvider`, `SmsProvider`, `WhatsAppProvider`, `PushProvider`. Le cœur métier ne dépend **jamais** directement d'un fournisseur → changer de fournisseur WhatsApp n'impacte pas le domaine.

## 2. Canaux & priorités MVP (décision D5)

| Canal | MVP | Stratégie |
|---|:-:|---|
| **In-app** | ✅ | Table `Notification`, badge dashboard, temps réel. |
| **Email** | ✅ | Confirmations, resets, reçus. |
| **WhatsApp** | ✅ *(léger)* | **Liens `wa.me` + messages copiables** (gratuit, sans API). API WhatsApp Cloud officielle en option Phase 11+. |
| **SMS** | P1 | Selon budget/provider local. |
| **Push** | P1 | PWA push. |

> Décision ouverte D5 : activer l'**API WhatsApp Cloud (Meta)** dépend d'un compte Business API + budget.

## 3. Types de notifications

`inscription_confirmée · paiement_confirmé · match_programmé · changement_de_match · résultat · qualification · annonce · rappel_prochain_match`.

## 4. Templates

Templates paramétrables (par type × canal × langue fr/en). Exemple WhatsApp :
```
🏆 Votre prochain match
{team_home} vs {team_away}
{date} — {time} · {field}
Voir le tournoi : {public_url}
— Gboroly
```

## 5. Flux (événement → notification)

```
Domain event (ex. RegistrationApproved) → OutboxEvent
   Worker relais → NotificationService.dispatch(type, recipients, data)
       → pour chaque canal actif : provider.send(renderTemplate(...))
       → Notification(status=SENT/FAILED), retry via BullMQ (queue notifications/email/whatsapp/sms)
```

Chaque envoi : job **idempotent, retryable, observable**. Échecs journalisés (sans PII sensible).

## 6. Préférences & conformité

- Préférences de canal par utilisateur (opt-in/opt-out) — au moins pour email/WhatsApp.
- Ne jamais logger le contenu sensible ni les tokens provider.
- Respect des règles WhatsApp (fenêtre de 24h, templates approuvés) si API officielle.

## 7. Rappels automatiques

Jobs planifiés (BullMQ repeatable) : rappel « prochain match » J‑1 / H‑1 aux équipes concernées, via canaux préférés. Générés à partir du calendrier.
