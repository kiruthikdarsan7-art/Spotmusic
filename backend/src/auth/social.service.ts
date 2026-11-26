import { Injectable, NotImplementedException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface SocialIdentity {
  sub: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

function ids(value: string | undefined): string[] {
  return (value ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}

/** Verifies identity tokens issued by Google and Apple. Nothing here trusts the client's word. */
@Injectable()
export class SocialService {
  private readonly google = new OAuth2Client();

  constructor(private readonly cfg: ConfigService) {}

  async verifyGoogle(idToken: string): Promise<SocialIdentity> {
    const audience = ids(this.cfg.get('GOOGLE_CLIENT_IDS'));
    if (!audience.length) throw new NotImplementedException('Google sign-in is not configured');
    try {
      const ticket = await this.google.verifyIdToken({ idToken, audience });
      const p = ticket.getPayload();
      if (!p?.sub) throw new Error('no subject');
      return {
        sub: p.sub,
        email: p.email?.toLowerCase() ?? null,
        emailVerified: p.email_verified === true,
        name: p.name ?? null,
        picture: p.picture ?? null,
      };
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  async verifyApple(identityToken: string): Promise<SocialIdentity> {
    const audience = ids(this.cfg.get('APPLE_CLIENT_IDS'));
    if (!audience.length) throw new NotImplementedException('Apple sign-in is not configured');
    try {
      const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
        issuer: 'https://appleid.apple.com',
        audience,
      });
      if (!payload.sub) throw new Error('no subject');
      const verified = payload.email_verified === true || payload.email_verified === 'true';
      return {
        sub: payload.sub,
        email: typeof payload.email === 'string' ? payload.email.toLowerCase() : null,
        emailVerified: verified,
        name: null,
        picture: null,
      };
    } catch {
      throw new UnauthorizedException('Invalid Apple token');
    }
  }
}
