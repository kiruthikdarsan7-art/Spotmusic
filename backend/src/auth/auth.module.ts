import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Session } from './session.entity';
import { PasswordReset } from './password-reset.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { MailService } from './mail.service';
import { SocialService } from './social.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Session, PasswordReset]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const secret = cfg.getOrThrow<string>('JWT_ACCESS_SECRET');
        if (secret.length < 32) throw new Error('JWT_ACCESS_SECRET must be at least 32 characters');
        return { secret, signOptions: { algorithm: 'HS256' }, verifyOptions: { algorithms: ['HS256'] } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, MailService, SocialService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
