import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  TxStatus,
  UserRole,
} from '../../common/enums';
import { Booking } from '../bookings/entities/booking.entity';
import { BookingService } from '../bookings/entities/booking-service.entity';
import { CashPaymentDto } from './dto/cash-payment.dto';
import { CreateVnpayDto } from './dto/create-vnpay.dto';
import { Payment } from './entities/payment.entity';

interface AuthUser {
  id: string;
  email?: string;
  role: UserRole;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Cash payment performed by staff. Wrapped in a transaction so the payment
   * insertion and booking status updates remain consistent.
   */
  async payCash(staffId: string, dto: CashPaymentDto): Promise<Payment> {
    return this.dataSource.transaction(async (manager) => {
      const bookingRepo = manager.getRepository(Booking);
      const paymentRepo = manager.getRepository(Payment);

      const booking = await bookingRepo.findOne({ where: { id: dto.bookingId } });
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (
        booking.status === BookingStatus.COMPLETED ||
        booking.status === BookingStatus.CANCELLED ||
        booking.status === BookingStatus.REJECTED
      ) {
        throw new BadRequestException(
          `Cannot accept payment for booking with status ${booking.status}`,
        );
      }

      const payment = paymentRepo.create({
        bookingId: booking.id,
        amount: dto.amount.toFixed(2),
        method: dto.method ?? PaymentMethod.CASH,
        type: dto.type,
        status: TxStatus.SUCCESS,
        paidAt: new Date(),
        receivedBy: staffId,
      });
      const saved = await paymentRepo.save(payment);

      await this.recalculateBookingPaymentState(manager, booking.id);

      return saved;
    });
  }

  /**
   * Sums all successful payments for a booking. REFUND amounts are subtracted
   * from DEPOSIT / FULL_PAYMENT inflow.
   */
  private async sumPaidAmount(
    manager: EntityManager,
    bookingId: string,
  ): Promise<number> {
    const row = await manager
      .getRepository(Payment)
      .createQueryBuilder('p')
      .select(
        `COALESCE(SUM(CASE WHEN p.type = :refund THEN -p.amount ELSE p.amount END), 0)`,
        'paid',
      )
      .where('p.booking_id = :bookingId', { bookingId })
      .andWhere('p.status = :success', { success: TxStatus.SUCCESS })
      .setParameter('refund', PaymentType.REFUND)
      .getRawOne<{ paid: string }>();

    return Number(row?.paid ?? 0);
  }

  /**
   * Recalculate booking.paymentStatus from sum of SUCCESS payments and
   * auto-confirm if the deposit threshold is met while still pending payment.
   */
  private async recalculateBookingPaymentState(
    manager: EntityManager,
    bookingId: string,
  ): Promise<void> {
    const bookingRepo = manager.getRepository(Booking);
    const booking = await bookingRepo.findOne({ where: { id: bookingId } });
    if (!booking) return;

    const paid = await this.sumPaidAmount(manager, bookingId);
    const total = Number(booking.totalPrice);
    const deposit = Number(booking.depositAmount);

    let newStatus: PaymentStatus;
    if (paid <= 0) {
      newStatus = PaymentStatus.UNPAID;
    } else if (paid >= total) {
      newStatus = PaymentStatus.FULLY_PAID;
    } else if (deposit > 0 && paid >= deposit) {
      newStatus = PaymentStatus.DEPOSITED;
    } else {
      newStatus = PaymentStatus.UNPAID;
    }

    booking.paymentStatus = newStatus;

    if (
      newStatus === PaymentStatus.DEPOSITED &&
      booking.status === BookingStatus.PENDING_PAYMENT
    ) {
      booking.status = BookingStatus.CONFIRMED;
    } else if (
      newStatus === PaymentStatus.FULLY_PAID &&
      booking.status === BookingStatus.PENDING_PAYMENT
    ) {
      booking.status = BookingStatus.CONFIRMED;
    }

    await bookingRepo.save(booking);
  }

