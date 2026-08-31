import { hash, verify } from '@node-rs/argon2';

/**
 * Hash de mot de passe — Argon2id (par défaut dans @node-rs/argon2, binaire précompilé).
 * Voir docs/SECURITY.md. Ne jamais logger le mot de passe ni le hash.
 */
export function hashPassword(plain: string): Promise<string> {
  return hash(plain, {
    memoryCost: 19456, // ~19 Mo
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashed, plain);
  } catch {
    return false;
  }
}
