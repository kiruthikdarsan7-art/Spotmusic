import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { User } from './users/user.entity';
import { Session } from './auth/session.entity';
import { PasswordReset } from './auth/password-reset.entity';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CatalogModule } from './catalog/catalog.module';
import { Album, Artist, Track } from './catalog/catalog.entities';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const prod = cfg.get('NODE_ENV') === 'production';
        const url = cfg.getOrThrow<string>('DATABASE_URL');
        // Hosted Postgres (Neon) requires SSL; its URL carries ?sslmode=require.
        const needsSsl = /[?&]sslmode=require/.test(url) || url.includes('ssl=true');
        return {
          type: 'postgres' as const,
          url,
          entities: [User, Session, PasswordReset, Artist, Album, Track],
          // Auto-sync is for development only. Use migrations in production.
          synchronize: !prod,
          ssl: prod || needsSsl ? { rejectUnauthorized: false } : false,
        };
      },
    }),
    UsersModule,
    AuthModule,
    CatalogModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
