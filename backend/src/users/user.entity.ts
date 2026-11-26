import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 254 })
  email: string; // always stored lower-case

  // Null for accounts that only use Google / Apple sign-in.
  @Column({ type: 'varchar', nullable: true, select: false })
  passwordHash: string | null;

  @Column({ type: 'varchar', length: 60 })
  displayName: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerifiedAt: Date | null;

  @Index({ unique: true, where: '"googleSub" IS NOT NULL' })
  @Column({ type: 'varchar', nullable: true, select: false })
  googleSub: string | null;

  @Index({ unique: true, where: '"appleSub" IS NOT NULL' })
  @Column({ type: 'varchar', nullable: true, select: false })
  appleSub: string | null;

  // Privacy controls (used by the social features in a later phase).
  @Column({ default: true })
  publicProfile: boolean;

  @Column({ default: false })
  shareListeningActivity: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
