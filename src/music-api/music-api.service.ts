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

  // Recherche d'albums (albums complets et EPs seulement, pas de singles)
  async searchAlbums(query: string, limit = 10, offset = 0): Promise<any> {
    try {
      const token = await this.getAccessToken();

      // Essayons de détecter si nous avons un ID Spotify et utiliser une recherche plus précise
      const isLikelySpotifyId = /^[0-9A-Za-z]{22}$/.test(query);

      // Si ça ressemble à un ID Spotify, ajoutons "id:" à la requête
      let searchQuery = isLikelySpotifyId ? `id:${query}` : query;

      // Le filtre pour exclure les singles et inclure seulement les albums et EPs
      // est maintenant géré via le paramètre album_type directement
      // Nous laissons la requête simple
      if (!isLikelySpotifyId) {
        // Pas besoin d'ajouter album_type dans la requête de recherche
      }

      // Demander le maximum de résultats possibles pour avoir assez après filtrage
      // Spotify limite à 50 résultats par requête, donc on demande ce maximum
      const apiLimit = 50; // Maximum possible par l'API Spotify

      // L'API Spotify a une limite de 1000 résultats au total et 50 par requête
      // S'assurer que notre offset est dans les limites
      const apiOffset = Math.min(offset, 950);

      const response = await firstValueFrom(
        this.httpService
          .get(`${this.baseUrl}/search`, {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              q: searchQuery,
              type: 'album',
              album_type: 'album,single,ep', // Inclure explicitement tous les types
              limit: apiLimit,
              offset: apiOffset,
            },
          })
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error('Error searching albums', error.response?.data);
              throw new Error('Failed to search albums');
            }),
          ),
      );

      // Filtrer pour garder uniquement les albums complets et recatégoriser les singles comme EP si nécessaire
      const filteredItems = response.data.albums.items.filter((album) => {
        // Normaliser le type d'album pour éviter les problèmes de casse
        const albumType = album.album_type?.toLowerCase() || '';

        // Garder tous les albums
        if (albumType === 'album') {
          return true;
        }

        // Garder tous les EP
        if (albumType === 'ep') {
          return true;
        } // Si c'est un single, vérifier le nombre de pistes
        if (album.album_type === 'single') {
          // Si total_tracks n'est pas défini, considérer tous les singles comme des EP par défaut
          if (album.total_tracks === undefined) {
            album.album_type = 'ep';
            return true;
          }

          // Si c'est un single avec 2 pistes ou plus, on le considère comme un EP
          if (album.total_tracks >= 2) {
            album.album_type = 'ep';
            return true;
          }

          // Rejeter seulement les singles avec exactement une piste
          return false;
        }

        // Si on arrive ici, c'est un type inconnu, on le rejette
        return false;
      });

      // Compter combien d'éléments de chaque type on a après filtrage et recatégorisation
      const types = {};
      filteredItems.forEach((item) => {
        const type = item.album_type;
        types[type] = (types[type] || 0) + 1;
      });

      // Limiter le nombre de résultats au nombre demandé
      const limitedResults = filteredItems.slice(0, limit);
      this.logger.debug(
        `Returning ${limitedResults.length} albums/EPs out of ${filteredItems.length} filtered results`,
      );

      const formattedResults = limitedResults.map((album) => {
        // S'assurer que le type d'album est bien normalisé (en minuscules)
        const normalizedType = album.album_type?.toLowerCase();

        return {
          externalId: album.id,
          title: album.name,
          releaseDate: album.release_date,
          coverUrl: album.images?.[0]?.url,
          artistName: album.artists[0]?.name,
          artistExternalId: album.artists[0]?.id,
          albumType: normalizedType, // 'album' ou 'ep' après recatégorisation
          totalTracks: album.total_tracks || null,
        };
      });

      return formattedResults;
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

      const token = await this.getAccessToken();

      // URL correcte selon la documentation Spotify
      const url = `${this.baseUrl}/albums/${cleanExternalId}`;

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
          // Essayons de trouver l'album via la recherche
          const searchResults = await this.searchAlbums(externalId, 5);

          if (searchResults && searchResults.length > 0) {
            // Vérifier si l'un des résultats correspond exactement à notre ID
            const exactMatch = searchResults.find(
              (album) => album.externalId === externalId,
            );
            if (exactMatch) {
              return exactMatch;
            }

            // Tenter d'accéder à l'album via une autre approche
            try {
              // Certains IDs peuvent avoir besoin d'être traités différemment
              // Par exemple, essayer un format différent de l'URL
              const alternativeUrl = `${this.baseUrl}/albums/${encodeURIComponent(externalId)}`;

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
