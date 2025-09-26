import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('ReviewsController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let authToken: string;
  let userId: number;
  let albumId: number;
  let reviewId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();

    // Nettoyer la base de données avant les tests
    await prismaService.review.deleteMany({});
    await prismaService.album.deleteMany({});
    await prismaService.artist.deleteMany({});
    await prismaService.user.deleteMany({});

    // Créer un utilisateur de test
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await prismaService.user.create({
      data: {
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: hashedPassword,
      },
    });
    userId = user.id;

    // Créer un artiste de test
    const artist = await prismaService.artist.create({
      data: {
        name: 'Test Artist',
        externalId: 'artist123',
      },
    });

    // Créer un album de test
    const album = await prismaService.album.create({
      data: {
        title: 'Test Album',
        externalId: 'album123',
        artistId: artist.id,
        coverUrl: 'https://example.com/cover.jpg',
        releaseDate: new Date(),
      },
    });
    albumId = album.id;

    // Générer un token JWT pour l'authentification
    authToken = jwtService.sign({ sub: user.id, username: user.username });
  });

  afterAll(async () => {
    // Nettoyer la base de données après les tests
    await prismaService.review.deleteMany({});
    await prismaService.album.deleteMany({});
    await prismaService.artist.deleteMany({});
    await prismaService.user.deleteMany({});
    await app.close();
  });

  describe('/reviews (POST)', () => {
    it('should create a new review', () => {
      const createReviewDto = {
        albumId: albumId,
        rating: 5,
        comment: 'Great album!',
      };

      return request(app.getHttpServer())
        .post('/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createReviewDto)
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('rating', 5);
          expect(response.body).toHaveProperty('comment', 'Great album!');
          expect(response.body).toHaveProperty('userId', userId);
          expect(response.body).toHaveProperty('albumId', albumId);
          reviewId = response.body.id;
        });
    });

    it('should not allow creating a review without authentication', () => {
      const createReviewDto = {
        albumId: albumId,
        rating: 5,
        comment: 'Great album!',
      };

      return request(app.getHttpServer())
        .post('/reviews')
        .send(createReviewDto)
        .expect(401);
    });

    it('should not allow creating multiple reviews for the same album by the same user', () => {
      const createReviewDto = {
        albumId: albumId,
        rating: 4,
        comment: 'Another review for the same album',
      };

      return request(app.getHttpServer())
        .post('/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createReviewDto)
        .expect(409); // ConflictException
    });

    it('should validate the rating is between 1 and 5', () => {
      const createReviewDto = {
        albumId: albumId,
        rating: 6, // Invalid rating
        comment: 'Invalid rating',
      };

      return request(app.getHttpServer())
        .post('/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createReviewDto)
        .expect(400);
    });
  });

  describe('/reviews (GET)', () => {
    it('should return paginated reviews', () => {
      return request(app.getHttpServer())
        .get('/reviews')
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('reviews');
          expect(response.body).toHaveProperty('meta');
          expect(response.body.meta).toHaveProperty('total');
          expect(response.body.meta).toHaveProperty('skip');
          expect(response.body.meta).toHaveProperty('take');
          expect(response.body.meta).toHaveProperty('hasMore');
          expect(Array.isArray(response.body.reviews)).toBe(true);
        });
    });

    it('should respect pagination parameters', () => {
      return request(app.getHttpServer())
        .get('/reviews?skip=0&take=5')
        .expect(200)
        .then((response) => {
          expect(response.body.meta.skip).toBe(0);
          expect(response.body.meta.take).toBe(5);
        });
    });
  });

  describe('/reviews/album/:albumId (GET)', () => {
    it('should return reviews for a specific album', () => {
      return request(app.getHttpServer())
        .get(`/reviews/album/${albumId}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('reviews');
          expect(response.body).toHaveProperty('meta');
          expect(Array.isArray(response.body.reviews)).toBe(true);
          if (response.body.reviews.length > 0) {
            expect(response.body.reviews[0].albumId).toBe(albumId);
          }
        });
    });

    it('should return 404 for non-existing album', () => {
      return request(app.getHttpServer())
        .get('/reviews/album/9999')
        .expect(404);
    });
  });

  describe('/reviews/user/:userId (GET)', () => {
    it('should return reviews by a specific user', () => {
      return request(app.getHttpServer())
        .get(`/reviews/user/${userId}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('reviews');
          expect(response.body).toHaveProperty('meta');
          expect(Array.isArray(response.body.reviews)).toBe(true);
          if (response.body.reviews.length > 0) {
            expect(response.body.reviews[0].userId).toBe(userId);
          }
        });
    });

    it('should return 404 for non-existing user', () => {
      return request(app.getHttpServer()).get('/reviews/user/9999').expect(404);
    });
  });

  describe('/reviews/:id (GET)', () => {
    it('should return a specific review', () => {
      return request(app.getHttpServer())
        .get(`/reviews/${reviewId}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('id', reviewId);
          expect(response.body).toHaveProperty('rating');
          expect(response.body).toHaveProperty('comment');
          expect(response.body).toHaveProperty('userId', userId);
          expect(response.body).toHaveProperty('albumId', albumId);
        });
    });

    it('should return 404 for non-existing review', () => {
      return request(app.getHttpServer()).get('/reviews/9999').expect(404);
    });
  });

  describe('/reviews/:id (PATCH)', () => {
    it('should update a review', () => {
      const updateReviewDto = {
        rating: 4,
        comment: 'Updated comment',
      };

      return request(app.getHttpServer())
        .patch(`/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateReviewDto)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('id', reviewId);
          expect(response.body).toHaveProperty('rating', 4);
          expect(response.body).toHaveProperty('comment', 'Updated comment');
        });
    });

    it('should not allow updating a review without authentication', () => {
      const updateReviewDto = {
        rating: 3,
        comment: 'Another update',
      };

      return request(app.getHttpServer())
        .patch(`/reviews/${reviewId}`)
        .send(updateReviewDto)
        .expect(401);
    });

    it('should validate the updated rating is between 1 and 5', () => {
      const updateReviewDto = {
        rating: 0, // Invalid rating
        comment: 'Invalid rating update',
      };

      return request(app.getHttpServer())
        .patch(`/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateReviewDto)
        .expect(400);
    });
  });

  describe('/reviews/:id (DELETE)', () => {
    it('should delete a review', () => {
      return request(app.getHttpServer())
        .delete(`/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should not allow deleting a review without authentication', () => {
      return request(app.getHttpServer())
        .delete(`/reviews/${reviewId}`)
        .expect(401);
    });

    it('should return 404 for already deleted review', () => {
      return request(app.getHttpServer())
        .delete(`/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
