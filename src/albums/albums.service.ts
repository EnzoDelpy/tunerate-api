import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MusicApiService } from '../music-api/music-api.service';
import { CreateAlbumDto } from './dto/create-album.dto';
import { ArtistsService } from '../artists/artists.service';

@Injectable()
export class AlbumsService {
  constructor(
    private prisma: PrismaService,
    private musicApiService: MusicApiService,
    private artistsService: ArtistsService,
  ) {}

  // Recherche d'albums via l'API externe avec pagination
  async searchAlbums(query: string, page = 1, limit = 10) {
    // Créer un identifiant unique basé sur l'offset plutôt que la page
    // pour éviter les doublons entre les pages
    const offset = (page - 1) * limit;

    // Demander exactement le nombre d'éléments dont on a besoin
    const albums = await this.musicApiService.searchAlbums(
      query,
      limit,
      offset,
    );

    // Ajouter un identifiant unique basé sur la position pour chaque album
    // pour aider le frontend à identifier les doublons
    return albums.map((album, index) => ({
      ...album,
      _uniqueId: `${album.externalId || album.id}_${album.albumType}_${offset + index}`,
    }));
  }

  // Recherche un album par ID externe avec correspondance approximative
  // Test si un ID d'album est valide avec l'API Spotify
  async testAlbumId(externalId: string): Promise<boolean> {
    return this.musicApiService.testAlbumId(externalId);
  }

  // Obtenir les détails d'un album via son ID externe
  async getAlbumDetailsByExternalId(externalId: string) {
    // Chercher d'abord dans notre base de données
    const existingAlbum = await this.prisma.album.findUnique({
      where: { externalId },
      include: {
        artist: true,
        reviews: {
          include: { user: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Si l'album existe déjà dans la base, le retourner
    if (existingAlbum) {
      return existingAlbum;
    }

    try {
      // Sinon, récupérer les détails depuis l'API externe
      const albumDetails =
        await this.musicApiService.getAlbumDetails(externalId);

      // Créer ou récupérer l'artiste dans notre base
      const artist = await this.artistsService.getArtistDetailsByExternalId(
        albumDetails.artistExternalId,
      );

      // Créer l'album dans la base de données
      return this.create({
        externalId: albumDetails.externalId,
        title: albumDetails.title,
        releaseDate: albumDetails.releaseDate,
        coverUrl: albumDetails.coverUrl,
        artistExternalId: albumDetails.artistExternalId,
      });
    } catch (error) {
      // Propager l'erreur d'origine sans tentative de recherche approximative
      // Pour garantir une correspondance exacte comme demandé

      throw error;
    }
  }

  // Création d'un nouvel album dans la base de données
  async create(createAlbumDto: CreateAlbumDto) {
    try {
      // Vérifier si l'album existe déjà
      const existingAlbum = await this.prisma.album.findUnique({
        where: { externalId: createAlbumDto.externalId },
      });

      if (existingAlbum) {
        return existingAlbum;
      }

      // Trouver l'artiste ou le créer s'il n'existe pas
      let artist = await this.prisma.artist.findUnique({
        where: { externalId: createAlbumDto.artistExternalId },
      });

      if (!artist) {
        // Récupérer les informations de l'artiste depuis l'API externe
        const artistDetails = await this.musicApiService.getArtistDetails(
          createAlbumDto.artistExternalId,
        );

        // Créer l'artiste
        artist = await this.artistsService.create({
          externalId: artistDetails.externalId,
          name: artistDetails.name,
          imageUrl: artistDetails.imageUrl,
        });
      }

      // Créer l'album
      return await this.prisma.album.create({
        data: {
          externalId: createAlbumDto.externalId,
          title: createAlbumDto.title,
          releaseDate: createAlbumDto.releaseDate
            ? new Date(createAlbumDto.releaseDate)
            : null,
          coverUrl: createAlbumDto.coverUrl,
          artist: {
            connect: { id: artist.id },
          },
        },
        include: { artist: true },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'Album with this external ID already exists',
        );
      }
      throw error;
    }
  }

  // Trouver tous les albums dans notre base de données
  async findAll() {
    return this.prisma.album.findMany({
      include: {
        artist: true,
        _count: {
          select: { reviews: true },
        },
      },
      orderBy: { releaseDate: 'desc' },
    });
  }

  // Trouver un album par son ID interne
  async findOne(id: number) {
    const album = await this.prisma.album.findUnique({
      where: { id },
      include: {
        artist: true,
        reviews: {
          include: { user: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!album) {
      throw new NotFoundException(`Album with ID ${id} not found`);
    }

    return album;
  }

  // Calculer la note moyenne d'un album
  async getAlbumRating(id: number) {
    const reviews = await this.prisma.review.findMany({
      where: { albumId: id },
      select: { rating: true },
    });

    if (reviews.length === 0) {
      return { averageRating: 0, reviewCount: 0 };
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    return {
      averageRating,
      reviewCount: reviews.length,
    };
  }
}
