import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthTokenType, Prisma, User } from '@gboroly/database';
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
  VerifyPhoneInput,
} from '@gboroly/validation';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword, verifyPassword } from './lib/password';
import {
  generateNumericOtp,
  generateOpaqueToken,
  safeEqual,
  sha256,
  signAccessToken,
} from './lib/tokens';

export interface RequestContext {
  userAgent?: string;
  ip?: string;
}

const OTP_MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ─────────────────────────── Register / Login ───────────────────────────

  async register(input: RegisterInput, ctx: RequestContext) {
    await this.assertIdentifierAvailable(input.email, input.phone);

    const user = await this.prisma.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email ?? null,
        phone: input.phone ?? null,
        passwordHash: await hashPassword(input.password),
      },
    });

    const verification = await this.createVerificationChallenge(user);
    const tokens = await this.issueTokens(user, ctx);
    return { user: this.sanitize(user), ...tokens, verification };
  }

  async login(input: LoginInput, ctx: RequestContext) {
    const user = await this.findByIdentifier(input.identifier);
    if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, input.password))) {
      throw new UnauthorizedException(err('INVALID_CREDENTIALS', 'Identifiants invalides'));
    }
    const tokens = await this.issueTokens(user, ctx);
    return { user: this.sanitize(user), ...tokens };
  }

  // ─────────────────────────── Tokens / Sessions ───────────────────────────

  async issueTokens(user: User, ctx: RequestContext) {
    const accessToken = signAccessToken(
      { sub: user.id },
      this.config.get<string>('JWT_SECRET', 'dev-secret'),
      Number(this.config.get<string>('JWT_ACCESS_TTL', '900')),
    );

    const rawRefresh = generateOpaqueToken();
    const refreshTtl = Number(this.config.get<string>('JWT_REFRESH_TTL', '2592000'));
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(rawRefresh),
        userAgent: ctx.userAgent,
        ip: ctx.ip,
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
      },
    });

    return { accessToken, refreshToken: rawRefresh };
  }

  async refresh(rawRefresh: string, ctx: RequestContext) {
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(rawRefresh) },
    });
    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      throw new UnauthorizedException(err('INVALID_REFRESH_TOKEN', 'Session invalide'));
    }

    const user = await this.prisma.user.findUnique({ where: { id: existing.userId } });
    if (!user) throw new UnauthorizedException(err('INVALID_REFRESH_TOKEN', 'Session invalide'));

    // Rotation : révoquer l'ancien, émettre un nouveau couple.
    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
    const tokens = await this.issueTokens(user, ctx);
    return { user: this.sanitize(user), ...tokens };
  }

  async logout(rawRefresh: string) {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(rawRefresh), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  // ─────────────────────────── Password reset ───────────────────────────

  async forgotPassword(input: ForgotPasswordInput) {
    const user = await this.findByIdentifier(input.identifier);
    // Anti-énumération : réponse générique. En dev, on renvoie le code.
    if (!user) return { sent: true };

    const code = generateOpaqueToken(24);
    await this.createAuthToken(user.id, AuthTokenType.PASSWORD_RESET, code, 30 * 60);
    return { sent: true, ...this.devHint(user.id, code) };
  }

  async resetPassword(input: ResetPasswordInput) {
    await this.consumeAuthToken(input.userId, AuthTokenType.PASSWORD_RESET, input.code);
    await this.prisma.user.update({
      where: { id: input.userId },
      data: { passwordHash: await hashPassword(input.newPassword) },
    });
    // Sécurité : révoquer toutes les sessions actives.
    await this.prisma.refreshToken.updateMany({
      where: { userId: input.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  // ─────────────────────────── Verifications ───────────────────────────

  async verifyEmail(input: VerifyEmailInput) {
    await this.consumeAuthToken(input.userId, AuthTokenType.EMAIL_VERIFY, input.code);
    await this.prisma.user.update({
      where: { id: input.userId },
      data: { emailVerifiedAt: new Date() },
    });
    return { success: true };
  }

  async verifyPhone(input: VerifyPhoneInput) {
    await this.consumeAuthToken(input.userId, AuthTokenType.PHONE_OTP, input.code);
    await this.prisma.user.update({
      where: { id: input.userId },
      data: { phoneVerifiedAt: new Date() },
    });
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(err('USER_NOT_FOUND', 'Utilisateur introuvable'));
    return this.sanitize(user);
  }

  // ─────────────────────────── Helpers ───────────────────────────

  private async assertIdentifierAvailable(email?: string, phone?: string) {
    const or: Prisma.UserWhereInput[] = [];
    if (email) or.push({ email });
    if (phone) or.push({ phone });
    if (or.length === 0) return;
    const existing = await this.prisma.user.findFirst({ where: { OR: or } });
    if (existing) {
      throw new ConflictException(err('USER_ALREADY_EXISTS', 'Email ou téléphone déjà utilisé'));
    }
  }

  private findByIdentifier(identifier: string): Promise<User | null> {
    const isEmail = identifier.includes('@');
    return this.prisma.user.findFirst({
      where: isEmail ? { email: identifier } : { phone: identifier },
    });
  }

  private async createVerificationChallenge(user: User) {
    if (user.email) {
      const code = generateOpaqueToken(24);
      await this.createAuthToken(user.id, AuthTokenType.EMAIL_VERIFY, code, 24 * 3600);
      return { channel: 'EMAIL' as const, ...this.devHint(user.id, code) };
    }
    const code = generateNumericOtp(6);
    await this.createAuthToken(user.id, AuthTokenType.PHONE_OTP, code, 10 * 60);
    return { channel: 'PHONE' as const, ...this.devHint(user.id, code) };
  }

  private async createAuthToken(
    userId: string,
    type: AuthTokenType,
    code: string,
    ttlSeconds: number,
  ) {
    await this.prisma.authToken.create({
      data: {
        userId,
        type,
        codeHash: sha256(code),
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      },
    });
  }

  private async consumeAuthToken(userId: string, type: AuthTokenType, code: string) {
    const token = await this.prisma.authToken.findFirst({
      where: { userId, type, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!token || token.expiresAt < new Date() || token.attempts >= OTP_MAX_ATTEMPTS) {
      throw new UnauthorizedException(err('INVALID_CODE', 'Code invalide ou expiré'));
    }
    if (!safeEqual(sha256(code), token.codeHash)) {
      await this.prisma.authToken.update({
        where: { id: token.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException(err('INVALID_CODE', 'Code invalide ou expiré'));
    }
    await this.prisma.authToken.update({
      where: { id: token.id },
      data: { consumedAt: new Date() },
    });
  }

  /** En dev uniquement : expose le code pour tester sans provider email/SMS (Phase 11). */
  private devHint(userId: string, code: string) {
    if (this.config.get<string>('NODE_ENV') === 'production') return {};
    return { userId, devCode: code };
  }

  private sanitize(user: User) {
    const { passwordHash: _pw, ...safe } = user;
    return safe;
  }
}

function err(code: string, message: string) {
  return { error: { code, message } };
}
