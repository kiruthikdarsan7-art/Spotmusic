import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'fs';
import { mkdir, stat, writeFile } from 'fs/promises';
import { dirname, isAbsolute, join, normalize, sep } from 'path';
import type { Readable } from 'stream';

export interface StoredObject {
  size: number;
  open(start?: number, end?: number): Readable;
}

/**
 * Audio storage. This is the local-disk driver for development.
 * Production swaps this class for an S3 / R2 / GCS implementation behind the same two methods,
 * with the CDN in front. Controllers only talk to this interface.
 */
@Injectable()
export class StorageService {
  private readonly root: string;

  constructor(cfg: ConfigService) {
    const dir = cfg.get<string>('STORAGE_DIR') ?? 'storage';
    // Absolute paths (e.g. /tmp on serverless) are used as-is; relative ones
    // stay relative to the working directory, as before.
    this.root = isAbsolute(dir) ? dir : join(process.cwd(), dir);
  }

  private resolve(key: string): string {
    const full = normalize(join(this.root, key));
    // Keys come from our database, but never allow a path to escape the storage root.
    if (!full.startsWith(this.root + sep)) throw new NotFoundException();
    return full;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const full = this.resolve(key);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, data);
  }

  async get(key: string): Promise<StoredObject> {
    const full = this.resolve(key);
    try {
      const { size } = await stat(full);
      return { size, open: (start, end) => createReadStream(full, { start, end }) };
    } catch {
      throw new NotFoundException('Audio file missing');
    }
  }
}
