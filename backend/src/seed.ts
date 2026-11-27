import 'reflect-metadata';
import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { Album, Artist, Track } from './catalog/catalog.entities';
import { StorageService } from './catalog/storage.service';
import { makeWav, ToneSpec } from './catalog/tone.util';

/**
 * Development catalog. Every track is a generated tone melody (see tone.util.ts), so the
 * licence is honest: we made it. Replace with real, licensed content through the admin
 * dashboard or a distributor integration before launch.
 */
const DEV_RIGHTS = { rightsHolder: 'SpotMusic development fixtures', licenseType: 'CC0 (generated)' };

const CATALOG: {
  artist: string;
  albums: { title: string; year: number; genre: string; root: number; scale: ToneSpec['scale']; tracks: string[] }[];
}[] = [
  {
    artist: 'Test Signal',
    albums: [
      { title: 'Sine Sessions', year: 2026, genre: 'Ambient', root: 196, scale: 'pentatonic', tracks: ['Warm Up', 'Slow Orbit', 'Soft Static'] },
      { title: 'Low Tide', year: 2025, genre: 'Chill', root: 164.81, scale: 'minor', tracks: ['Shoreline', 'Drift', 'Undertow'] },
    ],
  },
  {
    artist: 'Pilot Tones',
    albums: [{ title: 'Morning Check', year: 2026, genre: 'Pop', root: 261.63, scale: 'major', tracks: ['First Light', 'Coffee Loop', 'Window Seat'] }],
  },
  {
    artist: 'Quiet Lab',
    albums: [{ title: 'Field Notes', year: 2024, genre: 'Focus', root: 220, scale: 'pentatonic', tracks: ['Desk Lamp', 'Margin Notes', 'Deep Work'] }],
  },
];

/**
 * Idempotent: safe to run on every start. Free hosting wipes the local disk on
 * redeploy while the database rows survive, so any audio file that is missing
 * is regenerated here instead of leaving a track that cannot play.
 * Exported so serverless entry points can seed after initialising the app.
 */
export async function seedCatalog(app: INestApplicationContext) {
  const db = app.get(DataSource);
  const storage = app.get(StorageService);

  let seed = 1;
  let created = 0;
  let restored = 0;
  for (const a of CATALOG) {
    let artist = await db.getRepository(Artist).findOne({ where: { name: a.artist } });
    if (!artist) {
      artist = await db.getRepository(Artist).save({ name: a.artist, imageUrl: null, bio: null });
    }
    for (const al of a.albums) {
      let album = await db.getRepository(Album).findOne({ where: { title: al.title, artistId: artist.id } });
      if (!album) {
        album = await db.getRepository(Album).save({
          title: al.title, artistId: artist.id, coverUrl: null, releaseYear: al.year,
        });
      }
      for (const [i, title] of al.tracks.entries()) {
        const trackSeed = seed++;
        let track = await db.getRepository(Track).findOne({ where: { title, albumId: album.id } });
        if (!track) {
          const { wav, durationMs } = makeWav({ rootHz: al.root, scale: al.scale, seconds: 24, seed: trackSeed });
          const audioKey = `audio/${album.id}-${i + 1}.wav`;
          await storage.put(audioKey, wav);
          track = await db.getRepository(Track).save({
            title, artistId: artist.id, albumId: album.id, trackNumber: i + 1, durationMs,
            genre: al.genre, audioKey, mimeType: 'audio/wav', available: true, ...DEV_RIGHTS,
            licenseNote: 'Synthesised by the seed script. No third-party material.',
          });
          created++;
        } else {
          try {
            await storage.get(track.audioKey);
          } catch {
            const { wav } = makeWav({ rootHz: al.root, scale: al.scale, seconds: 24, seed: trackSeed });
            await storage.put(track.audioKey, wav);
            restored++;
          }
        }
      }
    }
  }
  return { created, restored, total: await db.getRepository(Track).count() };
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const { created, restored, total } = await seedCatalog(app);
    console.log(`Seed check done. Created ${created} tracks, restored ${restored} audio files, total ${total} tracks.`);
  } finally {
    await app.close();
  }
}

// Only run as a script when executed directly (node dist/seed.js).
if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
