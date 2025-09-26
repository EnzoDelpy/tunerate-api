import { Test, TestingModule } from '@nestjs/testing';
import { AlbumsService } from './albums.service';
import { PrismaService } from '../prisma/prisma.service';
import { MusicApiService } from '../music-api/music-api.service';
import { ArtistsService } from '../artists/artists.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateAlbumDto } from './dto/create-album.dto';

describe('AlbumsService', () => {
  let service: AlbumsService;
  let prismaService: PrismaService;
  let musicApiService: MusicApiService;
  let artistsService: ArtistsService;

  const mockAlbum = {
    id: 1,
    externalId: 'album123',
    title: 'Test Album',
    releaseDate: new Date('2023-01-01'),
    coverUrl: 'http://example.com/cover.jpg',
    artistId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    artist: {
      id: 1,
      externalId: 'artist123',
      name: 'Test Artist',
      imageUrl: 'http://example.com/artist.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    reviews: [],
  };

  const mockPrismaService = {
    album: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    artist: {
      findUnique: jest.fn(),
    },
    review: {
      findMany: jest.fn(),
    },
  };

  const mockMusicApiService = {
    searchAlbums: jest.fn(),
    getAlbumDetails: jest.fn(),
    getArtistDetails: jest.fn(),
  };

  const mockArtistsService = {
    getArtistDetailsByExternalId: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlbumsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MusicApiService,
          useValue: mockMusicApiService,
        },
        {
          provide: ArtistsService,
          useValue: mockArtistsService,
        },
      ],
    }).compile();

    service = module.get<AlbumsService>(AlbumsService);
    prismaService = module.get<PrismaService>(PrismaService);
    musicApiService = module.get<MusicApiService>(MusicApiService);
    artistsService = module.get<ArtistsService>(ArtistsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchAlbums', () => {
    it('should search for albums via music API', async () => {
      const mockApiResults = [{ name: 'Test Album', artist: 'Test Artist' }];
      mockMusicApiService.searchAlbums.mockResolvedValue(mockApiResults);

      const result = await service.searchAlbums('test query');

      expect(result).toEqual(mockApiResults);
      expect(mockMusicApiService.searchAlbums).toHaveBeenCalledWith(
        'test query',
      );
    });
  });

  describe('getAlbumDetailsByExternalId', () => {
    it('should return album from database if it exists', async () => {
      mockPrismaService.album.findUnique.mockResolvedValue(mockAlbum);

      const result = await service.getAlbumDetailsByExternalId('album123');

      expect(result).toEqual(mockAlbum);
      expect(mockPrismaService.album.findUnique).toHaveBeenCalledWith({
        where: { externalId: 'album123' },
        include: {
          artist: true,
          reviews: {
            include: { user: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      expect(mockMusicApiService.getAlbumDetails).not.toHaveBeenCalled();
    });

    it('should fetch album from API and create it if not in database', async () => {
      mockPrismaService.album.findUnique.mockResolvedValue(null);
      mockMusicApiService.getAlbumDetails.mockResolvedValue({
        externalId: 'album123',
        title: 'Test Album',
        releaseDate: '2023-01-01',
        coverUrl: 'http://example.com/cover.jpg',
        artistExternalId: 'artist123',
      });

      mockArtistsService.getArtistDetailsByExternalId.mockResolvedValue({
        id: 1,
        externalId: 'artist123',
        name: 'Test Artist',
      });

      // Mock the create method
      jest.spyOn(service, 'create').mockResolvedValue(mockAlbum);

      const result = await service.getAlbumDetailsByExternalId('album123');

      expect(result).toEqual(mockAlbum);
      expect(mockPrismaService.album.findUnique).toHaveBeenCalledWith({
        where: { externalId: 'album123' },
        include: {
          artist: true,
          reviews: {
            include: { user: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      expect(mockMusicApiService.getAlbumDetails).toHaveBeenCalledWith(
        'album123',
      );
      expect(artistsService.getArtistDetailsByExternalId).toHaveBeenCalledWith(
        'artist123',
      );
      expect(service.create).toHaveBeenCalledWith({
        externalId: 'album123',
        title: 'Test Album',
        releaseDate: '2023-01-01',
        coverUrl: 'http://example.com/cover.jpg',
        artistExternalId: 'artist123',
      });
    });
  });

  describe('create', () => {
    it('should return existing album if it already exists', async () => {
      mockPrismaService.album.findUnique.mockResolvedValue(mockAlbum);

      const createAlbumDto: CreateAlbumDto = {
        externalId: 'album123',
        title: 'Test Album',
        releaseDate: '2023-01-01',
        coverUrl: 'http://example.com/cover.jpg',
        artistExternalId: 'artist123',
      };

      const result = await service.create(createAlbumDto);

      expect(result).toEqual(mockAlbum);
      expect(mockPrismaService.album.findUnique).toHaveBeenCalledWith({
        where: { externalId: 'album123' },
      });
      expect(mockPrismaService.album.create).not.toHaveBeenCalled();
    });

    it('should create a new album with existing artist', async () => {
      mockPrismaService.album.findUnique.mockResolvedValue(null);
      mockPrismaService.artist.findUnique.mockResolvedValue({
        id: 1,
        externalId: 'artist123',
        name: 'Test Artist',
      });
      mockPrismaService.album.create.mockResolvedValue(mockAlbum);

      const createAlbumDto: CreateAlbumDto = {
        externalId: 'album123',
        title: 'Test Album',
        releaseDate: '2023-01-01',
        coverUrl: 'http://example.com/cover.jpg',
        artistExternalId: 'artist123',
      };

      const result = await service.create(createAlbumDto);

      expect(result).toEqual(mockAlbum);
      expect(mockPrismaService.album.findUnique).toHaveBeenCalledWith({
        where: { externalId: 'album123' },
      });
      expect(mockPrismaService.artist.findUnique).toHaveBeenCalledWith({
        where: { externalId: 'artist123' },
      });
      expect(mockPrismaService.album.create).toHaveBeenCalledWith({
        data: {
          externalId: 'album123',
          title: 'Test Album',
          releaseDate: new Date('2023-01-01'),
          coverUrl: 'http://example.com/cover.jpg',
          artist: {
            connect: { id: 1 },
          },
        },
        include: { artist: true },
      });
    });

    it('should create a new album and artist if both do not exist', async () => {
      mockPrismaService.album.findUnique.mockResolvedValue(null);
      mockPrismaService.artist.findUnique.mockResolvedValue(null);

      mockMusicApiService.getArtistDetails.mockResolvedValue({
        externalId: 'artist123',
        name: 'Test Artist',
        imageUrl: 'http://example.com/artist.jpg',
      });

      mockArtistsService.create.mockResolvedValue({
        id: 1,
        externalId: 'artist123',
        name: 'Test Artist',
      });

      mockPrismaService.album.create.mockResolvedValue(mockAlbum);

      const createAlbumDto: CreateAlbumDto = {
        externalId: 'album123',
        title: 'Test Album',
        releaseDate: '2023-01-01',
        coverUrl: 'http://example.com/cover.jpg',
        artistExternalId: 'artist123',
      };

      const result = await service.create(createAlbumDto);

      expect(result).toEqual(mockAlbum);
      expect(mockPrismaService.album.findUnique).toHaveBeenCalledWith({
        where: { externalId: 'album123' },
      });
      expect(mockPrismaService.artist.findUnique).toHaveBeenCalledWith({
        where: { externalId: 'artist123' },
      });
      expect(mockMusicApiService.getArtistDetails).toHaveBeenCalledWith(
        'artist123',
      );
      expect(mockArtistsService.create).toHaveBeenCalledWith({
        externalId: 'artist123',
        name: 'Test Artist',
        imageUrl: 'http://example.com/artist.jpg',
      });
      expect(mockPrismaService.album.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if album with same externalId exists', async () => {
      mockPrismaService.album.findUnique.mockResolvedValue(null);
      mockPrismaService.artist.findUnique.mockResolvedValue({
        id: 1,
        externalId: 'artist123',
      });
      mockPrismaService.album.create.mockImplementation(() => {
        const error: any = new Error('Prisma error');
        error.code = 'P2002';
        throw error;
      });

      const createAlbumDto: CreateAlbumDto = {
        externalId: 'album123',
        title: 'Test Album',
        releaseDate: '2023-01-01',
        coverUrl: 'http://example.com/cover.jpg',
        artistExternalId: 'artist123',
      };

      await expect(service.create(createAlbumDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all albums', async () => {
      const mockAlbums = [
        {
          ...mockAlbum,
          _count: { reviews: 2 },
        },
      ];
      mockPrismaService.album.findMany.mockResolvedValue(mockAlbums);

      const result = await service.findAll();

      expect(result).toEqual(mockAlbums);
      expect(mockPrismaService.album.findMany).toHaveBeenCalledWith({
        include: {
          artist: true,
          _count: {
            select: { reviews: true },
          },
        },
        orderBy: { releaseDate: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return an album by id', async () => {
      mockPrismaService.album.findUnique.mockResolvedValue(mockAlbum);

      const result = await service.findOne(1);

      expect(result).toEqual(mockAlbum);
      expect(mockPrismaService.album.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          artist: true,
          reviews: {
            include: { user: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    });

    it('should throw NotFoundException if album not found', async () => {
      mockPrismaService.album.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAlbumRating', () => {
    it('should calculate average rating and return count', async () => {
      const mockReviews = [{ rating: 4 }, { rating: 5 }, { rating: 3 }];
      mockPrismaService.review.findMany.mockResolvedValue(mockReviews);

      const result = await service.getAlbumRating(1);

      expect(result).toEqual({
        averageRating: 4,
        reviewCount: 3,
      });
      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith({
        where: { albumId: 1 },
        select: { rating: true },
      });
    });

    it('should return zero rating when no reviews exist', async () => {
      mockPrismaService.review.findMany.mockResolvedValue([]);

      const result = await service.getAlbumRating(1);

      expect(result).toEqual({
        averageRating: 0,
        reviewCount: 0,
      });
    });
  });
});
