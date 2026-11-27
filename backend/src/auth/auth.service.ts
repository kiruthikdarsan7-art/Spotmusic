import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Session } from './session.entity';
import { PasswordReset } from './password-reset.entity';
import { hashPassword, newOpaqueToken, sha256, verifyPassword } from './crypto.util';
import { MailService } from './mail.service';
import { SocialIdentity, SocialService } from './social.service';

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  hasPassword: boolean;
  publicProfile: boolean;
  shareListeningActivity: boolean;
  createdAt: Date;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  user: PublicUser;
}

const RESET_TTL_MS = 30 * 60 * 1000;
// A real hash of a throwaway password, so unknown emails cost the same time as wrong passwords.
let dummyHash: Promise<string> | null = null;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    @InjectRepository(PasswordReset) private readonly resets: Repository<PasswordReset>,
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
    private readonly mail: MailService,
    private readonly social: SocialService,
  ) {}

  // ---------- public user shape ----------

  toPublic(u: User & { passwordHash?: string | null }): PublicUser {
    return {
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      emailVerified: !!u.emailVerifiedAt,
      hasPassword: !!u.passwordHash,
      publicProfile: u.publicProfile,
      shareListeningActivity: u.shareListeningActivity,
      createdAt: u.createdAt,
    };
  }

  private withPassword(where: { id?: string; email?: string }) {
    const qb = this.users.createQueryBuilder('u').addSelect('u.passwordHash');
    if (where.id) qb.where('u.id = :id', { id: where.id });
    if (where.email) qb.where('u.email = :email', { email: where.email });
    return qb.getOne();
  }

  // ---------- email + password ----------

  async register(
    email: string,
    password: string,
    displayName: string,
    deviceName?: string,
  ): Promise<AuthResult> {
    if (await this.users.exist({ where: { email } })) {
      throw new ConflictException('An account with this email already exists');
    }
    const user = await this.users.save(
      this.users.create({
        email,
        displayName,
        passwordHash: await hashPassword(password),
        avatarUrl: null,
        emailVerifiedAt: null,
      }),
    );
    return this.issue(user, deviceName);
  }

  async login(email: string, password: string, deviceName?: string): Promise<AuthResult> {
    const user = await this.withPassword({ email });
    dummyHash ??= hashPassword('not-a-real-password-for-timing');
    const ok = user?.passwordHash
      ? await verifyPassword(password, user.passwordHash)
      : (await verifyPassword(password, await dummyHash), false);
    if (!user || !ok) throw new UnauthorizedException('Incorrect email or password');
    return this.issue(user, deviceName);
  }

  // ---------- social ----------

  async loginWithGoogle(idToken: string, deviceName?: string): Promise<AuthResult> {
    const id = await this.social.verifyGoogle(idToken);
    return this.issue(await this.findOrCreateSocial('google', id, null), deviceName);
  }

  async loginWithApple(
    identityToken: string,
    displayName?: string,
    deviceName?: string,
  ): Promise<AuthResult> {
    const id = await this.social.verifyApple(identityToken);
    return this.issue(await this.findOrCreateSocial('apple', id, displayName ?? null), deviceName);
  }

  private async findOrCreateSocial(
    provider: 'google' | 'apple',
    id: SocialIdentity,
    suppliedName: string | null,
  ): Promise<User> {
    const col = provider === 'google' ? 'googleSub' : 'appleSub';

    const bySub = await this.users.findOne({
      where: (provider === 'google' ? { googleSub: id.sub } : { appleSub: id.sub }) as any,
    });
    if (bySub) return bySub;

    if (!id.email) throw new UnauthorizedException('The provider did not share an email address');

    const byEmail = await this.users.findOne({ where: { email: id.email } });
    if (byEmail) {
      // Only link to an existing account when the provider vouches for the email.
      // Otherwise someone could take over an account by claiming its address.
      if (!id.emailVerified) {
        throw new ForbiddenException('This email is not verified with the provider');
      }
      byEmail[col] = id.sub;
      byEmail.emailVerifiedAt ??= new Date();
      return this.users.save(byEmail);
    }

    const fresh: Partial<User> = {
      email: id.email,
      displayName: (suppliedName ?? id.name ?? id.email.split('@')[0]).slice(0, 60),
      avatarUrl: id.picture && id.picture.startsWith('https://') ? id.picture : null,
      passwordHash: null,
      emailVerifiedAt: id.emailVerified ? new Date() : null,
    };
    fresh[col] = id.sub;
    return this.users.save(this.users.create(fresh));
  }

  // ---------- sessions and tokens ----------

  private async issue(user: User, deviceName?: string, familyId: string = randomUUID()): Promise<AuthResult> {
    const refreshToken = newOpaqueToken();
    const days = Number(this.cfg.get('REFRESH_TOKEN_TTL_DAYS') ?? 60);
    await this.sessions.save(
      this.sessions.create({
        userId: user.id,
        familyId,
        tokenHash: sha256(refreshToken),
        deviceName: deviceName?.slice(0, 80) ?? null,
        expiresAt: new Date(Date.now() + days * 86_400_000),
        revokedAt: null,
      }),
    );
    const ttl = this.cfg.get<string>('ACCESS_TOKEN_TTL') ?? '15m';
    const accessToken = await this.jwt.signAsync({ sub: user.id, fid: familyId }, { expiresIn: ttl });
    const { exp, iat } = this.jwt.decode(accessToken) as { exp: number; iat: number };
    return { accessToken, refreshToken, expiresIn: exp - iat, user: this.toPublic(user) };
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const session = await this.sessions.findOne({ where: { tokenHash: sha256(refreshToken) } });
    if (!session) throw new UnauthorizedException('Invalid refresh token');

    if (session.revokedAt) {
      // A rotated-out token was presented again: it may have been stolen. End the whole device family.
      await this.sessions.update({ familyId: session.familyId, revokedAt: IsNull() }, { revokedAt: new Date() });
      throw new UnauthorizedException('Session expired, please sign in again');
    }
    if (session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Session expired, please sign in again');
    }

    const user = await this.users.findOne({ where: { id: session.userId } });
    if (!user) throw new UnauthorizedException('Invalid refresh token');

    session.revokedAt = new Date();
    await this.sessions.save(session);
    return this.issue(user, session.deviceName ?? undefined, session.familyId);
  }

  async logout(refreshToken: string): Promise<void> {
    const session = await this.sessions.findOne({ where: { tokenHash: sha256(refreshToken) } });
    if (session) {
      await this.sessions.update({ familyId: session.familyId, revokedAt: IsNull() }, { revokedAt: new Date() });
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessions.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  async listDevices(userId: string, currentFamily?: string) {
    const rows = await this.sessions.find({
      where: { userId, revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      order: { createdAt: 'DESC' },
    });
    // One row per device (family): the newest live token.
    const seen = new Set<string>();
    return rows
      .filter((s) => (seen.has(s.familyId) ? false : (seen.add(s.familyId), true)))
      .map((s) => ({
        id: s.familyId,
        deviceName: s.deviceName ?? 'Unknown device',
        signedInAt: s.createdAt,
        current: s.familyId === currentFamily,
      }));
  }

  async revokeDevice(userId: string, familyId: string): Promise<void> {
    await this.sessions.update({ userId, familyId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  // ---------- password reset / change ----------

  /** Always resolves the same way, so it cannot be used to find out which emails have accounts. */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findOne({ where: { email } });
    if (!user) return;
    const token = newOpaqueToken();
    await this.resets.save(
      this.resets.create({
        userId: user.id,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
        usedAt: null,
      }),
    );
    await this.mail.sendPasswordReset(user.email, token);
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const row = await this.resets.findOne({ where: { tokenHash: sha256(token) } });
    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('This reset link is invalid or has expired');
    }
    row.usedAt = new Date();
    await this.resets.save(row);
    await this.users.update({ id: row.userId }, { passwordHash: await hashPassword(password) });
    await this.logoutAll(row.userId); // a reset signs out every device
  }

  async changePassword(userId: string, current: string | undefined, next: string): Promise<void> {
    const user = await this.withPassword({ id: userId });
    if (!user) throw new UnauthorizedException();
    if (user.passwordHash) {
      if (!current || !(await verifyPassword(current, user.passwordHash))) {
        throw new ForbiddenException('Current password is incorrect');
      }
    }
    await this.users.update({ id: userId }, { passwordHash: await hashPassword(next) });
    await this.logoutAll(userId);
  }

  /** Used by account deletion: confirms the person is who they say before destroying data. */
  async confirmPassword(userId: string, password?: string): Promise<void> {
    const user = await this.withPassword({ id: userId });
    if (!user) throw new UnauthorizedException();
    if (user.passwordHash && (!password || !(await verifyPassword(password, user.passwordHash)))) {
      throw new ForbiddenException('Password is incorrect');
    }
  }
}
