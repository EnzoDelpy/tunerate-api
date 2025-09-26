import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MusicApiService } from '../music-api/music-api.service';
import { CreateArtistDto } from './dto/create-artist.dto';

@Injectable()
export class ArtistsService {
  constructor(
    private prisma: PrismaService,
    private musicApiService: MusicApiService,
  ) {}

  // Recherche d'artistes via l'API externe
  async searchArtists(query: string) {
    return this.musicApiService.searchArtists(query);
  }

  // Obtenir les détails d'un artiste via son ID externe
  async getArtistDetailsByExternalId(externalId: string) {
    // Chercher d'abord dans notre base de données
    const existingArtist = await this.prisma.artist.findUnique({
      where: { externalId },
      include: { albums: true },
    });

    // Si l'artiste existe déjà dans la base, le retourner
    if (existingArtist) {
      return existingArtist;
    }

    // Sinon, récupérer les détails depuis l'API externe
    const artistDetails =
      await this.musicApiService.getArtistDetails(externalId);

    // Créer l'artiste dans la base de données
    return this.create({
      externalId: artistDetails.externalId,
      name: artistDetails.name,
      imageUrl: artistDetails.imageUrl,
    });
  }

  // Création d'un nouvel artiste dans la base de données
  async create(createArtistDto: CreateArtistDto) {
    try {
      // Vérifier si l'artiste existe déjà
      const existingArtist = await this.prisma.artist.findUnique({
        where: { externalId: createArtistDto.externalId },
      });

      if (existingArtist) {
        return existingArtist;
      }

      // Créer l'artiste
      return await this.prisma.artist.create({
        data: createArtistDto,
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'Artist with this external ID already exists',
        );
      }
      throw error;
    }
  }

  // Trouver tous les artistes dans notre base de données
  async findAll() {
    return this.prisma.artist.findMany({
      include: {
        _count: {
          select: { albums: true },
        },
      },
    });
  }

  // Trouver un artiste par son ID interne
  async findOne(id: number) {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
      include: { albums: true },
    });

    if (!artist) {
      throw new NotFoundException(`Artist with ID ${id} not found`);
    }

    return artist;
  }

  // Obtenir les albums d'un artiste
  async getArtistAlbums(artistId: number) {
    const artist = await this.prisma.artist.findUnique({
      where: { id: artistId },
    });

    if (!artist) {
      throw new NotFoundException(`Artist with ID ${artistId} not found`);
    }

    // Récupérer les albums déjà en base de données
    const albumsInDb = await this.prisma.album.findMany({
      where: { artistId },
    });

    // Si nous avons déjà des albums, les retourner
    if (albumsInDb.length > 0) {
      return albumsInDb;
    }

    // Sinon, récupérer les albums depuis l'API externe
    const externalAlbums = await this.musicApiService.getArtistAlbums(
      artist.externalId,
    );

    // Les albums seront créés à la demande quand un utilisateur voudra les noter
    // Retourner simplement les données de l'API
    return externalAlbums;
  }
}
