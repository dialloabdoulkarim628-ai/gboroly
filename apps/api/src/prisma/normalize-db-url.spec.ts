import { describe, expect, it } from 'vitest';
import { normalizeDbUrl } from './prisma.service';

describe('normalizeDbUrl', () => {
  it('ajoute pgbouncer=true sur une URL poolée Supabase (6543) qui l’omet', () => {
    const out = normalizeDbUrl(
      'postgresql://u:p@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
    );
    expect(out).toContain('pgbouncer=true');
    expect(out).toContain('connection_limit=1');
  });

  it('ne double pas le paramètre si déjà présent', () => {
    const raw =
      'postgresql://u:p@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1';
    expect(normalizeDbUrl(raw)).toBe(raw);
  });

  it('laisse intacte une URL du pooler session (5432)', () => {
    const raw = 'postgresql://u:p@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';
    // Mode session → prepared statements OK, pas de normalisation.
    expect(normalizeDbUrl(raw)).toBe(raw);
  });

  it('laisse intacte une URL Postgres locale (CI/dev)', () => {
    const raw = 'postgresql://postgres:postgres@localhost:5432/gboroly';
    expect(normalizeDbUrl(raw)).toBe(raw);
  });

  it('tolère une valeur indéfinie', () => {
    expect(normalizeDbUrl(undefined)).toBeUndefined();
  });
});
