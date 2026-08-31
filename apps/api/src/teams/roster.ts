/**
 * Règles d'effectif — module PUR (testable). Voir docs/BUSINESS-RULES.md §7.
 */
export interface SquadBounds {
  min?: number | null;
  max?: number | null;
}

export interface SquadCheck {
  ok: boolean;
  code?: 'SQUAD_MIN' | 'SQUAD_MAX';
  message?: string;
}

/** Valide qu'ajouter un joueur ne dépasse pas l'effectif max de la catégorie. */
export function canAddPlayer(currentCount: number, bounds: SquadBounds): SquadCheck {
  if (bounds.max != null && currentCount + 1 > bounds.max) {
    return { ok: false, code: 'SQUAD_MAX', message: `Effectif maximum atteint (${bounds.max})` };
  }
  return { ok: true };
}

/** Vérifie que l'effectif courant respecte le minimum (ex. avant validation d'inscription). */
export function meetsMinimum(currentCount: number, bounds: SquadBounds): SquadCheck {
  if (bounds.min != null && currentCount < bounds.min) {
    return { ok: false, code: 'SQUAD_MIN', message: `Effectif minimum requis (${bounds.min})` };
  }
  return { ok: true };
}
