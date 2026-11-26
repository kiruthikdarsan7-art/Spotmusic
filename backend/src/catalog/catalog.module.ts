import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Album, Artist, Track } from './catalog.entities';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { StorageService } from './storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Artist, Album, Track]), AuthModule],
  controllers: [CatalogController],
  providers: [CatalogService, StorageService],
  exports: [StorageService],
})
export class CatalogModule {}
