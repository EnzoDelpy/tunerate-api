import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { ExecutionContext } from '@nestjs/common';
import { CreateUserDto } from '../users/dto/create-user.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
  };

  const mockAuthService = {
    register: jest.fn().mockImplementation((username, email, password) => {
      return Promise.resolve({
        access_token: 'test-jwt-token',
        user: {
          id: 1,
          username,
          email,
        },
      });
    }),
    login: jest.fn().mockImplementation((user) => {
      return Promise.resolve({
        access_token: 'test-jwt-token',
        user,
      });
    }),
  };

  // Mock pour LocalAuthGuard
  const mockLocalAuthGuard = {
    canActivate: jest.fn().mockImplementation((context: ExecutionContext) => {
      const request = context.switchToHttp().getRequest();
      request.user = mockUser;
      return true;
    }),
  };

  // Mock pour JwtAuthGuard
  const mockJwtAuthGuard = {
    canActivate: jest.fn().mockImplementation((context: ExecutionContext) => {
      const request = context.switchToHttp().getRequest();
      request.user = mockUser;
      return true;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(LocalAuthGuard)
      .useValue(mockLocalAuthGuard)
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const createUserDto: CreateUserDto = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
      };

      const result = await controller.register(createUserDto);

      expect(result).toEqual({
        access_token: 'test-jwt-token',
        user: {
          id: 1,
          username: 'newuser',
          email: 'new@example.com',
        },
      });
      expect(authService.register).toHaveBeenCalledWith(
        'newuser',
        'new@example.com',
        'password123',
      );
    });
  });

  describe('login', () => {
    it('should login an existing user', async () => {
      const req = { user: mockUser };
      const result = await controller.login(req);

      expect(result).toEqual({
        access_token: 'test-jwt-token',
        user: mockUser,
      });
      expect(authService.login).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('getProfile', () => {
    it('should return the authenticated user profile', () => {
      const result = controller.getProfile(mockUser);

      expect(result).toEqual(mockUser);
    });
  });
});
