/**
 * Checklist de publication d'un tournoi — module PUR (testable sans DB).
 * Chaque critère : `met` (rempli ?) + `required` (bloquant pour publier à ce stade ?).
 * `required` s'élargit au fil des phases (équipes → Phase 5, format → Phase 6, calendrier → Phase 8, frais → Phase 12).
 * Voir docs/BUSINESS-RULES.md §6.
 */
export interface ChecklistInput {
  hasName: boolean;
  hasSport: boolean;
  hasCountry: boolean;
  categoriesCount: number;
  approvedTeamsCount: number;
  competitionsConfigured: number;
  fieldsCount: number;
  scheduledMatchesCount: number;
}

export interface ChecklistItem {
  key: string;
  label: string;
  met: boolean;
  required: boolean;
}

export function buildPublicationChecklist(input: ChecklistInput): ChecklistItem[] {
  return [
    {
      key: 'info',
      label: 'Informations générales complètes',
      met: input.hasName && input.hasSport && input.hasCountry,
      required: true,
    },
    {
      key: 'categories',
      label: 'Au moins une catégorie configurée',
      met: input.categoriesCount >= 1,
      required: true,
    },
    // Critères prêts, activés (required) au fil des phases suivantes.
    {
      key: 'teams',
      label: 'Équipes validées (min. 2)',
      met: input.approvedTeamsCount >= 2,
      required: false, // Phase 5
    },
    {
      key: 'format',
      label: 'Format de compétition configuré',
      met: input.competitionsConfigured >= 1,
      required: false, // Phase 6
    },
    {
      key: 'fields',
      label: 'Terrains configurés',
      met: input.fieldsCount >= 1,
      required: false, // Phase 8
    },
    {
      key: 'schedule',
      label: 'Calendrier généré',
      met: input.scheduledMatchesCount >= 1,
      required: false, // Phase 8
    },
  ];
}

export function isPublishable(items: ChecklistItem[]): boolean {
  return items.filter((i) => i.required).every((i) => i.met);
}

export function unmetRequired(items: ChecklistItem[]): ChecklistItem[] {
  return items.filter((i) => i.required && !i.met);
}
