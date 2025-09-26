import { Test, TestingModule } from '@nestjs/testing';
import { ArtistsService } from './artists.service';
import { PrismaService } from '../prisma/prisma.service';
import { MusicApiService } from '../music-api/music-api.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateArtistDto } from './dto/create-artist.dto';

describe('ArtistsService', () => {
  let service: ArtistsService;
  let prismaService: PrismaService;
  let musicApiService: MusicApiService;

  const mockArtist = {
    id: 1,
    externalId: 'artist123',
    name: 'Test Artist',
    imageUrl: 'http://example.com/artist.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
    albums: [],
  };

  const mockPrismaService = {
    artist: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    album: {
      findMany: jest.fn(),
    },
  };

  const mockMusicApiService = {
    searchArtists: jest.fn(),
    getArtistDetails: jest.fn(),
    getArtistAlbums: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArtistsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MusicApiService,
          useValue: mockMusicApiService,
        },
      ],
    }).compile();

    service = module.get<ArtistsService>(ArtistsService);
    prismaService = module.get<PrismaService>(PrismaService);
    musicApiService = module.get<MusicApiService>(MusicApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchArtists', () => {
    it('should search for artists via music API', async () => {
      const mockApiResults = [{ name: 'Test Artist', id: 'artist123' }];
      mockMusicApiService.searchArtists.mockResolvedValue(mockApiResults);

      const result = await service.searchArtists('test artist');

      expect(result).toEqual(mockApiResults);
      expect(mockMusicApiService.searchArtists).toHaveBeenCalledWith(
        'test artist',
      );
    });
  });

  describe('getArtistDetailsByExternalId', () => {
    it('should return artist from database if it exists', async () => {
      mockPrismaService.artist.findUnique.mockResolvedValue(mockArtist);

      const result = await service.getArtistDetailsByExternalId('artist123');

      expect(result).toEqual(mockArtist);
      expect(mockPrismaService.artist.findUnique).toHaveBeenCalledWith({
        where: { externalId: 'artist123' },
        include: { albums: true },
      });
      expect(mockMusicApiService.getArtistDetails).not.toHaveBeenCalled();
    });

    it('should fetch artist from API and create it if not in database', async () => {
      mockPrismaService.artist.findUnique.mockResolvedValue(null);
      mockMusicApiService.getArtistDetails.mockResolvedValue({
        externalId: 'artist123',
        name: 'Test Artist',
        imageUrl: 'http://example.com/artist.jpg',
      });

      // Mock the create method
      jest.spyOn(service, 'create').mockResolvedValue(mockArtist);

      const result = await service.getArtistDetailsByExternalId('artist123');

      expect(result).toEqual(mockArtist);
      expect(mockPrismaService.artist.findUnique).toHaveBeenCalledWith({
        where: { externalId: 'artist123' },
        include: { albums: true },
      });
      expect(mockMusicApiService.getArtistDetails).toHaveBeenCalledWith(
        'artist123',
      );
      expect(service.create).toHaveBeenCalledWith({
        externalId: 'artist123',
        name: 'Test Artist',
        imageUrl: 'http://example.com/artist.jpg',
      });
    });
  });

  describe('create', () => {
    it('should return existing artist if it already exists', async () => {
      mockPrismaService.artist.findUnique.mockResolvedValue(mockArtist);

      const createArtistDto: CreateArtistDto = {
        externalId: 'artist123',
        name: 'Test Artist',
        imageUrl: 'http://example.com/artist.jpg',
      };

      const result = await service.create(createArtistDto);

      expect(result).toEqual(mockArtist);
      expect(mockPrismaService.artist.findUnique).toHaveBeenCalledWith({
        where: { externalId: 'artist123' },
      });
      expect(mockPrismaService.artist.create).not.toHaveBeenCalled();
    });

    it('should create a new artist if it does not exist', async () => {
      mockPrismaService.artist.findUnique.mockResolvedValue(null);
      mockPrismaService.artist.create.mockResolvedValue(mockArtist);

      const createArtistDto: CreateArtistDto = {
        externalId: 'artist123',
        name: 'Test Artist',
        imageUrl: 'http://example.com/artist.jpg',
      };

      const result = await service.create(createArtistDto);

      expect(result).toEqual(mockArtist);
      expect(mockPrismaService.artist.findUnique).toHaveBeenCalledWith({
        where: { externalId: 'artist123' },
      });
      expect(mockPrismaService.artist.create).toHaveBeenCalledWith({
        data: createArtistDto,
      });
    });

    it('should throw ConflictException if artist with same externalId exists', async () => {
      mockPrismaService.artist.findUnique.mockResolvedValue(null);
      mockPrismaService.artist.create.mockImplementation(() => {
        const error: any = new Error('Prisma error');
        error.code = 'P2002';
        throw error;
      });

      const createArtistDto: CreateArtistDto = {
        externalId: 'artist123',
        name: 'Test Artist',
        imageUrl: 'http://example.com/artist.jpg',
      };

      await expect(service.create(createArtistDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all artists', async () => {
      const mockArtists = [
        {
          ...mockArtist,
          _count: { albums: 2 },
        },
      ];
      mockPrismaService.artist.findMany.mockResolvedValue(mockArtists);

      const result = await service.findAll();

      expect(result).toEqual(mockArtists);
      expect(mockPrismaService.artist.findMany).toHaveBeenCalledWith({
        include: {
          _count: {
            select: { albums: true },
          },
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return an artist by id', async () => {
      mockPrismaService.artist.findUnique.mockResolvedValue(mockArtist);

      const result = await service.findOne(1);

      expect(result).toEqual(mockArtist);
      expect(mockPrismaService.artist.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { albums: true },
      });
    });

    it('should throw NotFoundException if artist not found', async () => {
      mockPrismaService.artist.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getArtistAlbums', () => {
    it('should return albums from database if they exist', async () => {
      mockPrismaService.artist.findUnique.mockResolvedValue(mockArtist);
      const mockAlbums = [
        { id: 1, title: 'Album 1', artistId: 1 },
        { id: 2, title: 'Album 2', artistId: 1 },
      ];
      mockPrismaService.album.findMany.mockResolvedValue(mockAlbums);

      const result = await service.getArtistAlbums(1);

      expect(result).toEqual(mockAlbums);
      expect(mockPrismaService.artist.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrismaService.album.findMany).toHaveBeenCalledWith({
        where: { artistId: 1 },
      });
      expect(mockMusicApiService.getArtistAlbums).not.toHaveBeenCalled();
    });

    it('should fetch albums from API if none in database', async () => {
      mockPrismaService.artist.findUnique.mockResolvedValue(mockArtist);
      mockPrismaService.album.findMany.mockResolvedValue([]);
      const mockApiAlbums = [
        { id: 'album1', title: 'API Album 1' },
        { id: 'album2', title: 'API Album 2' },
      ];
      mockMusicApiService.getArtistAlbums.mockResolvedValue(mockApiAlbums);

      const result = await service.getArtistAlbums(1);

      expect(result).toEqual(mockApiAlbums);
      expect(mockPrismaService.artist.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrismaService.album.findMany).toHaveBeenCalledWith({
        where: { artistId: 1 },
      });
      expect(mockMusicApiService.getArtistAlbums).toHaveBeenCalledWith(
        'artist123',
      );
    });

    it('should throw NotFoundException if artist not found', async () => {
      mockPrismaService.artist.findUnique.mockResolvedValue(null);

      await expect(service.getArtistAlbums(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
