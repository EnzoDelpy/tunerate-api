import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, createReviewDto: CreateReviewDto) {
    // Vérifier si l'album existe
    const album = await this.prisma.album.findUnique({
      where: { id: createReviewDto.albumId },
    });

    if (!album) {
      throw new NotFoundException(
        `Album with ID ${createReviewDto.albumId} not found`,
      );
    }

    // Vérifier si l'utilisateur a déjà écrit une critique pour cet album
    const existingReview = await this.prisma.review.findUnique({
      where: {
        userId_albumId: {
          userId,
          albumId: createReviewDto.albumId,
        },
      },
    });

    if (existingReview) {
      throw new ConflictException('You have already reviewed this album');
    }

    // Créer la critique
    return this.prisma.review.create({
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
  }

  async findAll(skip = 0, take = 10) {
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
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
      }),
      this.prisma.review.count(),
    ]);

    return {
      reviews,
      meta: {
        total,
        skip,
        take,
        hasMore: skip + take < total,
      },
    };
  }

  async findByAlbumId(albumId: number, skip = 0, take = 10) {
    // Vérifier si l'album existe
    const album = await this.prisma.album.findUnique({
      where: { id: albumId },
    });

    if (!album) {
      throw new NotFoundException(`Album with ID ${albumId} not found`);
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
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
      }),
      this.prisma.review.count({
        where: { albumId },
      }),
    ]);

    return {
      reviews,
      meta: {
        total,
        skip,
        take,
        hasMore: skip + take < total,
      },
    };
  }

  async findByUserId(userId: number, skip = 0, take = 10) {
    // Vérifier si l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
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
      }),
      this.prisma.review.count({
        where: { userId },
      }),
    ]);

    return {
      reviews,
      meta: {
        total,
        skip,
        take,
        hasMore: skip + take < total,
      },
    };
  }

  async findOne(id: number) {
    const review = await this.prisma.review.findUnique({
      where: { id },
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

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    return review;
  }

  async update(id: number, userId: number, updateReviewDto: UpdateReviewDto) {
    // Vérifier si la critique existe
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    // Vérifier si l'utilisateur est bien l'auteur de la critique
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    // Mettre à jour la critique
    return this.prisma.review.update({
      where: { id },
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
  }

  async remove(id: number, userId: number) {
    // Vérifier si la critique existe
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    // Vérifier si l'utilisateur est bien l'auteur de la critique
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    // Supprimer la critique
    return this.prisma.review.delete({
      where: { id },
    });
  }
}
