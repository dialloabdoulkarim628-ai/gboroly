/** Slugify — génère un slug URL-safe. Voir docs/DATABASE.md (unicité par scope). */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // supprime les diacritiques combinants
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Ajoute un suffixe court anti-collision (ex. "tournoi-abidjan-2026-x7a2"). */
export function slugWithSuffix(input: string, suffixLength = 4): string {
  const base = slugify(input);
  const suffix = Math.random()
    .toString(36)
    .slice(2, 2 + suffixLength);
  return `${base}-${suffix}`;
}
