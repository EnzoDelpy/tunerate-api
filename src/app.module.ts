import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ArtistsModule } from './artists/artists.module';
import { AlbumsModule } from './albums/albums.module';
import { ReviewsModule } from './reviews/reviews.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MusicApiModule } from './music-api/music-api.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ArtistsModule,
    AlbumsModule,
    ReviewsModule,
    UsersModule,
    PrismaModule,
    AuthModule,
    MusicApiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
