import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExecutionContext } from '@nestjs/common';

describe('ReviewsController', () => {
  let controller: ReviewsController;
  let service: ReviewsService;

  const mockReviewsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByAlbumId: jest.fn(),
    findByUserId: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn().mockImplementation((context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      req.user = { userId: 1, username: 'testuser' };
      return true;
    }),
  };

  const mockArtist = {
    id: 1,
    externalId: 'artist123',
    name: 'Test Artist',
  };

  const mockAlbum = {
    id: 1,
    externalId: 'album123',
    title: 'Test Album',
    releaseDate: new Date(),
    coverUrl: 'https://example.com/cover.jpg',
    artistId: 1,
    artist: mockArtist,
  };

  const mockReview = {
    id: 1,
    userId: 1,
    albumId: 1,
    rating: 5,
    comment: 'Great album!',
    createdAt: new Date(),
    user: {
      id: 1,
      username: 'testuser',
    },
    album: mockAlbum,
  };

  const mockPaginatedResponse = {
    reviews: [mockReview],
    meta: {
      total: 1,
      skip: 0,
      take: 10,
      hasMore: false,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [
        {
          provide: ReviewsService,
          useValue: mockReviewsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<ReviewsController>(ReviewsController);
    service = module.get<ReviewsService>(ReviewsService);

    // Réinitialiser les mocks après chaque test
    jest.clearAllMocks();

    // S'assurer que tous les mocks retournent des valeurs par défaut
    mockReviewsService.create.mockReturnValue(mockReview);
    mockReviewsService.findAll.mockReturnValue(mockPaginatedResponse);
    mockReviewsService.findByAlbumId.mockReturnValue(mockPaginatedResponse);
    mockReviewsService.findByUserId.mockReturnValue(mockPaginatedResponse);
    mockReviewsService.findOne.mockReturnValue(mockReview);
    mockReviewsService.update.mockReturnValue(mockReview);
    mockReviewsService.remove.mockReturnValue(mockReview);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new review', async () => {
      // Arrange
      const user = { userId: 1, username: 'testuser' };
      const createReviewDto: CreateReviewDto = {
        albumId: 1,
        rating: 5,
        comment: 'Great album!',
      };
      mockReviewsService.create.mockResolvedValue(mockReview);

      // Act
      const result = await controller.create(user, createReviewDto);

      // Assert
      expect(mockReviewsService.create).toHaveBeenCalledWith(
        user.userId,
        createReviewDto,
      );
      expect(result).toEqual(mockReview);
    });
  });

  describe('findAll', () => {
    it('should return all reviews with default pagination', async () => {
      // Arrange
      mockReviewsService.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(mockReviewsService.findAll).toHaveBeenCalledWith(0, 10);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return all reviews with custom pagination', async () => {
      // Arrange
      const skip = 10;
      const take = 5;
      mockReviewsService.findAll.mockResolvedValue({
        ...mockPaginatedResponse,
        meta: { ...mockPaginatedResponse.meta, skip, take },
      });

      // Act
      const result = await controller.findAll(skip, take);

      // Assert
      expect(mockReviewsService.findAll).toHaveBeenCalledWith(skip, take);
      expect(result.meta.skip).toEqual(skip);
      expect(result.meta.take).toEqual(take);
    });
  });

  describe('findByAlbumId', () => {
    it('should return all reviews for a specific album with default pagination', async () => {
      // Arrange
      const albumId = 1;
      mockReviewsService.findByAlbumId.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.findByAlbumId(albumId);

      // Assert
      expect(mockReviewsService.findByAlbumId).toHaveBeenCalledWith(
        albumId,
        0,
        10,
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return all reviews for a specific album with custom pagination', async () => {
      // Arrange
      const albumId = 1;
      const skip = 10;
      const take = 5;
      mockReviewsService.findByAlbumId.mockResolvedValue({
        ...mockPaginatedResponse,
        meta: { ...mockPaginatedResponse.meta, skip, take },
      });

      // Act
      const result = await controller.findByAlbumId(albumId, skip, take);

      // Assert
      expect(mockReviewsService.findByAlbumId).toHaveBeenCalledWith(
        albumId,
        skip,
        take,
      );
      expect(result.meta.skip).toEqual(skip);
      expect(result.meta.take).toEqual(take);
    });
  });

  describe('findByUserId', () => {
    it('should return all reviews by a specific user with default pagination', async () => {
      // Arrange
      const userId = 1;
      mockReviewsService.findByUserId.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.findByUserId(userId);

      // Assert
      expect(mockReviewsService.findByUserId).toHaveBeenCalledWith(
        userId,
        0,
        10,
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return all reviews by a specific user with custom pagination', async () => {
      // Arrange
      const userId = 1;
      const skip = 10;
      const take = 5;
      mockReviewsService.findByUserId.mockResolvedValue({
        ...mockPaginatedResponse,
        meta: { ...mockPaginatedResponse.meta, skip, take },
      });

      // Act
      const result = await controller.findByUserId(userId, skip, take);

      // Assert
      expect(mockReviewsService.findByUserId).toHaveBeenCalledWith(
        userId,
        skip,
        take,
      );
      expect(result.meta.skip).toEqual(skip);
      expect(result.meta.take).toEqual(take);
    });
  });

  describe('findOne', () => {
    it('should return a single review by id', async () => {
      // Arrange
      const reviewId = 1;
      mockReviewsService.findOne.mockResolvedValue(mockReview);

      // Act
      const result = await controller.findOne(reviewId);

      // Assert
      expect(mockReviewsService.findOne).toHaveBeenCalledWith(reviewId);
      expect(result).toEqual(mockReview);
    });
  });

  describe('update', () => {
    it('should update a review', async () => {
      // Arrange
      const reviewId = 1;
      const user = { userId: 1, username: 'testuser' };
      const updateReviewDto: UpdateReviewDto = {
        rating: 4,
        comment: 'Updated comment',
      };
      const updatedReview = { ...mockReview, ...updateReviewDto };
      mockReviewsService.update.mockResolvedValue(updatedReview);

      // Act
      const result = await controller.update(reviewId, user, updateReviewDto);

      // Assert
      expect(mockReviewsService.update).toHaveBeenCalledWith(
        reviewId,
        user.userId,
        updateReviewDto,
      );
      expect(result).toEqual(updatedReview);
    });
  });

  describe('remove', () => {
    it('should delete a review', async () => {
      // Arrange
      const reviewId = 1;
      const user = { userId: 1, username: 'testuser' };
      mockReviewsService.remove.mockResolvedValue(mockReview);

      // Act
      const result = await controller.remove(reviewId, user);

      // Assert
      expect(mockReviewsService.remove).toHaveBeenCalledWith(
        reviewId,
        user.userId,
      );
      expect(result).toEqual(mockReview);
    });
  });
});
