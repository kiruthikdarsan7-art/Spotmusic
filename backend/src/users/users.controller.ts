import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { ChangePasswordDto, DeleteAccountDto, UpdateProfileDto } from '../auth/dto';
import { AuthedUser, CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller('users/me')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  async me(@CurrentUser() u: AuthedUser) {
    return this.auth.toPublic(await this.users.get(u.id));
  }

  @Patch()
  async update(@CurrentUser() u: AuthedUser, @Body() d: UpdateProfileDto) {
    return this.auth.toPublic(await this.users.update(u.id, d));
  }

  @HttpCode(204) @Post('password')
  async changePassword(@CurrentUser() u: AuthedUser, @Body() d: ChangePasswordDto) {
    await this.auth.changePassword(u.id, d.currentPassword, d.newPassword);
  }

  @Get('devices')
  devices(@CurrentUser() u: AuthedUser) {
    return this.auth.listDevices(u.id, u.familyId);
  }

  @HttpCode(204) @Delete('devices/:id')
  async removeDevice(@CurrentUser() u: AuthedUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.auth.revokeDevice(u.id, id);
  }

  @Get('export')
  export(@CurrentUser() u: AuthedUser) {
    return this.users.export(u.id);
  }

  @HttpCode(204) @Delete()
  async remove(@CurrentUser() u: AuthedUser, @Body() d: DeleteAccountDto) {
    await this.auth.confirmPassword(u.id, d.password);
    await this.users.delete(u.id);
  }
}
