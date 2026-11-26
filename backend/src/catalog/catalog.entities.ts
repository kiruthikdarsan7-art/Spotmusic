import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('artists')
export class Artist {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Index()
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true }) imageUrl: string | null;
  @Column({ type: 'text', nullable: true }) bio: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}

@Entity('albums')
export class Album {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Index()
  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Index()
  @Column('uuid')
  artistId: string;

  @Column({ type: 'varchar', length: 500, nullable: true }) coverUrl: string | null;
  @Column({ type: 'int', nullable: true }) releaseYear: number | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}

@Entity('tracks')
export class Track {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Index()
  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Index()
  @Column('uuid')
  artistId: string;

  @Index()
  @Column('uuid')
  albumId: string;

  @Column({ type: 'int', default: 1 }) trackNumber: number;
  @Column({ type: 'int' }) durationMs: number;

  @Index()
  @Column({ type: 'varchar', length: 60, nullable: true })
  genre: string | null;

  /** Key of the audio file in the storage driver. Never sent to clients. */
  @Column({ type: 'varchar', length: 300 }) audioKey: string;
  @Column({ type: 'varchar', length: 60, default: 'audio/mpeg' }) mimeType: string;

  /** Admin can switch a track off (takedown, region, expired licence) without deleting it. */
  @Index()
  @Column({ default: true })
  available: boolean;

  // Rights information. Required for every track: no licence record, no upload.
  @Column({ type: 'varchar', length: 200 }) rightsHolder: string;
  @Column({ type: 'varchar', length: 100 }) licenseType: string; // e.g. "CC0", "Distributor agreement"
  @Column({ type: 'text', nullable: true }) licenseNote: string | null;

  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
