import {
  Body,
  Controller,
  Delete,
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
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { ValidatePromotionDto } from './dto/validate-promotion.dto';
import { PromotionsService } from './promotions.service';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

@ApiTags('Promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'List promotions. Admin gets all; others get only active ones',
  })
  @ApiQuery({
    name: 'all',
    required: false,
    type: Boolean,
    description: 'Admin only: include inactive/expired promotions',
  })
  @ApiResponse({ status: 200, description: 'List of promotions' })
  async findAll(
    @CurrentUser() user: AuthUser | undefined,
    @Query('all') all?: string,
  ) {
    const wantAll = all === 'true' || all === '1';
    const activeOnly = !(user?.role === UserRole.ADMIN && wantAll);
    return this.promotionsService.findAll(activeOnly);
  }

  @Post('validate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Validate a promotion code against an order amount' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validate(@Body() dto: ValidatePromotionDto) {
    return this.promotionsService.validate(dto);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get promotion by id (Admin only)' })
  @ApiResponse({ status: 200, description: 'Promotion detail' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.promotionsService.findById(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a promotion (Admin only)' })
  @ApiResponse({ status: 201, description: 'Promotion created' })
  async create(@Body() dto: CreatePromotionDto) {
    return this.promotionsService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a promotion (Admin only)' })
  @ApiResponse({ status: 200, description: 'Promotion updated' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePromotionDto,
  ) {
    return this.promotionsService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft delete a promotion (Admin only)' })
  @ApiResponse({ status: 200, description: 'Promotion deactivated' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.promotionsService.remove(id);
  }
}
