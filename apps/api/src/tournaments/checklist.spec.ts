import { describe, expect, it } from 'vitest';
import {
  buildPublicationChecklist,
  isPublishable,
  unmetRequired,
  type ChecklistInput,
} from './checklist';

// Base "publiable" : infos complètes + 1 catégorie + 2 équipes validées.
const base: ChecklistInput = {
  hasName: true,
  hasSport: true,
  hasCountry: true,
  categoriesCount: 1,
  approvedTeamsCount: 2,
  competitionsConfigured: 0,
  fieldsCount: 0,
  scheduledMatchesCount: 0,
};

describe('checklist de publication', () => {
  it('publiable si infos + catégorie + 2 équipes validées', () => {
    const items = buildPublicationChecklist(base);
    expect(isPublishable(items)).toBe(true);
    expect(unmetRequired(items)).toHaveLength(0);
  });

  it('non publiable sans catégorie', () => {
    const items = buildPublicationChecklist({ ...base, categoriesCount: 0 });
    expect(isPublishable(items)).toBe(false);
    expect(unmetRequired(items).map((i) => i.key)).toContain('categories');
  });

  it('non publiable si infos incomplètes', () => {
    const items = buildPublicationChecklist({ ...base, hasCountry: false });
    expect(isPublishable(items)).toBe(false);
    expect(unmetRequired(items).map((i) => i.key)).toContain('info');
  });

  it('non publiable avec moins de 2 équipes validées (activé Phase 5)', () => {
    const items = buildPublicationChecklist({ ...base, approvedTeamsCount: 1 });
    expect(isPublishable(items)).toBe(false);
    expect(unmetRequired(items).map((i) => i.key)).toContain('teams');
  });

  it('format/terrains/calendrier ne bloquent pas encore', () => {
    // competitions/fields/schedule à 0 mais non bloquants en Phase 5
    expect(isPublishable(buildPublicationChecklist(base))).toBe(true);
  });
});
