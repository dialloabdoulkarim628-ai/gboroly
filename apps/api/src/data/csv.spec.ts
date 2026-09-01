import { describe, expect, it } from 'vitest';
import { parseCsv, rowsToObjects, toCsv } from './csv';
import { validateTeamsCsv } from './import-teams';

describe('parseCsv', () => {
  it('parse simple + guillemets/virgules échappés', () => {
    const csv = 'name,city\nFC Abobo,Abidjan\n"AS, Cocody","Cocody"\n"Il dit ""salut""",X';
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(4);
    expect(rows[2]).toEqual(['AS, Cocody', 'Cocody']);
    expect(rows[3]![0]).toBe('Il dit "salut"');
  });

  it('ignore les lignes vides', () => {
    expect(parseCsv('a\n\n\nb')).toHaveLength(2);
  });
});

describe('toCsv', () => {
  it('sérialise + échappe', () => {
    const out = toCsv(['name', 'pts'], [{ name: 'AS, Cocody', pts: 7 }]);
    expect(out).toBe('name,pts\n"AS, Cocody",7');
  });
});

describe('rowsToObjects', () => {
  it('mappe par en-tête normalisé', () => {
    const objs = rowsToObjects(parseCsv('Name,Phone\nFC Abobo,0700'));
    expect(objs[0]).toEqual({ name: 'FC Abobo', phone: '0700' });
  });
});

describe('validateTeamsCsv', () => {
  it('valide, signale manquants/courts/doublons', () => {
    const csv = 'name,phone\nFC Abobo,0700\n,0800\nX,0900\nFC Abobo,0100';
    const res = validateTeamsCsv(csv);
    expect(res.valid.map((v) => v.name)).toEqual(['FC Abobo']);
    expect(res.errors).toHaveLength(3); // manquant, trop court, doublon
    expect(res.errors.map((e) => e.message).join(' ')).toMatch(/manquant/i);
  });
});