  /**
   * Creates a VNPay payment URL.
   *
   * MOCK MODE: When VNPAY_TMN_CODE / VNPAY_HASH_SECRET are not configured we
   * return a fake URL pointing at a local mock endpoint. This allows the
   * frontend flow to work end-to-end during development without real VNPay
   * sandbox credentials.
   */
  async createVnpayUrl(
    customerId: string,
    dto: CreateVnpayDto,
  ): Promise<{ paymentId: string; paymentUrl: string; mock: boolean }> {
    const booking = await this.bookingRepo.findOne({
      where: { id: dto.bookingId },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.customerId !== customerId) {
      throw new ForbiddenException('You can only pay for your own bookings');
    }

    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.REJECTED ||
      booking.status === BookingStatus.COMPLETED
    ) {
      throw new BadRequestException(
        `Cannot create payment for booking with status ${booking.status}`,
      );
    }

    // Default to remaining amount due (or full deposit / total).
    const paid = await this.dataSource.transaction((m) =>
      this.sumPaidAmount(m, booking.id),
    );
    const total = Number(booking.totalPrice);
    const remaining = Math.max(total - paid, 0);

    // Choose the requested type heuristically: if anything has been paid we
    // treat it as full payment, otherwise we collect the deposit.
    const type: PaymentType =
      paid > 0 || Number(booking.depositAmount) <= 0
        ? PaymentType.FULL_PAYMENT
        : PaymentType.DEPOSIT;
    const amount =
      type === PaymentType.DEPOSIT
        ? Number(booking.depositAmount)
        : remaining > 0
          ? remaining
          : total;

    if (amount <= 0) {
      throw new BadRequestException('Nothing left to pay');
    }

    const txnRef = `${booking.id.slice(0, 8)}-${Date.now()}`;
    const payment = this.paymentRepo.create({
      bookingId: booking.id,
      amount: amount.toFixed(2),
      method: PaymentMethod.VNPAY,
      type,
      status: TxStatus.PENDING,
      transactionCode: txnRef,
    });
    const saved = await this.paymentRepo.save(payment);

    const tmnCode = this.configService.get<string>('VNPAY_TMN_CODE');
    const hashSecret = this.configService.get<string>('VNPAY_HASH_SECRET');
    const vnpUrl = this.configService.get<string>('VNPAY_URL');
    const defaultReturnUrl = this.configService.get<string>('VNPAY_RETURN_URL');

    // MOCK: no real credentials configured -> return a fake URL the FE/dev can hit.
    if (!tmnCode || !hashSecret || !vnpUrl) {
      const mockUrl = `http://localhost:3000/mock-vnpay?bookingId=${booking.id}&amount=${amount}&txnRef=${txnRef}&paymentId=${saved.id}`;
      return { paymentId: saved.id, paymentUrl: mockUrl, mock: true };
    }

    // Real signed VNPay URL (sandbox-compatible).
    const createDate = formatVnpDate(new Date());
    const returnUrl = dto.returnUrl ?? defaultReturnUrl ?? '';
    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: String(Math.round(amount * 100)),
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Thanh toan booking ${booking.bookingCode}`,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: '127.0.0.1',
      vnp_CreateDate: createDate,
    };

    const sortedKeys = Object.keys(params).sort();
    const signData = sortedKeys
      .map((k) => `${k}=${encodeURIComponent(params[k]).replace(/%20/g, '+')}`)
      .join('&');
    const hmac = crypto
      .createHmac('sha512', hashSecret)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');
    const paymentUrl = `${vnpUrl}?${signData}&vnp_SecureHash=${hmac}`;

    return { paymentId: saved.id, paymentUrl, mock: false };
  }

  /**
   * Handle VNPay return (browser redirect). In MOCK mode we just trust
   * vnp_ResponseCode=00 and mark the matching pending payment SUCCESS.
   */
  async handleVnpayReturn(
    query: Record<string, string>,
  ): Promise<{ status: 'SUCCESS' | 'FAILED'; paymentId?: string }> {
    return this.processVnpayCallback(query);
  }

  /**
   * Handle VNPay IPN webhook (server-to-server). Same logic as return for the
   * mock path; production code would also re-verify signature & idempotency.
   */
  async handleVnpayIpn(
    query: Record<string, string>,
  ): Promise<{ RspCode: string; Message: string }> {
    const result = await this.processVnpayCallback(query);
    if (result.status === 'SUCCESS') {
      return { RspCode: '00', Message: 'Confirm Success' };
    }
    return { RspCode: '99', Message: 'Failed' };
  }

  private async processVnpayCallback(
    query: Record<string, string>,
  ): Promise<{ status: 'SUCCESS' | 'FAILED'; paymentId?: string }> {
    const txnRef = query.vnp_TxnRef;
    const responseCode = query.vnp_ResponseCode;
    if (!txnRef) {
      return { status: 'FAILED' };
    }

    const payment = await this.paymentRepo.findOne({
      where: { transactionCode: txnRef },
    });
    if (!payment) {
      return { status: 'FAILED' };
    }

    // Idempotency: if already settled, just report the prior outcome.
    if (payment.status === TxStatus.SUCCESS) {
      return { status: 'SUCCESS', paymentId: payment.id };
    }
    if (payment.status === TxStatus.FAILED) {
      return { status: 'FAILED', paymentId: payment.id };
    }

    // In real flow, verify vnp_SecureHash here using HMAC-SHA512 over the
    // remaining params with the configured hash secret. MOCK skips this.
    const hashSecret = this.configService.get<string>('VNPAY_HASH_SECRET');
    if (hashSecret && query.vnp_SecureHash) {
      const ok = verifyVnpHash(query, hashSecret);
      if (!ok) {
        return { status: 'FAILED', paymentId: payment.id };
      }
    }

    if (responseCode === '00') {
      await this.dataSource.transaction(async (manager) => {
        const repo = manager.getRepository(Payment);
        payment.status = TxStatus.SUCCESS;
        payment.paidAt = new Date();
        await repo.save(payment);
        await this.recalculateBookingPaymentState(manager, payment.bookingId);
      });
      return { status: 'SUCCESS', paymentId: payment.id };
    }

    payment.status = TxStatus.FAILED;
    await this.paymentRepo.save(payment);
    return { status: 'FAILED', paymentId: payment.id };
  }

  async findByBooking(
    bookingId: string,
    currentUser: AuthUser,
  ): Promise<Payment[]> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (
      currentUser.role === UserRole.CUSTOMER &&
      booking.customerId !== currentUser.id
    ) {
      throw new ForbiddenException('You can only access your own bookings');
    }

    return this.paymentRepo.find({
      where: { bookingId },
      order: { createdAt: 'ASC' },
    });
  }

  async generateInvoice(bookingId: string, currentUser: AuthUser) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: ['customer', 'field', 'slots'],
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (
      currentUser.role === UserRole.CUSTOMER &&
      booking.customerId !== currentUser.id
    ) {
      throw new ForbiddenException('You can only access your own invoices');
    }

    const payments = await this.paymentRepo.find({
      where: { bookingId },
      order: { createdAt: 'ASC' },
    });

    const services = await this.dataSource
      .getRepository(BookingService)
      .find({ where: { bookingId }, relations: ['service'] });

    const total = Number(booking.totalPrice);
    const paid = payments
      .filter((p) => p.status === TxStatus.SUCCESS)
      .reduce(
        (acc, p) =>
          acc + (p.type === PaymentType.REFUND ? -Number(p.amount) : Number(p.amount)),
        0,
      );
    const remaining = Math.max(total - paid, 0);

    return {
      booking,
      payments,
      services,
      total,
      paid,
      remaining,
    };
  }
}

function formatVnpDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

function verifyVnpHash(
  query: Record<string, string>,
  hashSecret: string,
): boolean {
  const { vnp_SecureHash, vnp_SecureHashType, ...rest } = query;
  void vnp_SecureHashType;
  const sortedKeys = Object.keys(rest).sort();
  const signData = sortedKeys
    .map((k) => `${k}=${encodeURIComponent(rest[k]).replace(/%20/g, '+')}`)
    .join('&');
  const hmac = crypto
    .createHmac('sha512', hashSecret)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');
  return hmac.toLowerCase() === (vnp_SecureHash ?? '').toLowerCase();
}
