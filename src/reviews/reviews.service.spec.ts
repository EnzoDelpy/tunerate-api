import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    review: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    album: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hash',
    createdAt: new Date(),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Réinitialiser les mocks après chaque test
    jest.clearAllMocks();

    // Configurer les valeurs de retour par défaut pour éviter les erreurs "cannot read property of undefined"
    mockPrismaService.review.findUnique.mockResolvedValue(null);
    mockPrismaService.review.findMany.mockResolvedValue([]);
    mockPrismaService.review.count.mockResolvedValue(0);
    mockPrismaService.album.findUnique.mockResolvedValue(null);
    mockPrismaService.user.findUnique.mockResolvedValue(null);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a review if album exists and user has not already reviewed it', async () => {
      // Arrange
      const userId = 1;
      const createReviewDto: CreateReviewDto = {
        albumId: 1,
        rating: 5,
        comment: 'Great album!',
      };

      mockPrismaService.album.findUnique.mockResolvedValue(mockAlbum);
      mockPrismaService.review.findUnique.mockResolvedValue(null);
      mockPrismaService.review.create.mockResolvedValue(mockReview);

      // Act
      const result = await service.create(userId, createReviewDto);

      // Assert
      expect(mockPrismaService.album.findUnique).toHaveBeenCalledWith({
        where: { id: createReviewDto.albumId },
      });
      expect(mockPrismaService.review.findUnique).toHaveBeenCalledWith({
        where: {
          userId_albumId: {
            userId,
            albumId: createReviewDto.albumId,
          },
        },
      });
      expect(mockPrismaService.review.create).toHaveBeenCalledWith({
        data: {
          userId,
          albumId: createReviewDto.albumId,
          rating: createReviewDto.rating,
          comment: createReviewDto.comment,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
          album: {
            include: {
              artist: true,
            },
          },
        },
      });
      expect(result).toEqual(mockReview);
    });

    it('should throw NotFoundException if album does not exist', async () => {
      // Arrange
      const userId = 1;
      const createReviewDto: CreateReviewDto = {
        albumId: 999,
        rating: 5,
        comment: 'Great album!',
      };

      mockPrismaService.album.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(userId, createReviewDto)).rejects.toThrow(
        new NotFoundException(
          `Album with ID ${createReviewDto.albumId} not found`,
        ),
      );
      expect(mockPrismaService.album.findUnique).toHaveBeenCalledWith({
        where: { id: createReviewDto.albumId },
      });
      expect(mockPrismaService.review.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if user has already reviewed the album', async () => {
      // Arrange
      const userId = 1;
      const createReviewDto: CreateReviewDto = {
        albumId: 1,
        rating: 5,
        comment: 'Great album!',
      };

      mockPrismaService.album.findUnique.mockResolvedValue(mockAlbum);
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);

      // Act & Assert
      await expect(service.create(userId, createReviewDto)).rejects.toThrow(
        new ConflictException('You have already reviewed this album'),
      );
      expect(mockPrismaService.album.findUnique).toHaveBeenCalledWith({
        where: { id: createReviewDto.albumId },
      });
      expect(mockPrismaService.review.findUnique).toHaveBeenCalledWith({
        where: {
          userId_albumId: {
            userId,
            albumId: createReviewDto.albumId,
          },
        },
      });
      expect(mockPrismaService.review.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all reviews with pagination', async () => {
      // Arrange
      const mockReviews = [mockReview];
      const total = 1;
      const skip = 0;
      const take = 10;

      mockPrismaService.review.findMany.mockResolvedValue(mockReviews);
      mockPrismaService.review.count.mockResolvedValue(total);

      // Act
      const result = await service.findAll(skip, take);

      // Assert
      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith({
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
          album: {
            include: {
              artist: true,
            },
          },
        },
      });
      expect(mockPrismaService.review.count).toHaveBeenCalled();
      expect(result).toEqual({
        reviews: mockReviews,
        meta: {
          total,
          skip,
          take,
          hasMore: false,
        },
      });
    });
  });

  describe('findByAlbumId', () => {
    it('should return all reviews for a specific album with pagination', async () => {
      // Arrange
      const albumId = 1;
      const mockReviews = [mockReview];
      const total = 1;
      const skip = 0;
      const take = 10;

      mockPrismaService.album.findUnique.mockResolvedValue(mockAlbum);
      mockPrismaService.review.findMany.mockResolvedValue(mockReviews);
      mockPrismaService.review.count.mockResolvedValue(total);

      // Act
      const result = await service.findByAlbumId(albumId, skip, take);

      // Assert
      expect(mockPrismaService.album.findUnique).toHaveBeenCalledWith({
        where: { id: albumId },
      });
      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith({
        where: { albumId },
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
          album: {
            include: {
              artist: true,
            },
          },
        },
      });
      expect(mockPrismaService.review.count).toHaveBeenCalledWith({
        where: { albumId },
      });
      expect(result).toEqual({
        reviews: mockReviews,
        meta: {
          total,
          skip,
          take,
          hasMore: false,
        },
      });
    });

    it('should throw NotFoundException if album does not exist', async () => {
      // Arrange
      const albumId = 999;

      mockPrismaService.album.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findByAlbumId(albumId)).rejects.toThrow(
        new NotFoundException(`Album with ID ${albumId} not found`),
      );
      expect(mockPrismaService.album.findUnique).toHaveBeenCalledWith({
        where: { id: albumId },
      });
      expect(mockPrismaService.review.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findByUserId', () => {
    it('should return all reviews by a specific user with pagination', async () => {
      // Arrange
      const userId = 1;
      const mockReviews = [mockReview];
      const total = 1;
      const skip = 0;
      const take = 10;

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.review.findMany.mockResolvedValue(mockReviews);
      mockPrismaService.review.count.mockResolvedValue(total);

      // Act
      const result = await service.findByUserId(userId, skip, take);

      // Assert
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith({
        where: { userId },
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
          album: {
            include: {
              artist: true,
            },
          },
        },
      });
      expect(mockPrismaService.review.count).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(result).toEqual({
        reviews: mockReviews,
        meta: {
          total,
          skip,
          take,
          hasMore: false,
        },
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      // Arrange
      const userId = 999;

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findByUserId(userId)).rejects.toThrow(
        new NotFoundException(`User with ID ${userId} not found`),
      );
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockPrismaService.review.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single review by id', async () => {
      // Arrange
      const reviewId = 1;

      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);

      // Act
      const result = await service.findOne(reviewId);

      // Assert
      expect(mockPrismaService.review.findUnique).toHaveBeenCalledWith({
        where: { id: reviewId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
          album: {
            include: {
              artist: true,
            },
          },
        },
      });
      expect(result).toEqual(mockReview);
    });

    it('should throw NotFoundException if review does not exist', async () => {
      // Arrange
      const reviewId = 999;

      mockPrismaService.review.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(reviewId)).rejects.toThrow(
        new NotFoundException(`Review with ID ${reviewId} not found`),
      );
      expect(mockPrismaService.review.findUnique).toHaveBeenCalledWith({
        where: { id: reviewId },
        include: expect.any(Object),
      });
    });
  });

  describe('update', () => {
    it('should update a review if it exists and user is the author', async () => {
      // Arrange
      const reviewId = 1;
      const userId = 1;
      const updateReviewDto: UpdateReviewDto = {
        rating: 4,
        comment: 'Updated comment',
      };

      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.review.update.mockResolvedValue({
        ...mockReview,
        rating: 4,
        comment: 'Updated comment',
      });

      // Act
      const result = await service.update(reviewId, userId, updateReviewDto);

      // Assert
      expect(mockPrismaService.review.findUnique).toHaveBeenCalledWith({
        where: { id: reviewId },
      });
      expect(mockPrismaService.review.update).toHaveBeenCalledWith({
        where: { id: reviewId },
        data: updateReviewDto,
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
          album: {
            include: {
              artist: true,
            },
          },
        },
      });
      expect(result).toEqual({
        ...mockReview,
        rating: 4,
        comment: 'Updated comment',
      });
    });

    it('should throw NotFoundException if review does not exist', async () => {
      // Arrange
      const reviewId = 999;
      const userId = 1;
      const updateReviewDto: UpdateReviewDto = {
        rating: 4,
        comment: 'Updated comment',
      };

      mockPrismaService.review.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update(reviewId, userId, updateReviewDto),
      ).rejects.toThrow(
        new NotFoundException(`Review with ID ${reviewId} not found`),
      );
      expect(mockPrismaService.review.findUnique).toHaveBeenCalledWith({
        where: { id: reviewId },
      });
      expect(mockPrismaService.review.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not the author', async () => {
      // Arrange
      const reviewId = 1;
      const userId = 2; // Un autre utilisateur que celui qui a créé la review
      const updateReviewDto: UpdateReviewDto = {
        rating: 4,
        comment: 'Updated comment',
      };

      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);

      // Act & Assert
      await expect(
        service.update(reviewId, userId, updateReviewDto),
      ).rejects.toThrow(
        new ForbiddenException('You can only update your own reviews'),
      );
      expect(mockPrismaService.review.findUnique).toHaveBeenCalledWith({
        where: { id: reviewId },
      });
      expect(mockPrismaService.review.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a review if it exists and user is the author', async () => {
      // Arrange
      const reviewId = 1;
      const userId = 1;

      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.review.delete.mockResolvedValue(mockReview);

      // Act
      const result = await service.remove(reviewId, userId);

      // Assert
      expect(mockPrismaService.review.findUnique).toHaveBeenCalledWith({
        where: { id: reviewId },
      });
      expect(mockPrismaService.review.delete).toHaveBeenCalledWith({
        where: { id: reviewId },
      });
      expect(result).toEqual(mockReview);
    });

    it('should throw NotFoundException if review does not exist', async () => {
      // Arrange
      const reviewId = 999;
      const userId = 1;

      mockPrismaService.review.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove(reviewId, userId)).rejects.toThrow(
        new NotFoundException(`Review with ID ${reviewId} not found`),
      );
      expect(mockPrismaService.review.findUnique).toHaveBeenCalledWith({
        where: { id: reviewId },
      });
      expect(mockPrismaService.review.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not the author', async () => {
      // Arrange
      const reviewId = 1;
      const userId = 2; // Un autre utilisateur que celui qui a créé la review

      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);

      // Act & Assert
      await expect(service.remove(reviewId, userId)).rejects.toThrow(
        new ForbiddenException('You can only delete your own reviews'),
      );
      expect(mockPrismaService.review.findUnique).toHaveBeenCalledWith({
        where: { id: reviewId },
      });
      expect(mockPrismaService.review.delete).not.toHaveBeenCalled();
    });
  });
});
