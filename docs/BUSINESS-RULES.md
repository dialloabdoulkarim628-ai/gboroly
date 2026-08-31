# BUSINESS-RULES — Règles métier

> Les règles vivent dans le domaine / `competition-engine`, jamais dans l'UI, jamais dupliquées.

## 1. Configuration sportive (moteur de règles)

Configurable par sport / catégorie (jamais codé en dur) :
`sport · durée du match · nombre de joueurs · points (win/draw/loss/forfait) · tiebreakers · nombre d'équipes · format · nombre de groupes · qualification · prolongation · tirs au but · statistiques · cartons · forfaits`.

Maracana par défaut : `win=3, draw=1, loss=0`, buts + cartons + tirs au but, tiebreakers `[points, goalDifference, goalsFor, headToHead, fairPlay, randomDraw]`.

## 2. Formats supportés (MVP → avancé)

Round Robin · Group Stage · Single Elimination · **Group → Playoffs** (le plus courant) · Double Elimination (P1) · Custom (P2).

Modèles préconfigurés (`FormatTemplate`) :
| Équipes | Structure | Enchaînement |
|---|---|---|
| 8 | 2 groupes de 4 | demi-finales → finale |
| 12 | 3 groupes de 4 | qualification → quarts → demi → finale |
| 16 | 4 groupes de 4 | quarts → demi → finale |
| 24 | 6 groupes de 4 | qualification configurable → 8es/quarts → demi → finale |

L'organisateur part d'un modèle puis le modifie.

## 3. Classement (calcul)

Colonnes : `MJ, V, N, D, BP, BC, Diff, Pts` (+ fair-play). Recalcul automatique à chaque résultat. Colonnes configurables selon le sport. **Jamais saisi à la main.**

## 4. Tie-breakers

Ordre configurable, défaut : `points > goalDifference > goalsFor > headToHead > fairPlay > randomDraw`.
- Head-to-head : mini-classement entre équipes à égalité (attention boucles > 2 équipes).
- randomDraw : tirage **reproductible** (seed stocké, auditable).

## 5. Qualifications

1er/2e de chaque groupe injectés automatiquement dans les phases finales selon `qualificationRules` (nb qualifiés/groupe, meilleurs 3es, mapping vers slots). Configurable.

## 6. Cycle de vie du tournoi

`DRAFT → READY → PUBLISHED → ONGOING → COMPLETED → ARCHIVED` (+ `CANCELLED`). Voir [DOMAIN-MODEL.md](./DOMAIN-MODEL.md).

### Checklist de publication (obligatoire avant PUBLISHED)
```
✓ Informations complètes   ✓ Catégories configurées   ✓ Équipes ajoutées
✓ Effectifs configurés     ✓ Format configuré         ✓ Règles configurées
✓ Terrains configurés      ✓ Calendrier généré        ✓ Frais définis   ✓ Page publique prête
```

### Contrôle des modifications
Après `ONGOING`, certaines modifications sont **bloquées** (ex. nombre d'équipes si des matchs sont joués) sauf procédure spéciale. Le système **prévient** : « Cette modification peut affecter le calendrier et les résultats existants » puis demande confirmation + audit.

## 7. Équipes, inscriptions, joueurs

- Statuts séparés en 3 axes (voir A6) : `Team.status`, `Registration.status`, `Registration.paymentStatus`.
- Une équipe = **une** inscription par catégorie (`unique(categoryId, teamId)`).
- **Contrôle de cohérence joueur** : un joueur ne peut être `ACTIVE` que dans **une** équipe par (tournoi, catégorie) ; refus si joueur suspendu, non éligible, ou effectif dépassant `maxSquad`.
- Effectif borné par `minSquad`/`maxSquad` de la catégorie.
- Inscription publique : lien `gboroly.com/inscription/xxxxx` → `Inscription reçue → Validation → Paiement → Équipe confirmée`.

## 8. Matchs & incidents

- **Forfait** : l'équipe ne se présente pas → score administratif configurable + conséquence classement/qualif.
- **Annulation** : motif (météo, terrain indisponible, organisation, sécurité, autre).
- **Report** : nouvelle date/heure/terrain ; classement provisoire cohérent.
- **Réclamation** : `Complaint` liée au match.
- **Retrait d'équipe** : walkover des matchs restants + recalcul.

## 9. Paiements & commission

Voir [PAYMENTS.md](./PAYMENTS.md). Décomposition `grossAmount / platformFee / paymentProcessingFee / organizerAmount / platformAmount`. Idempotence stricte. Paiement partiel supporté. Frais d'inscription par tournoi, surchargés par catégorie (A3).

## 10. Duplication

`Tournoi 2026 → Tournoi 2027` réutilise format/règles/catégories/terrains/paramètres/branding. **Ne copie jamais** résultats, matchs, classements, paiements, historique. Clone en `DRAFT`.

## 11. Cas limites (référence tests)

Nombre impair d'équipes · groupes de tailles inégales · forfait · match nul (knockout → prolongation/tirs au but) · égalité parfaite (tirage seedé) · report/annulation · équipe ajoutée tardivement · joueur suspendu · paiement partiel/annulé · multi-catégories/terrains/jours · réseau instable. Détail dans [TESTING.md](./TESTING.md).
