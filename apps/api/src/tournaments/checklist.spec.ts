import { describe, expect, it } from 'vitest';
import {
  buildPublicationChecklist,
  isPublishable,
  unmetRequired,
  type ChecklistInput,
} from './checklist';

// Base "publiable" : tous les critères bloquants remplis (Phase 8).
const base: ChecklistInput = {
  hasName: true,
  hasSport: true,
  hasCountry: true,
  categoriesCount: 1,
  approvedTeamsCount: 2,
  competitionsConfigured: 1,
  fieldsCount: 1,
  scheduledMatchesCount: 1,
};

describe('checklist de publication', () => {
  it('publiable quand tous les critères bloquants sont remplis', () => {
    const items = buildPublicationChecklist(base);
    expect(isPublishable(items)).toBe(true);
    expect(unmetRequired(items)).toHaveLength(0);
  });

  it.each([
    ['categories', { categoriesCount: 0 }],
    ['info', { hasCountry: false }],
    ['teams', { approvedTeamsCount: 1 }],
    ['format', { competitionsConfigured: 0 }],
    ['fields', { fieldsCount: 0 }],
    ['schedule', { scheduledMatchesCount: 0 }],
  ] as const)('non publiable si %s manquant', (key, patch) => {
    const items = buildPublicationChecklist({ ...base, ...patch });
    expect(isPublishable(items)).toBe(false);
    expect(unmetRequired(items).map((i) => i.key)).toContain(key);
  });
});
