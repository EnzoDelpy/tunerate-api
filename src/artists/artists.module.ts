import { Module } from '@nestjs/common';
import { ArtistsController } from './artists.controller';
import { ArtistsService } from './artists.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MusicApiModule } from '../music-api/music-api.module';

@Module({
  imports: [PrismaModule, MusicApiModule],
  controllers: [ArtistsController],
  providers: [ArtistsService],
  exports: [ArtistsService],
})
export class ArtistsModule {}
