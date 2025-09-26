import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashedpassword',
    createdAt: new Date(),
  };

  const mockUsersService = {
    findByUsername: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(() => 'test-jwt-token'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user object without password when validation is successful', async () => {
      mockUsersService.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('testuser', 'password');
      expect(result).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        createdAt: mockUser.createdAt,
      });
      expect(mockUsersService.findByUsername).toHaveBeenCalledWith('testuser');
      expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashedpassword');
    });

    it('should return null when user is not found', async () => {
      mockUsersService.findByUsername.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent', 'password');
      expect(result).toBeNull();
    });

    it('should return null when password does not match', async () => {
      mockUsersService.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('testuser', 'wrongpassword');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token and user info', async () => {
      const user = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      };

      const result = await service.login(user);

      expect(result).toEqual({
        access_token: 'test-jwt-token',
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
        },
      });

      expect(jwtService.sign).toHaveBeenCalledWith({
        username: 'testuser',
        sub: 1,
      });
    });
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockUsersService.findByUsername.mockResolvedValue(null);
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({
        id: 1,
        username: 'newuser',
        email: 'new@example.com',
        passwordHash: 'newhash',
      });

      const result = await service.register(
        'newuser',
        'new@example.com',
        'password123',
      );

      expect(mockUsersService.findByUsername).toHaveBeenCalledWith('newuser');
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        'new@example.com',
      );
      expect(mockUsersService.create).toHaveBeenCalledWith({
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
      });

      expect(result).toEqual({
        access_token: 'test-jwt-token',
        user: {
          id: 1,
          username: 'newuser',
          email: 'new@example.com',
        },
      });
    });

    it('should throw UnauthorizedException when username already exists', async () => {
      mockUsersService.findByUsername.mockResolvedValue(mockUser);

      await expect(
        service.register('testuser', 'new@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when email already exists', async () => {
      mockUsersService.findByUsername.mockResolvedValue(null);
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.register('newuser', 'test@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockUsersService.create).not.toHaveBeenCalled();
    });
  });
});
