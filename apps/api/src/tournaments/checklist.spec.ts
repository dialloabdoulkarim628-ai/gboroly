import { describe, expect, it } from 'vitest';
import {
  buildPublicationChecklist,
  isPublishable,
  unmetRequired,
  type ChecklistInput,
} from './checklist';

const base: ChecklistInput = {
  hasName: true,
  hasSport: true,
  hasCountry: true,
  categoriesCount: 1,
  approvedTeamsCount: 0,
  competitionsConfigured: 0,
  fieldsCount: 0,
  scheduledMatchesCount: 0,
};

describe('checklist de publication', () => {
  it('publiable si infos complètes + au moins une catégorie', () => {
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

  it('les critères des phases suivantes ne bloquent pas encore', () => {
    // équipes/format/terrains/calendrier absents mais non bloquants en Phase 4
    expect(isPublishable(buildPublicationChecklist(base))).toBe(true);
  });
});
