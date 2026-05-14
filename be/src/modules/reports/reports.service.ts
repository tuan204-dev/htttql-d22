import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BookingStatus,
  PaymentType,
  TxStatus,
} from '../../common/enums';
import { Booking } from '../bookings/entities/booking.entity';
import { BookingService } from '../bookings/entities/booking-service.entity';
import { Field } from '../fields/entities/field.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Service } from '../services/entities/service.entity';
import { User } from '../users/entities/user.entity';
import { DateRangeDto, resolveDateRange } from './dto/date-range.dto';

export type RevenueGroupBy = 'day' | 'month' | 'field';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(BookingService)
    private readonly bookingServiceRepo: Repository<BookingService>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Field)
    private readonly fieldRepo: Repository<Field>,
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
  ) {}

  /**
   * Aggregate revenue from successful payments in the [from, to] window.
   * Splits field-related revenue (DEPOSIT / FULL_PAYMENT) from service revenue
   * (sum of booking_services subtotals over completed bookings in the window).
   */
  async revenue(range: DateRangeDto, groupBy: RevenueGroupBy = 'day') {
    const { from, to } = resolveDateRange(range);

    const baseQb = this.paymentRepo
      .createQueryBuilder('p')
      .where('p.status = :ok', { ok: TxStatus.SUCCESS })
      .andWhere('p.paid_at >= :from', { from: `${from} 00:00:00` })
      .andWhere('p.paid_at <= :to', { to: `${to} 23:59:59` });

    // Field revenue: DEPOSIT + FULL_PAYMENT - REFUND
    const totalsRow = await baseQb
      .clone()
      .select(
        `COALESCE(SUM(CASE WHEN p.type = :refund THEN -p.amount ELSE p.amount END), 0)`,
        'total',
      )
      .setParameter('refund', PaymentType.REFUND)
      .getRawOne<{ total: string }>();
    const total = Number(totalsRow?.total ?? 0);

    const fieldRow = await baseQb
      .clone()
      .select(
        `COALESCE(SUM(CASE WHEN p.type = :refund THEN -p.amount ELSE p.amount END), 0)`,
        'total',
      )
      .andWhere('p.type IN (:...types)', {
        types: [
          PaymentType.DEPOSIT,
          PaymentType.FULL_PAYMENT,
          PaymentType.REFUND,
        ],
      })
      .setParameter('refund', PaymentType.REFUND)
      .getRawOne<{ total: string }>();
    const fieldRevenue = Number(fieldRow?.total ?? 0);

    // Service revenue: sum of booking_services subtotals where the booking
    // completed within the window.
    const svcRow = await this.bookingServiceRepo
      .createQueryBuilder('bs')
      .innerJoin('bs.booking', 'b')
      .select('COALESCE(SUM(bs.subtotal), 0)', 'total')
      .where('b.status = :completed', { completed: BookingStatus.COMPLETED })
      .andWhere('b.booking_date >= :from', { from })
      .andWhere('b.booking_date <= :to', { to })
      .getRawOne<{ total: string }>();
    const serviceRevenue = Number(svcRow?.total ?? 0);

    let series: Array<{ label: string; total: number }> = [];
    if (groupBy === 'day') {
      const rows = await baseQb
        .clone()
        .select(`TO_CHAR(p.paid_at, 'YYYY-MM-DD')`, 'label')
        .addSelect(
          `COALESCE(SUM(CASE WHEN p.type = :refund THEN -p.amount ELSE p.amount END), 0)`,
          'total',
        )
        .groupBy(`TO_CHAR(p.paid_at, 'YYYY-MM-DD')`)
        .orderBy(`TO_CHAR(p.paid_at, 'YYYY-MM-DD')`, 'ASC')
        .setParameter('refund', PaymentType.REFUND)
        .getRawMany<{ label: string; total: string }>();
      series = rows.map((r) => ({ label: r.label, total: Number(r.total) }));
    } else if (groupBy === 'month') {
      const rows = await baseQb
        .clone()
        .select(`TO_CHAR(p.paid_at, 'YYYY-MM')`, 'label')
        .addSelect(
          `COALESCE(SUM(CASE WHEN p.type = :refund THEN -p.amount ELSE p.amount END), 0)`,
          'total',
        )
        .groupBy(`TO_CHAR(p.paid_at, 'YYYY-MM')`)
        .orderBy(`TO_CHAR(p.paid_at, 'YYYY-MM')`, 'ASC')
        .setParameter('refund', PaymentType.REFUND)
        .getRawMany<{ label: string; total: string }>();
      series = rows.map((r) => ({ label: r.label, total: Number(r.total) }));
    } else if (groupBy === 'field') {
      const rows = await this.paymentRepo
        .createQueryBuilder('p')
        .innerJoin('p.booking', 'b')
        .innerJoin('b.field', 'f')
        .select('f.id', 'fieldId')
        .addSelect('f.name', 'label')
        .addSelect(
          `COALESCE(SUM(CASE WHEN p.type = :refund THEN -p.amount ELSE p.amount END), 0)`,
          'total',
        )
        .where('p.status = :ok', { ok: TxStatus.SUCCESS })
        .andWhere('p.paid_at >= :from', { from: `${from} 00:00:00` })
        .andWhere('p.paid_at <= :to', { to: `${to} 23:59:59` })
        .groupBy('f.id')
        .addGroupBy('f.name')
        .orderBy('total', 'DESC')
        .setParameter('refund', PaymentType.REFUND)
        .getRawMany<{ fieldId: string; label: string; total: string }>();
      series = rows.map((r) => ({ label: r.label, total: Number(r.total) }));
    }

    return { total, fieldRevenue, serviceRevenue, series };
  }

  async bookings(range: DateRangeDto) {
    const { from, to } = resolveDateRange(range);

    const statusRows = await this.bookingRepo
      .createQueryBuilder('b')
      .select('b.status', 'status')
      .addSelect('COUNT(b.id)', 'count')
      .where('b.booking_date >= :from', { from })
      .andWhere('b.booking_date <= :to', { to })
      .groupBy('b.status')
      .getRawMany<{ status: string; count: string }>();

    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const r of statusRows) {
      const n = Number(r.count);
      byStatus[r.status] = n;
      total += n;
    }

    const dailyRows = await this.bookingRepo
      .createQueryBuilder('b')
      .select(`TO_CHAR(b.booking_date, 'YYYY-MM-DD')`, 'label')
      .addSelect('COUNT(b.id)', 'count')
      .where('b.booking_date >= :from', { from })
      .andWhere('b.booking_date <= :to', { to })
      .groupBy(`TO_CHAR(b.booking_date, 'YYYY-MM-DD')`)
      .orderBy(`TO_CHAR(b.booking_date, 'YYYY-MM-DD')`, 'ASC')
      .getRawMany<{ label: string; count: string }>();

    const series = dailyRows.map((r) => ({
      label: r.label,
      total: Number(r.count),
    }));

    return { total, byStatus, series };
  }

  async topCustomers(limit = 10) {
    const rows = await this.paymentRepo
      .createQueryBuilder('p')
      .innerJoin('p.booking', 'b')
      .innerJoin('b.customer', 'c')
      .select('c.id', 'customerId')
      .addSelect('COUNT(DISTINCT b.id)', 'bookingCount')
      .addSelect(
        `COALESCE(SUM(CASE WHEN p.type = :refund THEN -p.amount ELSE p.amount END), 0)`,
        'totalSpent',
      )
      .where('p.status = :ok', { ok: TxStatus.SUCCESS })
      .groupBy('c.id')
      .orderBy('"totalSpent"', 'DESC')
      .limit(limit)
      .setParameter('refund', PaymentType.REFUND)
      .getRawMany<{
        customerId: string;
        bookingCount: string;
        totalSpent: string;
      }>();

    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.customerId);
    const customers = await this.userRepo
      .createQueryBuilder('u')
      .where('u.id IN (:...ids)', { ids })
      .getMany();
    const byId = new Map(customers.map((c) => [c.id, c]));

    return rows.map((r) => ({
      customer: byId.get(r.customerId) ?? null,
      bookingCount: Number(r.bookingCount),
      totalSpent: Number(r.totalSpent),
    }));
  }

  /**
   * For each field compute booked hours (sum of slot durations of non-cancelled
   * bookings within the window) and available hours (operating hours per field
   * per day across the window).
   */
  async fieldUtilization(range: DateRangeDto) {
    const { from, to } = resolveDateRange(range);

    const fields = await this.fieldRepo.find();

    const rows = await this.bookingRepo
      .createQueryBuilder('b')
      .select('b.field_id', 'fieldId')
      .addSelect('COALESCE(SUM(b.total_hours), 0)', 'bookedHours')
      .where('b.booking_date >= :from', { from })
      .andWhere('b.booking_date <= :to', { to })
      .andWhere('b.status NOT IN (:...excluded)', {
        excluded: [BookingStatus.CANCELLED, BookingStatus.REJECTED],
      })
      .groupBy('b.field_id')
      .getRawMany<{ fieldId: string; bookedHours: string }>();

    const bookedMap = new Map(
      rows.map((r) => [r.fieldId, Number(r.bookedHours)]),
    );

    // Inclusive day count
    const days =
      Math.max(
        Math.round(
          (new Date(to).getTime() - new Date(from).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
        0,
      ) + 1;

    return fields.map((field) => {
      const open = parseTimeToHours(field.openTime);
      const close = parseTimeToHours(field.closeTime);
      const dailyHours = Math.max(close - open, 0);
      const availableHours = dailyHours * days;
      const bookedHours = bookedMap.get(field.id) ?? 0;
      const utilization =
        availableHours > 0 ? bookedHours / availableHours : 0;

      return {
        field,
        bookedHours,
        availableHours,
        utilization,
      };
    });
  }

  async services(range: DateRangeDto) {
    const { from, to } = resolveDateRange(range);

    const rows = await this.bookingServiceRepo
      .createQueryBuilder('bs')
      .innerJoin('bs.booking', 'b')
      .innerJoin('bs.service', 's')
      .select('s.id', 'serviceId')
      .addSelect('s.name', 'name')
      .addSelect('s.category', 'category')
      .addSelect('SUM(bs.quantity)', 'quantity')
      .addSelect('COALESCE(SUM(bs.subtotal), 0)', 'revenue')
      .where('b.booking_date >= :from', { from })
      .andWhere('b.booking_date <= :to', { to })
      .andWhere('b.status NOT IN (:...excluded)', {
        excluded: [BookingStatus.CANCELLED, BookingStatus.REJECTED],
      })
      .groupBy('s.id')
      .addGroupBy('s.name')
      .addGroupBy('s.category')
      .orderBy('revenue', 'DESC')
      .getRawMany<{
        serviceId: string;
        name: string;
        category: string;
        quantity: string;
        revenue: string;
      }>();

    return rows.map((r) => ({
      service: {
        id: r.serviceId,
        name: r.name,
        category: r.category,
      },
      quantity: Number(r.quantity),
      revenue: Number(r.revenue),
    }));
  }

  /**
   * High-level KPI card data for the admin dashboard. Aggregates totals over
   * [from, to] in a single response so the FE does not have to compose three
   * separate reports just to fill the four stat cards.
   */
  async summary(range: DateRangeDto) {
    const { from, to } = resolveDateRange(range);

    // Total revenue (same logic as revenue() but without the series)
    const revenueRow = await this.paymentRepo
      .createQueryBuilder('p')
      .where('p.status = :ok', { ok: TxStatus.SUCCESS })
      .andWhere('p.paid_at >= :from', { from: `${from} 00:00:00` })
      .andWhere('p.paid_at <= :to', { to: `${to} 23:59:59` })
      .select(
        `COALESCE(SUM(CASE WHEN p.type = :refund THEN -p.amount ELSE p.amount END), 0)`,
        'total',
      )
      .setParameter('refund', PaymentType.REFUND)
      .getRawOne<{ total: string }>();
    const totalRevenue = Number(revenueRow?.total ?? 0);

    // Total bookings (excluding cancelled / rejected so the KPI reflects "real" activity)
    const totalBookings = await this.bookingRepo
      .createQueryBuilder('b')
      .where('b.booking_date >= :from', { from })
      .andWhere('b.booking_date <= :to', { to })
      .andWhere('b.status NOT IN (:...excl)', {
        excl: [BookingStatus.CANCELLED, BookingStatus.REJECTED],
      })
      .getCount();

    // Distinct customers that made at least one booking in window
    const customersRow = await this.bookingRepo
      .createQueryBuilder('b')
      .where('b.booking_date >= :from', { from })
      .andWhere('b.booking_date <= :to', { to })
      .select('COUNT(DISTINCT b.customer_id)', 'cnt')
      .getRawOne<{ cnt: string }>();
    const totalCustomers = Number(customersRow?.cnt ?? 0);

    const totalFields = await this.fieldRepo.count();

    const averageBookingValue =
      totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

    return {
      totalRevenue,
      totalBookings,
      totalCustomers,
      averageBookingValue,
      totalFields,
      range: { from, to },
    };
  }
}

function parseTimeToHours(time: string): number {
  // Accepts HH:MM or HH:MM:SS
  const [h = '0', m = '0', s = '0'] = time.split(':');
  return Number(h) + Number(m) / 60 + Number(s) / 3600;
}
