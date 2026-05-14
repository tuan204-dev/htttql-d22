import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { UserRole } from '../../common/enums';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List users (Admin only)' })
  @ApiQuery({ name: 'role', enum: UserRole, required: false })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  async findAll(@Query() filter: UserFilterDto) {
    const { role, ...pagination } = filter;
    return this.usersService.findAll(pagination as PaginationDto, role);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiResponse({ status: 201, description: 'User created' })
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  async changeMyPassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id (Admin or Self)' })
  @ApiResponse({ status: 200, description: 'User detail' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    if (user.role !== UserRole.ADMIN && user.id !== id) {
      throw new ForbiddenException('You can only access your own profile');
    }
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user (Admin or Self)' })
  @ApiResponse({ status: 200, description: 'User updated' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (user.role !== UserRole.ADMIN) {
      if (user.id !== id) {
        throw new ForbiddenException('You can only update your own profile');
      }
      // Non-admin self update is restricted to fullName, phone, avatarUrl
      const allowed: UpdateUserDto = {
        fullName: dto.fullName,
        phone: dto.phone,
        avatarUrl: dto.avatarUrl,
      };
      // Strip undefined keys to avoid overwriting with undefined
      const sanitized: UpdateUserDto = Object.fromEntries(
        Object.entries(allowed).filter(([, v]) => v !== undefined),
      ) as UpdateUserDto;
      return this.usersService.update(id, sanitized);
    }
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft delete (deactivate) a user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User deactivated' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.remove(id);
  }
}
