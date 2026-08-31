import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../common/decorators';
import { verifyAccessToken } from '../lib/tokens';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: { id: string } }>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException({ error: { code: 'UNAUTHENTICATED', message: 'Token requis' } });
    }

    try {
      const payload = verifyAccessToken(
        header.slice(7),
        this.config.get<string>('JWT_SECRET', 'dev-secret'),
      );
      request.user = { id: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException({ error: { code: 'INVALID_TOKEN', message: 'Token invalide' } });
    }
  }
}
