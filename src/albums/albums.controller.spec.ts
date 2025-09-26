import { Test, TestingModule } from '@nestjs/testing';
import { AlbumsController } from './albums.controller';
import { AlbumsService } from './albums.service';
import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('AlbumsController', () => {
  let controller: AlbumsController;
  let albumsService: AlbumsService;

  const mockUser = {
    id: 1,
    username: 'testuser',
  };

  const mockAlbum = {
    id: 1,
    externalId: 'album123',
    title: 'Test Album',
    releaseDate: new Date(),
    coverUrl: 'http://example.com/cover.jpg',
    artist: {
      id: 1,
      name: 'Test Artist',
    },
    reviews: [],
  };

  const mockAlbumsService = {
    searchAlbums: jest.fn().mockResolvedValue([mockAlbum]),
    findAll: jest.fn().mockResolvedValue([mockAlbum]),
    findOne: jest.fn().mockImplementation((id) => {
      if (id === 1) {
        return Promise.resolve(mockAlbum);
      } else {
        throw new NotFoundException(`Album with ID ${id} not found`);
      }
    }),
    getAlbumDetailsByExternalId: jest.fn().mockImplementation((externalId) => {
      if (externalId === 'album123') {
        return Promise.resolve(mockAlbum);
      } else {
        throw new NotFoundException(
          `Album with external ID ${externalId} not found`,
        );
      }
    }),
    getAlbumRating: jest
      .fn()
      .mockResolvedValue({ averageRating: 4, reviewCount: 2 }),
  };

  // Mock JWT Guard
  const mockJwtAuthGuard = {
    canActivate: jest.fn().mockImplementation((context: ExecutionContext) => {
      const request = context.switchToHttp().getRequest();
      request.user = mockUser;
      return true;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlbumsController],
      providers: [
        {
          provide: AlbumsService,
          useValue: mockAlbumsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<AlbumsController>(AlbumsController);
    albumsService = module.get<AlbumsService>(AlbumsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search', () => {
    it('should search for albums', async () => {
      const result = await controller.search({ query: 'test album' });

      expect(result).toEqual([mockAlbum]);
      expect(albumsService.searchAlbums).toHaveBeenCalledWith('test album');
    });
  });

  describe('findAll', () => {
    it('should return all albums', async () => {
      const result = await controller.findAll();

      expect(result).toEqual([mockAlbum]);
      expect(albumsService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return an album by id', async () => {
      const result = await controller.findOne(1);

      expect(result).toEqual(mockAlbum);
      expect(albumsService.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw an error if album not found', async () => {
      try {
        await controller.findOne(999);
        // Si on arrive ici, c'est que l'exception n'a pas été lancée
        fail('Expected NotFoundException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain('Album with ID 999 not found');
      }
    });
  });

  describe('findByExternalId', () => {
    it('should return an album by external id', async () => {
      const result = await controller.findByExternalId('album123');

      expect(result).toEqual(mockAlbum);
      expect(albumsService.getAlbumDetailsByExternalId).toHaveBeenCalledWith(
        'album123',
      );
    });

    it('should throw an error if album not found', async () => {
      try {
        await controller.findByExternalId('nonexistent');
        // Si on arrive ici, c'est que l'exception n'a pas été lancée
        fail('Expected NotFoundException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain(
          'Album with external ID nonexistent not found',
        );
      }
    });
  });

  describe('getAlbumRating', () => {
    it('should return album rating', async () => {
      const result = await controller.getAlbumRating(1);

      expect(result).toEqual({ averageRating: 4, reviewCount: 2 });
      expect(albumsService.getAlbumRating).toHaveBeenCalledWith(1);
    });
  });
});
