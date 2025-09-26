import { Injectable } from '@nestjs/common';

// Service temporaire qui simule les réponses de l'API Spotify
@Injectable()
export class MockMusicApiService {
  // Mock de recherche d'artistes
  async searchArtists(query: string) {
    return [
      {
        externalId: 'artist1',
        name: 'Artist One',
        imageUrl: 'https://example.com/artist1.jpg',
      },
      {
        externalId: 'artist2',
        name: 'Artist Two',
        imageUrl: 'https://example.com/artist2.jpg',
      },
      {
        externalId: 'artist3',
        name: `Artist matching "${query}"`,
        imageUrl: 'https://example.com/artist3.jpg',
      },
    ];
  }

  // Mock de recherche d'albums
  async searchAlbums(query: string) {
    return [
      {
        externalId: 'album1',
        title: 'First Album',
        releaseDate: '2024-01-15',
        coverUrl: 'https://example.com/album1.jpg',
        artistName: 'Artist One',
        artistExternalId: 'artist1',
      },
      {
        externalId: 'album2',
        title: 'Second Album',
        releaseDate: '2023-08-22',
        coverUrl: 'https://example.com/album2.jpg',
        artistName: 'Artist Two',
        artistExternalId: 'artist2',
      },
      {
        externalId: 'album3',
        title: `Album matching "${query}"`,
        releaseDate: '2025-01-10',
        coverUrl: 'https://example.com/album3.jpg',
        artistName: 'Artist Three',
        artistExternalId: 'artist3',
      },
    ];
  }

  // Mock de détails d'album
  async getAlbumDetails(externalId: string) {
    return {
      externalId,
      title: `Album with ID ${externalId}`,
      releaseDate: '2024-03-15',
      coverUrl: 'https://example.com/album.jpg',
      artistName: 'Sample Artist',
      artistExternalId: 'artist1',
      tracks: [
        {
          name: 'Track 1',
          duration: 180000,
          trackNumber: 1,
        },
        {
          name: 'Track 2',
          duration: 210000,
          trackNumber: 2,
        },
      ],
    };
  }

  // Mock de détails d'artiste
  async getArtistDetails(externalId: string) {
    return {
      externalId,
      name: `Artist with ID ${externalId}`,
      imageUrl: 'https://example.com/artist.jpg',
      popularity: 85,
      genres: ['pop', 'rock'],
    };
  }

  // Mock d'albums d'un artiste
  async getArtistAlbums(artistExternalId: string) {
    return [
      {
        externalId: 'album1',
        title: 'Artist Album 1',
        releaseDate: '2022-05-20',
        coverUrl: 'https://example.com/artistalbum1.jpg',
        albumType: 'album',
      },
      {
        externalId: 'album2',
        title: 'Artist Album 2',
        releaseDate: '2023-11-03',
        coverUrl: 'https://example.com/artistalbum2.jpg',
        albumType: 'single',
      },
    ];
  }
}
