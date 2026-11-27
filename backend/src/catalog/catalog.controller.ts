import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthedUser } from '../auth/jwt-auth.guard';
import { CatalogService } from './catalog.service';
import { parseRange } from './range.util';
import { StorageService } from './storage.service';

const STREAM_TOKEN_HOURS = 12;

@Controller()
export class CatalogController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly storage: StorageService,
    private readonly jwt: JwtService,
  ) {}

  @UseGuards(JwtAuthGuard) @Get('catalog/home')
  home() {
    return this.catalog.home();
  }

  /** Liveness probe for the hosting platform. No auth needed. */
  @SkipThrottle() @Get('health')
  health() {
    return { status: 'ok' };
  }

  @UseGuards(JwtAuthGuard) @Get('catalog/albums/:id')
  album(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.album(id);
  }

  @UseGuards(JwtAuthGuard) @Get('catalog/artists/:id')
  artist(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.artist(id);
  }

  @UseGuards(JwtAuthGuard) @Get('catalog/search')
  search(@Query('q') q?: string) {
    const term = (q ?? '').trim();
    if (term.length < 1 || term.length > 100) throw new BadRequestException('q must be 1 to 100 characters');
    return this.catalog.search(term);
  }

  /**
   * Audio players cannot refresh a bearer token mid-queue, so they get one scoped token that is
   * only good for streaming. It cannot call any other endpoint (the auth guard rejects it).
   */
  @UseGuards(JwtAuthGuard) @Get('catalog/stream-token')
  async streamToken(@CurrentUser() u: AuthedUser) {
    const token = await this.jwt.signAsync(
      { sub: u.id, scope: 'stream' },
      { expiresIn: `${STREAM_TOKEN_HOURS}h` },
    );
    return { token, expiresIn: STREAM_TOKEN_HOURS * 3600 };
  }

  /** Byte-range streaming so players can seek and buffer without downloading the whole file. */
  @SkipThrottle() @Get('tracks/:id/stream')
  async stream(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('t') token: string | undefined,
    @Headers('range') range: string | undefined,
    @Res() res: Response,
  ) {
    try {
      const p = await this.jwt.verifyAsync<{ scope?: string }>(token ?? '');
      if (p.scope !== 'stream') throw new Error('wrong scope');
    } catch {
      throw new UnauthorizedException();
    }

    const { audioKey, mimeType } = await this.catalog.streamable(id);
    const file = await this.storage.get(audioKey);
    const r = parseRange(range, file.size);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, max-age=3600');

    if (r === 'invalid') {
      res.status(416).setHeader('Content-Range', `bytes */${file.size}`).end();
      return;
    }
    if (!r) {
      res.status(200).setHeader('Content-Length', file.size);
      file.open().pipe(res);
      return;
    }
    res.status(206);
    res.setHeader('Content-Range', `bytes ${r.start}-${r.end}/${file.size}`);
    res.setHeader('Content-Length', r.end - r.start + 1);
    file.open(r.start, r.end).pipe(res);
  }
}
