import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExecutionContext } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    createdAt: new Date(),
    passwordHash: 'hashedpassword',
  };

  const mockUsersService = {
    findAll: jest.fn().mockResolvedValue([mockUser]),
    findOne: jest.fn().mockImplementation((id) => {
      if (id === 1) {
        return Promise.resolve({
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          createdAt: new Date(),
          reviews: [],
        });
      } else {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
    }),
    update: jest.fn().mockImplementation((id, updateUserDto) => {
      if (id === 1) {
        return Promise.resolve({
          id: 1,
          username: updateUserDto.username || 'testuser',
          email: updateUserDto.email || 'test@example.com',
          createdAt: new Date(),
        });
      } else {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
    }),
    remove: jest.fn().mockImplementation((id) => {
      if (id === 1) {
        return Promise.resolve({ id: 1 });
      } else {
        throw new NotFoundException(`User with ID ${id} not found`);
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
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const result = await controller.findAll();
      expect(result).toEqual([mockUser]);
      expect(usersService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      const result = await controller.findOne(1);
      expect(result).toEqual({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        createdAt: expect.any(Date),
        reviews: [],
      });
      expect(usersService.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw an error if user not found', async () => {
      try {
        await controller.findOne(999);
        // Si on arrive ici, c'est que l'exception n'a pas été lancée
        fail('Expected NotFoundException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain('User with ID 999 not found');
      }
    });
  });

  describe('getMe', () => {
    it('should return the current user', async () => {
      const result = await controller.getMe(mockUser);
      expect(result).toEqual({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        createdAt: expect.any(Date),
        reviews: [],
      });
      expect(usersService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updateUserDto: UpdateUserDto = {
        username: 'updateduser',
        email: 'updated@example.com',
      };
      const result = await controller.update(1, updateUserDto, mockUser);
      expect(result).toEqual({
        id: 1,
        username: 'updateduser',
        email: 'updated@example.com',
        createdAt: expect.any(Date),
      });
      expect(usersService.update).toHaveBeenCalledWith(1, updateUserDto);
    });

    it('should throw an error if trying to update another user', async () => {
      const updateUserDto: UpdateUserDto = {
        username: 'updateduser',
      };
      try {
        await controller.update(2, updateUserDto, mockUser);
        // Si on arrive ici, c'est que l'exception n'a pas été lancée
        fail('Expected Error was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('You can only update your own profile');
        expect(usersService.update).not.toHaveBeenCalled();
      }
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      const result = await controller.remove(1, mockUser);
      expect(result).toEqual({ id: 1 });
      expect(usersService.remove).toHaveBeenCalledWith(1);
    });

    it('should throw an error if trying to delete another user', async () => {
      try {
        await controller.remove(2, mockUser);
        // Si on arrive ici, c'est que l'exception n'a pas été lancée
        fail('Expected Error was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('You can only delete your own account');
        expect(usersService.remove).not.toHaveBeenCalled();
      }
    });
  });
});
