import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DateRangeDto } from './dto/date-range.dto';
import { ReportsService } from './reports.service';
import type { RevenueGroupBy } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('revenue')
  @ApiOperation({ summary: 'Revenue report (Admin)' })
  @ApiQuery({ name: 'groupBy', enum: ['day', 'month', 'field'], required: false })
  async revenue(
    @Query() range: DateRangeDto,
    @Query('groupBy', new DefaultValuePipe('day')) groupBy: RevenueGroupBy,
  ) {
    return this.reportsService.revenue(range, groupBy);
  }

  @Get('bookings')
  @ApiOperation({ summary: 'Booking report (Admin)' })
  async bookings(@Query() range: DateRangeDto) {
    return this.reportsService.bookings(range);
  }

  @Get('summary')
  @ApiOperation({ summary: 'High-level KPI summary for admin dashboard' })
  async summary(@Query() range: DateRangeDto) {
    return this.reportsService.summary(range);
  }

  @Get('top-customers')
  @ApiOperation({ summary: 'Top customers by total spent (Admin)' })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async topCustomers(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.reportsService.topCustomers(limit);
  }

  @Get('field-utilization')
  @ApiOperation({ summary: 'Field utilization (Admin)' })
  async fieldUtilization(@Query() range: DateRangeDto) {
    return this.reportsService.fieldUtilization(range);
  }

  @Get('services')
  @ApiOperation({ summary: 'Service revenue report (Admin)' })
  async services(@Query() range: DateRangeDto) {
    return this.reportsService.services(range);
  }
}
