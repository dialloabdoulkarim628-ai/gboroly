import { describe, expect, it } from 'vitest';
import { RegisterSchema } from './auth.js';
import { CreateTournamentSchema } from './tournament.js';

describe('RegisterSchema', () => {
  it('accepte un email + mot de passe valides', () => {
    const r = RegisterSchema.safeParse({
      firstName: 'Jean',
      lastName: 'Koffi',
      email: 'jean@gboroly.test',
      password: 'motdepasse1',
    });
    expect(r.success).toBe(true);
  });

  it('refuse sans email ni téléphone', () => {
    const r = RegisterSchema.safeParse({ firstName: 'A', lastName: 'B', password: 'password1' });
    expect(r.success).toBe(false);
  });
});

describe('CreateTournamentSchema', () => {
  it('applique les valeurs par défaut (XOF, maracana, PRIVATE)', () => {
    const r = CreateTournamentSchema.parse({ name: 'Coupe Abidjan', country: 'CI' });
    expect(r.currency).toBe('XOF');
    expect(r.sportKey).toBe('maracana');
    expect(r.visibility).toBe('PRIVATE');
  });
});
