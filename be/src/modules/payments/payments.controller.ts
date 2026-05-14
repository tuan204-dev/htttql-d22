import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '../../common/enums';
import { CashPaymentDto } from './dto/cash-payment.dto';
import { CreateVnpayDto } from './dto/create-vnpay.dto';
import { PaymentsService } from './payments.service';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

@ApiTags('Payments')
@ApiBearerAuth()
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('payments/cash')
  @ApiOperation({ summary: 'Record a cash payment' })
  @ApiResponse({ status: 201, description: 'Payment recorded' })
  async payCash(
    @CurrentUser() user: AuthUser,
    @Body() dto: CashPaymentDto,
  ) {
    return this.paymentsService.payCash(user.id, dto);
  }

  @Post('payments/vnpay/create')
  @ApiOperation({ summary: 'Create a VNPay payment URL for a booking' })
  @ApiResponse({ status: 201, description: 'Payment URL created' })
  async createVnpay(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateVnpayDto,
  ) {
    return this.paymentsService.createVnpayUrl(user.id, dto);
  }

  @Get('payments/vnpay/return')
  @Public()
  @ApiOperation({ summary: 'VNPay browser return callback' })
  async vnpayReturn(@Query() query: Record<string, string>) {
    return this.paymentsService.handleVnpayReturn(query);
  }

  @Post('payments/vnpay/ipn')
  @Public()
  @ApiOperation({ summary: 'VNPay IPN webhook' })
  async vnpayIpn(@Query() query: Record<string, string>) {
    return this.paymentsService.handleVnpayIpn(query);
  }

  @Get('bookings/:id/payments')
  @ApiOperation({ summary: 'List payments for a booking (owner / staff)' })
  async listByBooking(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentsService.findByBooking(id, user);
  }

  @Get('bookings/:id/invoice')
  @ApiOperation({ summary: 'Generate invoice payload for a booking' })
  async getInvoice(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentsService.generateInvoice(id, user);
  }
}
