import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

export interface AccessTokenPayload {
  sub: string; // userId
}

/** Signe un access token JWT court (par défaut 15 min). */
export function signAccessToken(
  payload: AccessTokenPayload,
  secret: string,
  ttlSeconds: number,
): string {
  return jwt.sign(payload, secret, { expiresIn: ttlSeconds, algorithm: 'HS256' });
}

/** Vérifie un access token ; lève si invalide/expiré. */
export function verifyAccessToken(token: string, secret: string): AccessTokenPayload {
  const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
  if (typeof decoded === 'string' || !decoded.sub) {
    throw new Error('INVALID_TOKEN');
  }
  return { sub: String(decoded.sub) };
}

/** Génère un token opaque aléatoire (refresh token brut, remis au client). */
export function generateOpaqueToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/** Hash déterministe pour stockage (refresh tokens / codes) — jamais en clair en base. */
export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/** OTP numérique (vérification téléphone). */
export function generateNumericOtp(length = 6): string {
  const max = 10 ** length;
  const n = crypto.randomInt(0, max);
  return n.toString().padStart(length, '0');
}

/** Comparaison en temps constant (codes/OTP). */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
