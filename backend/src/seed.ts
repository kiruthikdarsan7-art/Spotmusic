import 'reflect-metadata';
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

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const db = app.get(DataSource);
  const storage = app.get(StorageService);

  if ((await db.getRepository(Artist).count()) > 0) {
    console.log('Catalog already has data. Nothing seeded.');
    await app.close();
    return;
  }

  let seed = 1;
  for (const a of CATALOG) {
    const artist = await db.getRepository(Artist).save({ name: a.artist, imageUrl: null, bio: null });
    for (const al of a.albums) {
      const album = await db.getRepository(Album).save({
        title: al.title, artistId: artist.id, coverUrl: null, releaseYear: al.year,
      });
      for (const [i, title] of al.tracks.entries()) {
        const { wav, durationMs } = makeWav({ rootHz: al.root, scale: al.scale, seconds: 24, seed: seed++ });
        const audioKey = `audio/${album.id}-${i + 1}.wav`;
        await storage.put(audioKey, wav);
        await db.getRepository(Track).save({
          title, artistId: artist.id, albumId: album.id, trackNumber: i + 1, durationMs,
          genre: al.genre, audioKey, mimeType: 'audio/wav', available: true, ...DEV_RIGHTS,
          licenseNote: 'Synthesised by the seed script. No third-party material.',
        });
      }
    }
  }
  console.log('Seeded', await db.getRepository(Track).count(), 'tracks.');
  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
