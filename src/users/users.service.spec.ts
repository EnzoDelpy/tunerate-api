import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

// Mock bcrypt pour éviter les opérations de hashing réelles dans les tests
jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashedPassword123',
    createdAt: new Date(),
    reviews: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Réinitialiser les mocks
    jest.clearAllMocks();

    // Configurer les valeurs de retour par défaut
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
    mockPrismaService.user.findUnique.mockResolvedValue(null);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user and hash the password', async () => {
      // Arrange
      const createUserDto: CreateUserDto = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
      };
      const expectedUser = {
        id: 1,
        username: 'newuser',
        email: 'newuser@example.com',
        passwordHash: 'hashedPassword123',
        createdAt: expect.any(Date),
      };
      mockPrismaService.user.create.mockResolvedValue(expectedUser);

      // Act
      const result = await service.create(createUserDto);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          username: 'newuser',
          email: 'newuser@example.com',
          passwordHash: 'hashedPassword123',
        },
      });
      expect(result).toEqual(expectedUser);
    });

    it('should throw ConflictException when username or email already exists', async () => {
      // Arrange
      const createUserDto: CreateUserDto = {
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'password123',
      };

      const error = new Error('Unique constraint failed');
      error['code'] = 'P2002';
      mockPrismaService.user.create.mockRejectedValue(error);

      // Act & Assert
      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    });
  });

  describe('findAll', () => {
    it('should return an array of users without passwords', async () => {
      // Arrange
      const users = [
        {
          id: 1,
          username: 'user1',
          email: 'user1@example.com',
          createdAt: new Date(),
        },
        {
          id: 2,
          username: 'user2',
          email: 'user2@example.com',
          createdAt: new Date(),
        },
      ];
      mockPrismaService.user.findMany.mockResolvedValue(users);

      // Act
      const result = await service.findAll();

      // Assert
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
        },
      });
      expect(result).toEqual(users);
    });
  });

  describe('findOne', () => {
    it('should return a user if it exists', async () => {
      // Arrange
      const id = 1;
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await service.findOne(id);

      // Assert
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id },
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
          reviews: true,
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      // Arrange
      const id = 999;
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id },
        select: expect.any(Object),
      });
    });
  });

  describe('findByUsername', () => {
    it('should return a user if found by username', async () => {
      // Arrange
      const username = 'testuser';
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await service.findByUsername(username);

      // Assert
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      // Arrange
      const username = 'nonexistent';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.findByUsername(username);

      // Assert
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username },
      });
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user details', async () => {
      // Arrange
      const id = 1;
      const updateUserDto: UpdateUserDto = {
        username: 'updateduser',
        email: 'updated@example.com',
      };
      const updatedUser = {
        id,
        username: 'updateduser',
        email: 'updated@example.com',
        createdAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.update(id, updateUserDto);

      // Assert
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id },
        data: updateUserDto,
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
        },
      });
      expect(result).toEqual(updatedUser);
    });

    it('should hash password when updating password', async () => {
      // Arrange
      const id = 1;
      const updateUserDto: UpdateUserDto = {
        password: 'newpassword123',
      };
      const updatedUser = {
        id,
        username: 'testuser',
        email: 'test@example.com',
        createdAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.update(id, updateUserDto);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id },
        data: { passwordHash: 'hashedPassword123' },
        select: expect.any(Object),
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      // Arrange
      const id = 999;
      const updateUserDto: UpdateUserDto = {
        username: 'updateduser',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(id, updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when username already exists', async () => {
      // Arrange
      const id = 1;
      const updateUserDto: UpdateUserDto = {
        username: 'existinguser',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const error = new Error('Unique constraint failed');
      error['code'] = 'P2002';
      mockPrismaService.user.update.mockRejectedValue(error);

      // Act & Assert
      await expect(service.update(id, updateUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a user if it exists', async () => {
      // Arrange
      const id = 1;
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.delete.mockResolvedValue(mockUser);

      // Act
      const result = await service.remove(id);

      // Assert
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id },
      });
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      // Arrange
      const id = 999;
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove(id)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.user.delete).not.toHaveBeenCalled();
    });
  });
});
