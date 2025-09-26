import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class MusicApiService {
  private readonly logger = new Logger(MusicApiService.name);
  private accessToken: string;
  private tokenExpiry: Date;
  private readonly baseUrl = 'https://api.spotify.com/v1';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  // Méthode pour obtenir un token d'accès Spotify
  private async getAccessToken(): Promise<string> {
    // Vérifier si le token est toujours valide
    if (this.accessToken && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    const clientId = this.configService.get<string>('SPOTIFY_CLIENT_ID');
    const clientSecret = this.configService.get<string>(
      'SPOTIFY_CLIENT_SECRET',
    );

    if (!clientId || !clientSecret) {
      throw new Error('Spotify credentials are not configured');
    }

    try {
      const tokenResponse = await firstValueFrom(
        this.httpService
          .post(
            'https://accounts.spotify.com/api/token',
            'grant_type=client_credentials',
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(
                  `${clientId}:${clientSecret}`,
                ).toString('base64')}`,
              },
            },
          )
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error(
                'Error getting Spotify access token',
                error.response?.data,
              );
              throw new Error('Failed to get Spotify access token');
            }),
          ),
      );

      this.accessToken = tokenResponse.data.access_token;
      this.tokenExpiry = new Date(
        Date.now() + tokenResponse.data.expires_in * 1000,
      );
      return this.accessToken;
    } catch (error) {
      this.logger.error('Error in getAccessToken', error);
      throw error;
    }
  }

  // Recherche d'artistes
  async searchArtists(query: string, limit = 10): Promise<any> {
    try {
      const token = await this.getAccessToken();
      const response = await firstValueFrom(
        this.httpService
          .get(`${this.baseUrl}/search`, {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              q: query,
              type: 'artist',
              limit,
            },
          })
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error(
                'Error searching artists',
                error.response?.data,
              );
              throw new Error('Failed to search artists');
            }),
          ),
      );

      return response.data.artists.items.map((artist) => ({
        externalId: artist.id,
        name: artist.name,
        imageUrl: artist.images?.[0]?.url,
      }));
    } catch (error) {
      this.logger.error('Error in searchArtists', error);
      throw error;
    }
  }

  // Recherche d'albums
  async searchAlbums(query: string, limit = 10): Promise<any> {
    try {
      const token = await this.getAccessToken();

      // Essayons de détecter si nous avons un ID Spotify et utiliser une recherche plus précise
      const isLikelySpotifyId = /^[0-9A-Za-z]{22}$/.test(query);

      // Si ça ressemble à un ID Spotify, ajoutons "id:" à la requête
      const searchQuery = isLikelySpotifyId ? `id:${query}` : query;
      this.logger.debug(
        `Searching with query: ${searchQuery} (ID format: ${isLikelySpotifyId})`,
      );

      const response = await firstValueFrom(
        this.httpService
          .get(`${this.baseUrl}/search`, {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              q: searchQuery,
              type: 'album',
              limit,
            },
          })
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error('Error searching albums', error.response?.data);
              throw new Error('Failed to search albums');
            }),
          ),
      );

      // Log des IDs d'albums pour le débogage
      this.logger.debug(
        `Albums found in search - IDs: ${response.data.albums.items.map((a) => a.id).join(', ')}`,
      );

      return response.data.albums.items.map((album) => ({
        externalId: album.id,
        title: album.name,
        releaseDate: album.release_date,
        coverUrl: album.images?.[0]?.url,
        artistName: album.artists[0]?.name,
        artistExternalId: album.artists[0]?.id,
      }));
    } catch (error) {
      this.logger.error('Error in searchAlbums', error);
      throw error;
    }
  }

  // Obtenir les détails d'un album par son ID externe
  async getAlbumDetails(externalId: string): Promise<any> {
    try {
      // Nettoyer l'ID externe au cas où il contiendrait des caractères indésirables
      const cleanExternalId = externalId.trim();

      this.logger.debug(`Fetching album details for ID: ${cleanExternalId}`);
      const token = await this.getAccessToken();

      // URL correcte selon la documentation Spotify
      const url = `${this.baseUrl}/albums/${cleanExternalId}`;
      this.logger.debug(`Request URL: ${url}`);
      this.logger.debug(`token: ${token}`);

      const response = await firstValueFrom(
        this.httpService
          .get(url, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error(
                'Error getting album details',
                error.response?.data,
              );
              if (error.response?.status === 404) {
                throw new NotFoundException(
                  `Album with ID ${cleanExternalId} not found in Spotify`,
                );
              }
              throw new InternalServerErrorException(
                'Failed to get album details from Spotify API',
              );
            }),
          ),
      );

      const album = response.data;
      if (!album || !album.id) {
        this.logger.error('Invalid album data returned from Spotify API');
        throw new InternalServerErrorException(
          'Invalid album data received from Spotify',
        );
      }

      return {
        externalId: album.id,
        title: album.name,
        releaseDate: album.release_date,
        coverUrl: album.images?.[0]?.url,
        artistName: album.artists[0]?.name,
        artistExternalId: album.artists[0]?.id,
        tracks: album.tracks?.items?.map((track) => ({
          name: track.name,
          duration: track.duration_ms,
          trackNumber: track.track_number,
        })),
      };
    } catch (error) {
      this.logger.error('Error in getAlbumDetails', error);

      if (error instanceof NotFoundException) {
        // Si l'album n'est pas trouvé directement, essayons de le trouver via une recherche
        try {
          this.logger.debug(
            `Album not found directly, trying search for ID: ${externalId}`,
          );

          // Essayons de trouver l'album via la recherche
          const searchResults = await this.searchAlbums(externalId, 5);

          if (searchResults && searchResults.length > 0) {
            // Vérifier si l'un des résultats correspond exactement à notre ID
            const exactMatch = searchResults.find(
              (album) => album.externalId === externalId,
            );
            if (exactMatch) {
              this.logger.debug(
                `Found album through search: ${exactMatch.title}`,
              );
              return exactMatch;
            }

            // Essayons une recherche spécifique
            this.logger.debug(
              `Trying alternative approach with album ID: ${externalId}`,
            );

            // Tenter d'accéder à l'album via une autre approche
            try {
              // Certains IDs peuvent avoir besoin d'être traités différemment
              // Par exemple, essayer un format différent de l'URL
              const alternativeUrl = `${this.baseUrl}/albums/${encodeURIComponent(externalId)}`;
              this.logger.debug(`Trying alternative URL: ${alternativeUrl}`);

              // Obtenir un nouveau token au cas où
              const altToken = await this.getAccessToken();

              const altResponse = await firstValueFrom(
                this.httpService
                  .get(alternativeUrl, {
                    headers: { Authorization: `Bearer ${altToken}` },
                  })
                  .pipe(
                    catchError(() => {
                      // Si ça ne fonctionne pas, on ignore simplement cette tentative
                      this.logger.debug('Alternative approach failed');
                      throw error;
                    }),
                  ),
              );

              // Si nous arrivons ici, la requête alternative a fonctionné
              const altAlbum = altResponse.data;
              return {
                externalId: altAlbum.id,
                title: altAlbum.name,
                releaseDate: altAlbum.release_date,
                coverUrl: altAlbum.images?.[0]?.url,
                artistName: altAlbum.artists[0]?.name,
                artistExternalId: altAlbum.artists[0]?.id,
                tracks: altAlbum.tracks?.items?.map((track) => ({
                  name: track.name,
                  duration: track.duration_ms,
                  trackNumber: track.track_number,
                })),
              };
            } catch (altError) {
              this.logger.debug('Alternative approach failed');
              // Si l'approche alternative échoue aussi, on continue avec l'erreur originale
            }
          }

          // Si aucune des approches n'a fonctionné, relancer l'erreur originale
          throw error;
        } catch (searchError) {
          this.logger.error('Search attempt also failed:', searchError);
          throw error; // Relancer l'erreur originale
        }
      }

      if (error instanceof HttpException) {
        throw error; // Relancer les erreurs HTTP déjà formatées
      }

      throw new InternalServerErrorException(
        'An error occurred while fetching album details',
      );
    }
  }

  // Obtenir les détails d'un artiste par son ID externe
  async getArtistDetails(externalId: string): Promise<any> {
    try {
      const token = await this.getAccessToken();
      const response = await firstValueFrom(
        this.httpService
          .get(`${this.baseUrl}/artists/${externalId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error(
                'Error getting artist details',
                error.response?.data,
              );
              throw new Error('Failed to get artist details');
            }),
          ),
      );

      const artist = response.data;
      return {
        externalId: artist.id,
        name: artist.name,
        imageUrl: artist.images?.[0]?.url,
        popularity: artist.popularity,
        genres: artist.genres,
      };
    } catch (error) {
      this.logger.error('Error in getArtistDetails', error);
      throw error;
    }
  }

  // Tester si un ID d'album est valide directement avec Spotify
  async testAlbumId(albumId: string): Promise<boolean> {
    try {
      this.logger.debug(`Testing if album ID is valid: ${albumId}`);
      const token = await this.getAccessToken();

      // Effectuer un test en utilisant GET avec la méthode silencieuse
      await firstValueFrom(
        this.httpService
          .get(`${this.baseUrl}/albums/${albumId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .pipe(
            catchError((error: AxiosError) => {
              // Si on reçoit une erreur, l'ID n'est pas valide
              throw new Error(`Album ID test failed: ${error.message}`);
            }),
          ),
      );

      // Si on arrive ici sans erreur, l'ID est valide
      return true;
    } catch (error) {
      // En cas d'erreur, l'ID n'est pas valide
      this.logger.debug(`Album ID ${albumId} is not valid: ${error.message}`);
      return false;
    }
  }

  // Obtenir les albums d'un artiste
  async getArtistAlbums(artistExternalId: string, limit = 50): Promise<any> {
    try {
      const token = await this.getAccessToken();
      const response = await firstValueFrom(
        this.httpService
          .get(`${this.baseUrl}/artists/${artistExternalId}/albums`, {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              include_groups: 'album,single',
              limit,
            },
          })
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error(
                'Error getting artist albums',
                error.response?.data,
              );
              throw new Error('Failed to get artist albums');
            }),
          ),
      );

      return response.data.items.map((album) => ({
        externalId: album.id,
        title: album.name,
        releaseDate: album.release_date,
        coverUrl: album.images?.[0]?.url,
        albumType: album.album_type,
      }));
    } catch (error) {
      this.logger.error('Error in getArtistAlbums', error);
      throw error;
    }
  }
}
