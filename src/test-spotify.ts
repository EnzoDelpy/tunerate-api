import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MusicApiService } from './music-api/music-api.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const musicApiService = app.get<MusicApiService>(MusicApiService);

  try {
    console.log("Tentative de connexion à l'API Spotify...");
    const artists = await musicApiService.searchArtists('Daft Punk');
    console.log('Connexion réussie ! Voici quelques artistes trouvés :');
    console.log(JSON.stringify(artists, null, 2));
  } catch (error) {
    console.error(
      "Erreur lors de la connexion à l'API Spotify :",
      error.message,
    );
    if (error.response) {
      console.error('Détails de la réponse :', error.response.data);
    }
  }

  await app.close();
}

bootstrap();
