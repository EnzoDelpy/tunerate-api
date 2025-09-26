import { Test, TestingModule } from '@nestjs/testing';
import { ArtistsController } from './artists.controller';
import { ArtistsService } from './artists.service';
import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('ArtistsController', () => {
  let controller: ArtistsController;
  let artistsService: ArtistsService;

  const mockUser = {
    id: 1,
    username: 'testuser',
  };

  const mockArtist = {
    id: 1,
    externalId: 'artist123',
    name: 'Test Artist',
    imageUrl: 'http://example.com/artist.jpg',
    albums: [],
  };

  const mockArtistsService = {
    searchArtists: jest.fn().mockResolvedValue([mockArtist]),
    findAll: jest.fn().mockResolvedValue([mockArtist]),
    findOne: jest.fn().mockImplementation((id) => {
      if (id === 1) {
        return Promise.resolve(mockArtist);
      } else {
        throw new NotFoundException(`Artist with ID ${id} not found`);
      }
    }),
    getArtistDetailsByExternalId: jest.fn().mockImplementation((externalId) => {
      if (externalId === 'artist123') {
        return Promise.resolve(mockArtist);
      } else {
        throw new NotFoundException(
          `Artist with external ID ${externalId} not found`,
        );
      }
    }),
    getArtistAlbums: jest.fn().mockImplementation((id) => {
      if (id === 1) {
        return Promise.resolve([{ id: 1, title: 'Test Album' }]);
      } else {
        throw new NotFoundException(`Artist with ID ${id} not found`);
      }
    }),
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
      controllers: [ArtistsController],
      providers: [
        {
          provide: ArtistsService,
          useValue: mockArtistsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<ArtistsController>(ArtistsController);
    artistsService = module.get<ArtistsService>(ArtistsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search', () => {
    it('should search for artists', async () => {
      const result = await controller.search({ query: 'test artist' });

      expect(result).toEqual([mockArtist]);
      expect(artistsService.searchArtists).toHaveBeenCalledWith('test artist');
    });
  });

  describe('findAll', () => {
    it('should return all artists', async () => {
      const result = await controller.findAll();

      expect(result).toEqual([mockArtist]);
      expect(artistsService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return an artist by id', async () => {
      const result = await controller.findOne(1);

      expect(result).toEqual(mockArtist);
      expect(artistsService.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw an error if artist not found', async () => {
      try {
        await controller.findOne(999);
        // Si on arrive ici, c'est que l'exception n'a pas été lancée
        fail('Expected NotFoundException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain('Artist with ID 999 not found');
      }
    });
  });

  describe('findByExternalId', () => {
    it('should return an artist by external id', async () => {
      const result = await controller.findByExternalId('artist123');

      expect(result).toEqual(mockArtist);
      expect(artistsService.getArtistDetailsByExternalId).toHaveBeenCalledWith(
        'artist123',
      );
    });

    it('should throw an error if artist not found', async () => {
      try {
        await controller.findByExternalId('nonexistent');
        // Si on arrive ici, c'est que l'exception n'a pas été lancée
        fail('Expected NotFoundException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain(
          'Artist with external ID nonexistent not found',
        );
      }
    });
  });

  describe('getArtistAlbums', () => {
    it('should return artist albums', async () => {
      const result = await controller.getArtistAlbums(1);

      expect(result).toEqual([{ id: 1, title: 'Test Album' }]);
      expect(artistsService.getArtistAlbums).toHaveBeenCalledWith(1);
    });

    it('should throw an error if artist not found', async () => {
      try {
        await controller.getArtistAlbums(999);
        // Si on arrive ici, c'est que l'exception n'a pas été lancée
        fail('Expected NotFoundException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain('Artist with ID 999 not found');
      }
    });
  });
});
