# REALTIME — Temps réel

> WebSockets / Socket.IO. Une page publique affichant un match ne doit jamais nécessiter un rafraîchissement manuel. **Pas de polling agressif.** Émissions déclenchées par événements de domaine via l'outbox.

## 1. Transport

- **Socket.IO** (fallback long-polling automatique pour réseaux dégradés).
- Auth du socket : token pour les rooms privées (dashboard) ; rooms publiques accessibles en lecture sans compte.
- Namespace unique + **rooms** par ressource.

## 2. Rooms

| Room | Usage |
|---|---|
| `tournament:{id}` | Page publique tournoi, dashboard tournoi |
| `match:{id}` | Live Match Center, Match Day |
| `org:{id}` | Dashboard organisateur (alertes, activité) |

Un client rejoint la room de la ressource affichée, la quitte en partant.

## 3. Événements émis (serveur → clients)

```
match.started        { matchId, tournamentId }
match.score.updated  { matchId, home, away }
match.event.created  { matchId, event }
match.finished       { matchId, result }
standings.updated    { competitionId, groupId }
tournament.updated   { tournamentId }            # calendrier, statut, etc.
announcement.created { tournamentId, announcement }
```

## 4. Flux (outbox → realtime)

```
FinishMatch (transaction) ─▶ OutboxEvent(MatchFinished) [committé]
        │
   Worker relais ─▶ RealtimeGateway.emit('match.finished', room=match:{id} & tournament:{id})
        │
   Clients dans la room reçoivent l'événement (pas de refresh)
        │
   Page publique (Next.js) : invalidation TanStack Query ciblée + revalidation ISR on-demand si SSR
```

**Pourquoi via l'outbox** : garantir que l'émission suit un commit réussi (pas d'émission « fantôme » si la transaction échoue), et ne pas bloquer la transaction critique sur un I/O réseau.

## 5. Stratégie côté client

- Le realtime **complète** les données chargées via REST (il ne les remplace pas).
- À réception d'un événement : mise à jour optimiste + invalidation de la query concernée.
- Reconnexion automatique ; à la reconnexion, refetch de l'état courant (source de vérité = API, pas les événements manqués).
- Débit maîtrisé : coalescing des `standings.updated` (un recompute → une émission).

## 6. Performance / réseau faible

- Payloads minimaux (ids + deltas, pas d'objets lourds).
- Le Live Match Center est **léger** ; les données détaillées sont chargées à la demande.
- Pas de push haute fréquence : la minute de match est saisie par l'opérateur, pas un chrono serveur (voir A11).

## 7. Cas d'usage couverts

Score en direct, événement de match, classement live, annonce, changement de calendrier — sur page publique **et** dashboard, sans rechargement.

## Implémentation (Phase 10) — SSE

**Choix : Server-Sent Events (SSE)** plutôt que Socket.IO au MVP — explicitement autorisé par le cahier §49, **aucune dépendance ajoutée** (Nest `@Sse` + rxjs déjà présents ; `EventSource` natif côté navigateur), unidirectionnel serveur→client suffisant pour les pages publiques (score/classement live), robuste sur réseau faible. Socket.IO (bidirectionnel) pourra être ajouté pour le Match Day multi-opérateurs.

- **`RealtimeService`** (`apps/api/src/realtime`) : bus en mémoire (`Subject` RxJS). `publish(tournamentId, event, payload)` ; `streamFor(tournamentId)` = flux filtré + **heartbeat 25 s** (anti-timeout proxy). 2 tests unitaires.
- **`OutboxRelayService`** : `setInterval` (2 s) qui draine `OutboxEvent` PENDING → `publish` → marque DONE (retry avec backoff, FAILED après 5 tentatives). **Découplé de la transaction finish-chain** (Outbox pattern, docs/ARCHITECTURE.md §7). Désactivable via `OUTBOX_RELAY_DISABLED=1`.
- **`RealtimeController`** : `@Public() @Sse('public/tournaments/:slug/live')` — résout slug→id (filtre PUBLIC), renvoie l'`Observable<MessageEvent>` via `from(...).pipe(switchMap(...))`.
- **Émissions** : `matches.service` écrit des `OutboxEvent` sur `start` (MatchStarted), `setScore`/but (MatchScoreUpdated), `finish` (MatchFinished). Mapping relais : MatchFinished → `match.finished` + `standings.updated`.
- **Frontend** `apps/web/src/app/t/[slug]/_live.tsx` (`LiveUpdater`, client) : `EventSource` vers `NEXT_PUBLIC_API_URL/public/tournaments/:slug/live` → `router.refresh()` sur tout événement (hors `ping`). Reconnexion auto native.

**Limite MVP** : bus en mémoire = **mono-instance**. Multi-instances → adaptateur Redis pub/sub (le relais publierait sur Redis, chaque instance rediffuserait en SSE).
