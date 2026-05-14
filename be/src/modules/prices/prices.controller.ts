import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PricesService } from './prices.service';
import { CreatePriceDto } from './dto/create-price.dto';
import { UpdatePriceDto } from './dto/update-price.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Prices')
@Controller()
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}

  @Get('fields/:fieldId/prices')
  @Public()
  @ApiOperation({ summary: 'List prices configured for a field (public)' })
  @ApiResponse({ status: 200 })
  findByField(@Param('fieldId', ParseUUIDPipe) fieldId: string) {
    return this.pricesService.findByField(fieldId);
  }

  @Post('fields/:fieldId/prices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a price config for a field (admin)' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 409, description: 'Duplicate price config' })
  create(
    @Param('fieldId', ParseUUIDPipe) fieldId: string,
    @Body() dto: CreatePriceDto,
  ) {
    return this.pricesService.create(fieldId, dto);
  }

  @Patch('prices/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a price config (admin)' })
  @ApiResponse({ status: 200 })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePriceDto,
  ) {
    return this.pricesService.update(id, dto);
  }

  @Delete('prices/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete a price config (admin)' })
  @ApiResponse({ status: 200 })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.pricesService.remove(id);
  }
}
