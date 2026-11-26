import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  AppleDto,
  ForgotPasswordDto,
  GoogleDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto';
import { AuthedUser, CurrentUser, JwtAuthGuard } from './jwt-auth.guard';

// Credential endpoints get a much tighter limit than the global default.
const STRICT = { default: { limit: 10, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Throttle(STRICT) @Post('register')
  register(@Body() d: RegisterDto) {
    return this.auth.register(d.email, d.password, d.displayName, d.deviceName);
  }

  @Throttle(STRICT) @HttpCode(200) @Post('login')
  login(@Body() d: LoginDto) {
    return this.auth.login(d.email, d.password, d.deviceName);
  }

  @Throttle(STRICT) @HttpCode(200) @Post('google')
  google(@Body() d: GoogleDto) {
    return this.auth.loginWithGoogle(d.idToken, d.deviceName);
  }

  @Throttle(STRICT) @HttpCode(200) @Post('apple')
  apple(@Body() d: AppleDto) {
    return this.auth.loginWithApple(d.identityToken, d.displayName, d.deviceName);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } }) @HttpCode(200) @Post('refresh')
  refresh(@Body() d: RefreshDto) {
    return this.auth.refresh(d.refreshToken);
  }

  @HttpCode(204) @Post('logout')
  async logout(@Body() d: RefreshDto) {
    await this.auth.logout(d.refreshToken);
  }

  @UseGuards(JwtAuthGuard) @HttpCode(204) @Post('logout-all')
  async logoutAll(@CurrentUser() u: AuthedUser) {
    await this.auth.logoutAll(u.id);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } }) @HttpCode(204) @Post('forgot-password')
  async forgot(@Body() d: ForgotPasswordDto) {
    await this.auth.forgotPassword(d.email);
  }

  @Throttle(STRICT) @HttpCode(204) @Post('reset-password')
  async reset(@Body() d: ResetPasswordDto) {
    await this.auth.resetPassword(d.token, d.password);
  }
}
