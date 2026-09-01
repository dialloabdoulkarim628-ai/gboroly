import { parseCsv, rowsToObjects } from './csv';

export interface TeamRowInput {
  name: string;
  shortName?: string;
  phone?: string;
}

export interface ImportPreview {
  valid: TeamRowInput[];
  errors: Array<{ row: number; message: string }>;
  total: number;
}

/**
 * Valide un CSV d'équipes (colonnes : name, shortName?, phone?) — module PUR.
 * Détecte les noms manquants, trop courts, et les doublons intra-fichier.
 */
export function validateTeamsCsv(csv: string): ImportPreview {
  const objects = rowsToObjects(parseCsv(csv));
  const valid: TeamRowInput[] = [];
  const errors: Array<{ row: number; message: string }> = [];
  const seen = new Set<string>();

  objects.forEach((o, idx) => {
    const rowNum = idx + 2; // +1 en-tête, +1 base 1
    const name = (o.name ?? o.nom ?? '').trim();
    if (!name) {
      errors.push({ row: rowNum, message: 'Nom manquant' });
      return;
    }
    if (name.length < 2) {
      errors.push({ row: rowNum, message: `Nom trop court : "${name}"` });
      return;
    }
    const key = name.toLowerCase();
    if (seen.has(key)) {
      errors.push({ row: rowNum, message: `Doublon : "${name}"` });
      return;
    }
    seen.add(key);
    valid.push({
      name,
      shortName: (o.shortname ?? o.abbr ?? '').trim() || undefined,
      phone: (o.phone ?? o.telephone ?? o.tel ?? '').trim() || undefined,
    });
  });

  return { valid, errors, total: objects.length };
}
