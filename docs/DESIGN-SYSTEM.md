# DESIGN-SYSTEM — Identité & UX

> Respecter la charte Gboroly. Moderne, sportif, professionnel, énergique, premium accessible, simple, lisible, **mobile-first**. Référence : `Charte_Graphique_Gboroly.pdf`, maquettes PC/Mobile.

## 1. Palette

| Rôle | Nom | Hex |
|---|---|---|
| Fond sombre / sidebar | Navy Gboroly | `#071B45` |
| Primaire (actions, liens) | Blue Sport | `#1269D3` |
| Accent clair | Bleu clair | `#2D8CFF` |
| Accent énergie (CTA secondaire) | Orange Energy | `#FF6A00` |
| Succès / mise en avant | Yellow Victory | `#FFB20D` |
| Positif / terrain | Green Field | `#18A957` |
| Texte principal | Texte | `#17233A` |
| Texte secondaire | Gris | `#64748B` |
| Fond application | Background | `#F4F7FB` |

Usage sémantique : succès = vert, attention = jaune/orange, info = bleu, danger = rouge (à ajouter, ex. `#E1483C`). Cartes de stats colorées par catégorie (bleu/vert/orange/violet) comme sur les maquettes.

## 2. Typographie

- **Poppins** (ou Montserrat) — géométrique, énergique. Titres en semi-bold/bold, corps en regular/medium.
- Échelle lisible mobile-first ; nombres de stats en grand poids.

## 3. Composants (`packages/ui`)

`Button · Input · Select · Modal · Drawer · Table · DataTable · Card · Badge · Tabs · Toast · Dialog · DatePicker · Pagination · EmptyState · LoadingState · ConfirmDialog`.

Patterns issus des maquettes :
- **StatCard** (icône colorée, valeur, variation vs période, mini-graphe).
- **Sidebar** navy avec navigation dashboard + bloc « Passer à Premium ».
- **Tournoi phare** (bannière image + barre de progression étapes : Inscriptions → Groupes → Phase de poules → Phases finales → Finale).
- **Liste « Prochains matchs »** (logos, heure, terrain).
- **Bracket** visuel.
- **Match Day** : gros boutons d'action (+ But, + Carton, Terminer…), ultra-léger.

## 4. Navigation

- **Dashboard** (sidebar) : Tableau de bord · Mes tournois · Équipes · Joueurs · Matchs · Calendrier · Classements · Terrains · Arbitres · Sponsors · Paiements · Communication · Statistiques · Paramètres.
- **Mobile** : bottom tab bar (Accueil · Tournois · Calendrier · Notifications · Menu).
- **Public tournoi** (`/t/[slug]`) : Accueil · Matchs · Résultats · Classement · Équipes · Joueurs · Buteurs · Bracket · Informations.

## 5. Principes UX

1. La complexité est dans le logiciel, pas dans la tête de l'utilisateur.
2. Une action = un résultat clair.
3. Toujours savoir quoi faire ensuite (le dashboard guide ; alertes actionnables).
4. Mobile first (opérations critiques parfaites sur smartphone).
5. Ne jamais perdre une information (save draft à chaque étape du wizard).
6. Automatiser sans retirer le contrôle (tout est modifiable manuellement).

## 6. Assistant & wizard

- **Onboarding intelligent** : « Quel sport ? / Combien d'équipes ? / Comment les organiser ? / Combien se qualifient ? / Quarts ? » → Gboroly génère groupes, rounds, qualifications, bracket, calendrier prévisionnel.
- **Wizard création** (10 étapes) : Informations → Sport → Catégorie → Format → Règles → Terrains → Inscriptions → Paiements → Vérification → Publication. **Save draft** à chaque étape.

## 7. Alertes actionnables (dashboard)

« 3 équipes n'ont pas payé », « Terrain B indisponible demain », « Match sans arbitre », « Équipe sans effectif complet », « Match à programmer », « Résultat manquant » → chaque alerte mène à l'action.

## 8. Mobile-first, réseau faible, PWA

- Priorité smartphone (organisateur sur le terrain).
- Payloads réduits, images optimisées/compressées, lazy loading, cache, retry, statut de connexion.
- PWA installable (écran d'accueil), Match Day particulièrement léger.
- Pages publiques : rapides, SEO-friendly (metadata, Open Graph, sitemap, URLs propres, données structurées), partageables (QR code par tournoi).

## 9. Accessibilité

Contrastes suffisants (WCAG AA), cibles tactiles ≥ 44px, focus visibles, textes lisibles, pas d'information portée uniquement par la couleur.
