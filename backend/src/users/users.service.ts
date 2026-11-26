import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../auth/session.entity';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
  ) {}

  async get(id: string): Promise<User> {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :id', { id })
      .getOne();
    if (!user) throw new NotFoundException();
    return user;
  }

  async update(id: string, patch: Partial<Pick<User, 'displayName' | 'avatarUrl' | 'publicProfile' | 'shareListeningActivity'>>) {
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    if (Object.keys(clean).length) await this.users.update({ id }, clean);
    return this.get(id);
  }

  /** Everything we hold about the person. Later phases add playlists, history and so on here. */
  async export(id: string) {
    const user = await this.get(id);
    const sessions = await this.sessions.find({ where: { userId: id }, order: { createdAt: 'DESC' } });
    return {
      exportedAt: new Date().toISOString(),
      account: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        emailVerifiedAt: user.emailVerifiedAt,
        publicProfile: user.publicProfile,
        shareListeningActivity: user.shareListeningActivity,
        signInMethods: [
          user.passwordHash ? 'password' : null,
          user.googleSub ? 'google' : null,
          user.appleSub ? 'apple' : null,
        ].filter(Boolean),
        createdAt: user.createdAt,
      },
      devices: sessions.map((s) => ({
        deviceName: s.deviceName,
        signedInAt: s.createdAt,
        revokedAt: s.revokedAt,
      })),
    };
  }

  /** Permanent. Sessions and reset tokens are removed with the account. */
  async delete(id: string): Promise<void> {
    await this.users.manager.transaction(async (m) => {
      await m.delete(Session, { userId: id });
      await m.query('DELETE FROM password_resets WHERE "userId" = $1', [id]);
      await m.delete(User, { id });
    });
  }
}
