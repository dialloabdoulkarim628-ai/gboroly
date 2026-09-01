import { describe, expect, it } from 'vitest';
import { isRegistrationOpen, type RegistrationWindow } from './marketplace-rules';

const base: RegistrationWindow = {
  status: 'PUBLISHED',
  visibility: 'PUBLIC',
  registrationStart: null,
  registrationEnd: null,
  maxTeams: 16,
};
const now = new Date('2026-09-01T12:00:00Z');

describe('isRegistrationOpen', () => {
  it('ouvert si publié, public, dans la fenêtre, non plein', () => {
    expect(isRegistrationOpen(base, 8, now)).toEqual({ open: true, reason: 'OPEN' });
  });

  it('refuse si non public / non publié', () => {
    expect(isRegistrationOpen({ ...base, visibility: 'PRIVATE' }, 0, now).reason).toBe('NOT_PUBLIC');
    expect(isRegistrationOpen({ ...base, status: 'DRAFT' }, 0, now).reason).toBe('NOT_PUBLISHED');
  });

  it('respecte la fenêtre d’inscription', () => {
    expect(
      isRegistrationOpen({ ...base, registrationStart: new Date('2026-09-05') }, 0, now).reason,
    ).toBe('NOT_STARTED');
    expect(
      isRegistrationOpen({ ...base, registrationEnd: new Date('2026-08-30') }, 0, now).reason,
    ).toBe('CLOSED');
  });

  it('refuse si complet', () => {
    expect(isRegistrationOpen({ ...base, maxTeams: 8 }, 8, now).reason).toBe('FULL');
  });

  it('sans maxTeams → jamais plein', () => {
    expect(isRegistrationOpen({ ...base, maxTeams: null }, 999, now).open).toBe(true);
  });
});
