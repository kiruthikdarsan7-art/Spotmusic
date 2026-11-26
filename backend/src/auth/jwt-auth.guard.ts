import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface AuthedUser {
  id: string;
  familyId: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers['authorization'];
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException();
    try {
      const p = await this.jwt.verifyAsync<{ sub: string; fid: string; scope?: string }>(token);
      // Stream tokens are for /tracks/:id/stream only and must not work as login tokens.
      if (p.scope) throw new Error('scoped token');
      req.user = { id: p.sub, familyId: p.fid } satisfies AuthedUser;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthedUser => ctx.switchToHttp().getRequest().user,
);
