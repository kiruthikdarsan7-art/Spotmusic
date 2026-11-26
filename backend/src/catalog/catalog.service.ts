import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Album, Artist, Track } from './catalog.entities';

export interface TrackDto {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  albumId: string;
  albumTitle: string;
  coverUrl: string | null;
  durationMs: number;
  trackNumber: number;
  genre: string | null;
}

export interface AlbumDto {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  coverUrl: string | null;
  releaseYear: number | null;
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Artist) private readonly artists: Repository<Artist>,
    @InjectRepository(Album) private readonly albums: Repository<Album>,
    @InjectRepository(Track) private readonly tracks: Repository<Track>,
  ) {}

  private trackQuery() {
    return this.tracks
      .createQueryBuilder('t')
      .innerJoin(Artist, 'ar', 'ar.id = t.artistId')
      .innerJoin(Album, 'al', 'al.id = t.albumId')
      .select([
        't.id AS id', 't.title AS title', 't.artistId AS "artistId"', 'ar.name AS "artistName"',
        't.albumId AS "albumId"', 'al.title AS "albumTitle"', 'al.coverUrl AS "coverUrl"',
        't.durationMs AS "durationMs"', 't.trackNumber AS "trackNumber"', 't.genre AS genre',
      ])
      .where('t.available = true');
  }

  private albumQuery() {
    return this.albums
      .createQueryBuilder('al')
      .innerJoin(Artist, 'ar', 'ar.id = al.artistId')
      .select([
        'al.id AS id', 'al.title AS title', 'al.artistId AS "artistId"', 'ar.name AS "artistName"',
        'al.coverUrl AS "coverUrl"', 'al.releaseYear AS "releaseYear"',
      ]);
  }

  async home() {
    const [newAlbums, tracks, artists] = await Promise.all([
      this.albumQuery().orderBy('al.createdAt', 'DESC').limit(20).getRawMany<AlbumDto>(),
      this.trackQuery().orderBy('t.createdAt', 'DESC').addOrderBy('t.trackNumber', 'ASC').limit(30).getRawMany<TrackDto>(),
      this.artists.find({ order: { createdAt: 'DESC' }, take: 20 }),
    ]);
    return { newAlbums, tracks, artists };
  }

  async album(id: string) {
    const album = await this.albumQuery().where('al.id = :id', { id }).getRawOne<AlbumDto>();
    if (!album) throw new NotFoundException();
    const tracks = await this.trackQuery()
      .andWhere('t.albumId = :id', { id })
      .orderBy('t.trackNumber', 'ASC')
      .getRawMany<TrackDto>();
    return { album, tracks };
  }

  async artist(id: string) {
    const artist = await this.artists.findOne({ where: { id } });
    if (!artist) throw new NotFoundException();
    const [albums, tracks] = await Promise.all([
      this.albumQuery().where('al.artistId = :id', { id }).orderBy('al.releaseYear', 'DESC').getRawMany<AlbumDto>(),
      this.trackQuery().andWhere('t.artistId = :id', { id }).orderBy('t.title', 'ASC').limit(50).getRawMany<TrackDto>(),
    ]);
    return { artist, albums, tracks };
  }

  /** Substring search across songs, albums and artists. Fuzzy matching and lyrics come in the search phase. */
  async search(q: string) {
    const term = `%${escapeLike(q.trim())}%`;
    const [tracks, albums, artists] = await Promise.all([
      this.trackQuery()
        .andWhere('(t.title ILIKE :term OR ar.name ILIKE :term OR al.title ILIKE :term)', { term })
        .orderBy('t.title', 'ASC').limit(25).getRawMany<TrackDto>(),
      this.albumQuery()
        .where('(al.title ILIKE :term OR ar.name ILIKE :term)', { term })
        .orderBy('al.title', 'ASC').limit(15).getRawMany<AlbumDto>(),
      this.artists
        .createQueryBuilder('a').where('a.name ILIKE :term', { term }).orderBy('a.name', 'ASC').limit(15).getMany(),
    ]);
    return { tracks, albums, artists };
  }

  /** Only tracks that are switched on are streamable. Returns the storage details. */
  async streamable(id: string) {
    const t = await this.tracks.findOne({ where: { id, available: true } });
    if (!t) throw new NotFoundException();
    return { audioKey: t.audioKey, mimeType: t.mimeType };
  }
}
