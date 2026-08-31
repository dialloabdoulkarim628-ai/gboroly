import { describe, expect, it } from 'vitest';
import {
  generateNumericOtp,
  generateOpaqueToken,
  safeEqual,
  sha256,
  signAccessToken,
  verifyAccessToken,
} from './tokens';

const SECRET = 'test-secret';

describe('access token (JWT)', () => {
  it('signe et vérifie un access token', () => {
    const token = signAccessToken({ sub: 'user-1' }, SECRET, 900);
    expect(verifyAccessToken(token, SECRET).sub).toBe('user-1');
  });

  it('rejette une mauvaise signature', () => {
    const token = signAccessToken({ sub: 'user-1' }, SECRET, 900);
    expect(() => verifyAccessToken(token, 'autre-secret')).toThrow();
  });

  it('rejette un token expiré', () => {
    const token = signAccessToken({ sub: 'user-1' }, SECRET, -1);
    expect(() => verifyAccessToken(token, SECRET)).toThrow();
  });
});

describe('opaque tokens & codes', () => {
  it('génère des refresh tokens uniques', () => {
    expect(generateOpaqueToken()).not.toBe(generateOpaqueToken());
  });

  it('sha256 est déterministe', () => {
    expect(sha256('abc')).toBe(sha256('abc'));
    expect(sha256('abc')).not.toBe(sha256('abd'));
  });

  it('OTP a la bonne longueur', () => {
    expect(generateNumericOtp(6)).toMatch(/^[0-9]{6}$/);
  });

  it('safeEqual compare correctement', () => {
    expect(safeEqual('12345', '12345')).toBe(true);
    expect(safeEqual('12345', '54321')).toBe(false);
    expect(safeEqual('12345', '1234')).toBe(false);
  });
});
