import { Module } from '@nestjs/common';
import { MusicApiService } from './music-api.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [
    {
      provide: MusicApiService,
      useClass: MusicApiService, // Par défaut, utilisez le vrai service Spotify
    },
  ],
  exports: [MusicApiService],
})
export class MusicApiModule {}
