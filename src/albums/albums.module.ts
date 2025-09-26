import { Module } from '@nestjs/common';
import { AlbumsController } from './albums.controller';
import { AlbumsService } from './albums.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MusicApiModule } from '../music-api/music-api.module';
import { ArtistsModule } from '../artists/artists.module';

@Module({
  imports: [PrismaModule, MusicApiModule, ArtistsModule],
  controllers: [AlbumsController],
  providers: [AlbumsService],
  exports: [AlbumsService],
})
export class AlbumsModule {}
