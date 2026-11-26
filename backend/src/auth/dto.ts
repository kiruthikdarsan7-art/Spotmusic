import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

const lower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class RegisterDto {
  @Transform(lower) @IsEmail() @MaxLength(254) email: string;
  @IsString() @MinLength(10) @MaxLength(128) password: string;
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(60) displayName: string;
  @IsOptional() @IsString() @MaxLength(80) deviceName?: string;
}

export class LoginDto {
  @Transform(lower) @IsEmail() @MaxLength(254) email: string;
  @IsString() @MaxLength(128) password: string;
  @IsOptional() @IsString() @MaxLength(80) deviceName?: string;
}

export class RefreshDto {
  @IsString() @MaxLength(200) refreshToken: string;
}

export class GoogleDto {
  @IsString() @MaxLength(4096) idToken: string;
  @IsOptional() @IsString() @MaxLength(80) deviceName?: string;
}

export class AppleDto {
  @IsString() @MaxLength(4096) identityToken: string;
  /** Apple only gives the name on the first sign-in, and only to the app. */
  @IsOptional() @Transform(trim) @IsString() @MaxLength(60) displayName?: string;
  @IsOptional() @IsString() @MaxLength(80) deviceName?: string;
}

export class ForgotPasswordDto {
  @Transform(lower) @IsEmail() @MaxLength(254) email: string;
}

export class ResetPasswordDto {
  @IsString() @MaxLength(200) token: string;
  @IsString() @MinLength(10) @MaxLength(128) password: string;
}

export class UpdateProfileDto {
  @IsOptional() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(60) displayName?: string;
  @IsOptional() @IsUrl({ protocols: ['https'], require_protocol: true }) @MaxLength(500) avatarUrl?: string;
  @IsOptional() @IsBoolean() publicProfile?: boolean;
  @IsOptional() @IsBoolean() shareListeningActivity?: boolean;
}

export class ChangePasswordDto {
  @IsOptional() @IsString() @MaxLength(128) currentPassword?: string;
  @IsString() @MinLength(10) @MaxLength(128) newPassword: string;
}

export class DeleteAccountDto {
  /** Required for accounts that have a password. */
  @IsOptional() @IsString() @MaxLength(128) password?: string;
}
