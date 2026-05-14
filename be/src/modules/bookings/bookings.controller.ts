import {
  Body,
  Controller,
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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BookingsService } from './bookings.service';
import { AddServicesDto } from './dto/add-services.dto';
import { BookingFilterDto } from './dto/booking-filter.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RejectBookingDto } from './dto/reject-booking.dto';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a booking' })
  @ApiResponse({ status: 201, description: 'Booking created' })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List bookings (filtered by role)' })
  @ApiResponse({ status: 200, description: 'Paginated bookings' })
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query() filter: BookingFilterDto,
  ) {
    return this.bookingsService.findAll(filter, {
      id: user.id,
      role: user.role,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking detail' })
  @ApiResponse({ status: 200, description: 'Booking detail' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.bookingsService.findById(id, {
      id: user.id,
      role: user.role,
    });
  }

  @Patch(':id/confirm')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'Confirm a booking (Staff/Admin)' })
  async confirm(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.bookingsService.confirm(id, user.id);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'Reject a booking (Staff/Admin)' })
  async reject(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RejectBookingDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.bookingsService.reject(id, user.id, dto.reason);
  }

  @Patch(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Cancel own booking (Customer)' })
  async cancel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.bookingsService.cancel(id, user.id);
  }

  @Patch(':id/check-in')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'Check in a booking (Staff/Admin)' })
  async checkIn(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.bookingsService.checkIn(id);
  }

  @Patch(':id/complete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'Complete a booking (Staff/Admin)' })
  async complete(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.bookingsService.complete(id);
  }

  @Post(':id/services')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'Add services to a booking' })
  async addServices(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AddServicesDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.bookingsService.addServices(id, dto, {
      id: user.id,
      role: user.role,
    });
  }
}
