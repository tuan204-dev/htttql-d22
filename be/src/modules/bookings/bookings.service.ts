import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import {
  BookingStatus,
  DayType,
  DiscountType,
  FieldStatus,
  PaymentStatus,
  UserRole,
} from '../../common/enums';
import { Field } from '../fields/entities/field.entity';
import { Price } from '../prices/entities/price.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { Service } from '../services/entities/service.entity';
import { AddServicesDto } from './dto/add-services.dto';
import { BookingFilterDto } from './dto/booking-filter.dto';
import {
  CreateBookingDto,
  CreateBookingItemDto,
} from './dto/create-booking.dto';
import { BookingService as BookingServiceEntity } from './entities/booking-service.entity';
import { BookingSlot } from './entities/booking-slot.entity';
import { Booking } from './entities/booking.entity';

interface AuthUserLite {
  id: string;
  role: UserRole;
}

interface SlotRange {
  slotStart: string;
  slotEnd: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const MAX_ADVANCE_BOOKING_DAYS = 14;
const CANCEL_CUTOFF_HOURS = 24;
const DEPOSIT_RATE = 0.3;
const SLOT_MINUTES = 30;

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BookingSlot)
    private readonly slotRepo: Repository<BookingSlot>,
    @InjectRepository(BookingServiceEntity)
    private readonly bsRepo: Repository<BookingServiceEntity>,
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
    @InjectRepository(Promotion)
    private readonly promotionRepo: Repository<Promotion>,
    @InjectRepository(Field)
    private readonly fieldRepo: Repository<Field>,
    @InjectRepository(Price)
    private readonly priceRepo: Repository<Price>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // ============================================================
  // Time / slot helpers
  // ============================================================

  /** Convert 'HH:mm' or 'HH:mm:ss' to minutes since midnight. */
  private timeToMinutes(t: string): number {
    const parts = t.split(':');
    const h = Number(parts[0]);
    const m = Number(parts[1] ?? 0);
    return h * 60 + m;
  }

  private minutesToTime(mins: number): string {
    const h = Math.floor(mins / 60)
      .toString()
      .padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  /** Format Date → 'YYYY-MM-DD' (local time). */
  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  /** Build a list of 30-minute slots between startTime and endTime (exclusive end). */
  generateSlots(start: string, end: string): SlotRange[] {
    const startMin = this.timeToMinutes(start);
    const endMin = this.timeToMinutes(end);
    const result: SlotRange[] = [];
    for (let m = startMin; m < endMin; m += SLOT_MINUTES) {
      result.push({
        slotStart: this.minutesToTime(m),
        slotEnd: this.minutesToTime(m + SLOT_MINUTES),
      });
    }
    return result;
  }

  private dayTypeFor(dateStr: string): DayType {
    // dateStr 'YYYY-MM-DD' — parse as local
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const day = dt.getDay(); // 0=Sun .. 6=Sat
    if (day === 0 || day === 6) return DayType.WEEKEND;
    return DayType.WEEKDAY;
  }

  // ============================================================
  // Pricing helpers
  // ============================================================

  /**
   * Compute the field price for a (date, [start,end)) range.
   * Walks each 30-minute slot and looks up the matching Price row
   * (matching fieldId + dayType + slot inside [price.startTime, price.endTime)).
   *
   * Falls back to HOLIDAY then WEEKDAY/WEEKEND if HOLIDAY not defined.
   * Throws BadRequestException if no Price covers a slot.
   */
  async calculateFieldPriceForRange(
    fieldId: string,
    date: string,
    startTime: string,
    endTime: string,
    manager?: EntityManager,
  ): Promise<number> {
    const repo = manager ? manager.getRepository(Price) : this.priceRepo;
    const dayType = this.dayTypeFor(date);

    const prices = await repo.find({
      where: { fieldId, dayType, isActive: true },
    });

    if (prices.length === 0) {
      throw new BadRequestException(
        `No active price configuration for field on ${dayType}`,
      );
    }

    const slots = this.generateSlots(startTime, endTime);
    let total = 0;

    for (const slot of slots) {
      const slotStartMin = this.timeToMinutes(slot.slotStart);
      const slotEndMin = this.timeToMinutes(slot.slotEnd);

      const match = prices.find((p) => {
        const pStart = this.timeToMinutes(p.startTime);
        const pEnd = this.timeToMinutes(p.endTime);
        // slot [slotStart, slotEnd) fully inside [pStart, pEnd)
        return slotStartMin >= pStart && slotEndMin <= pEnd;
      });

      if (!match) {
        throw new BadRequestException(
          `No price defined for slot ${slot.slotStart}-${slot.slotEnd}`,
        );
      }

      // pricePerHour * (slotMinutes/60)
      total += (Number(match.pricePerHour) * SLOT_MINUTES) / 60;
    }

    return Math.round(total);
  }

  /**
   * Apply a (validated) promotion to a target amount.
   * Caps the discount at the amount.
   */
  applyPromotion(promo: Promotion, amount: number): number {
    const value = Number(promo.discountValue);
    let discount = 0;
    if (promo.discountType === DiscountType.PERCENT) {
      discount = (amount * value) / 100;
    } else {
      discount = value;
    }
    if (discount < 0) discount = 0;
    if (discount > amount) discount = amount;
    return Math.round(discount);
  }

  // ============================================================
  // Booking code
  // ============================================================

  private async generateBookingCode(
    bookingDate: string,
    manager: EntityManager,
  ): Promise<string> {
    const compact = bookingDate.replace(/-/g, '');
    const count = await manager.getRepository(Booking).count({
      where: { bookingDate },
    });
    const seq = (count + 1).toString().padStart(3, '0');
    return `BK${compact}${seq}`;
  }

  // ============================================================
  // CREATE
  // ============================================================

  async create(customerId: string, dto: CreateBookingDto): Promise<Booking> {
    // ---- Date / time validation ----
    const todayStr = this.formatDate(new Date());
    if (dto.bookingDate < todayStr) {
      throw new BadRequestException('bookingDate cannot be in the past');
    }
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + MAX_ADVANCE_BOOKING_DAYS);
    if (dto.bookingDate > this.formatDate(maxDate)) {
      throw new BadRequestException(
        `bookingDate cannot be more than ${MAX_ADVANCE_BOOKING_DAYS} days in advance`,
      );
    }

    const startMin = this.timeToMinutes(dto.startTime);
    const endMin = this.timeToMinutes(dto.endTime);
    if (startMin >= endMin) {
      throw new BadRequestException('startTime must be before endTime');
    }
    if (startMin % SLOT_MINUTES !== 0 || endMin % SLOT_MINUTES !== 0) {
      throw new BadRequestException(
        'startTime and endTime must be multiples of 30 minutes',
      );
    }

    // If booking today, startTime must be in the future
    if (dto.bookingDate === todayStr) {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      if (startMin <= nowMin) {
        throw new BadRequestException('startTime must be in the future');
      }
    }

    // ---- Field validation ----
    const field = await this.fieldRepo.findOne({ where: { id: dto.fieldId } });
    if (!field) {
      throw new NotFoundException('Field not found');
    }
    if (field.status !== FieldStatus.AVAILABLE) {
      throw new BadRequestException('Field is not available for booking');
    }

    // Operating hours
    const openMin = this.timeToMinutes(field.openTime);
    const closeMin = this.timeToMinutes(field.closeTime);
    if (startMin < openMin || endMin > closeMin) {
      throw new BadRequestException(
        `Booking time must be within field hours ${field.openTime}-${field.closeTime}`,
      );
    }

    // ---- Slot list ----
    const slots = this.generateSlots(dto.startTime, dto.endTime);
    if (slots.length === 0) {
      throw new BadRequestException('Booking must cover at least one 30-min slot');
    }

    // ---- Service lookup (outside tx — for early validation) ----
    let serviceMap = new Map<string, Service>();
    if (dto.services && dto.services.length > 0) {
      // de-dup serviceIds (sum quantities later)
      const ids = Array.from(new Set(dto.services.map((s) => s.serviceId)));
      const services = await this.serviceRepo.findByIds(ids);
      if (services.length !== ids.length) {
        throw new BadRequestException('One or more services not found');
      }
      for (const s of services) {
        if (!s.isActive) {
          throw new BadRequestException(`Service ${s.name} is inactive`);
        }
        serviceMap.set(s.id, s);
      }
    }

    // ---- Promotion lookup (outside tx) ----
    let promo: Promotion | null = null;
    if (dto.promotionCode) {
      promo = await this.promotionRepo.findOne({
        where: { code: dto.promotionCode.trim() },
      });
      if (!promo) {
        throw new BadRequestException('Promotion code not found');
      }
      if (!promo.isActive) {
        throw new BadRequestException('Promotion is inactive');
      }
      const today = this.formatDate(new Date());
      if (promo.startDate > today || promo.endDate < today) {
        throw new BadRequestException('Promotion is not active for today');
      }
      if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
        throw new BadRequestException('Promotion usage limit reached');
      }
    }

    // ============================================================
    // Transaction: insert slots first (UNIQUE conflict → 409),
    // then compute prices, insert booking, link, etc.
    // ============================================================
    try {
      return await this.dataSource.transaction(async (manager) => {
        // 1. Field price (read prices inside tx)
        const fieldPrice = await this.calculateFieldPriceForRange(
          dto.fieldId,
          dto.bookingDate,
          dto.startTime,
          dto.endTime,
          manager,
        );

        // 2. Service price (snapshot from current Service.unitPrice)
        let servicePrice = 0;
        const bsRows: Array<{
          serviceId: string;
          quantity: number;
          unitPrice: number;
          subtotal: number;
        }> = [];

        if (dto.services && dto.services.length > 0) {
          // aggregate duplicates
          const agg = new Map<string, number>();
          for (const item of dto.services) {
            agg.set(
              item.serviceId,
              (agg.get(item.serviceId) ?? 0) + item.quantity,
            );
          }
          for (const [sid, qty] of agg) {
            const svc = serviceMap.get(sid)!;
            const unit = Number(svc.unitPrice);
            const subtotal = unit * qty;
            servicePrice += subtotal;
            bsRows.push({
              serviceId: sid,
              quantity: qty,
              unitPrice: unit,
              subtotal,
            });
          }
        }
        servicePrice = Math.round(servicePrice);

        // 3. Discount
        let discountAmount = 0;
        if (promo) {
          const gross = fieldPrice + servicePrice;
          const minOrder = Number(promo.minOrder);
          if (minOrder > 0 && gross < minOrder) {
            throw new BadRequestException(
              `Order amount must be at least ${minOrder} to use this promotion`,
            );
          }
          discountAmount = this.applyPromotion(promo, gross);
        }

        const totalPrice = fieldPrice + servicePrice - discountAmount;
        const depositAmount = Math.round(totalPrice * DEPOSIT_RATE);
        const totalHours = (endMin - startMin) / 60;

        // 4. Booking code
        const bookingCode = await this.generateBookingCode(
          dto.bookingDate,
          manager,
        );

        // 5. Insert Booking
        const bookingRepo = manager.getRepository(Booking);
        const booking = bookingRepo.create({
          bookingCode,
          customerId,
          fieldId: dto.fieldId,
          bookingDate: dto.bookingDate,
          startTime: dto.startTime,
          endTime: dto.endTime,
          totalHours: totalHours.toFixed(2),
          fieldPrice: fieldPrice.toFixed(2),
          servicePrice: servicePrice.toFixed(2),
          discountAmount: discountAmount.toFixed(2),
          totalPrice: totalPrice.toFixed(2),
          depositAmount: depositAmount.toFixed(2),
          status: BookingStatus.PENDING_PAYMENT,
          paymentStatus: PaymentStatus.UNPAID,
          promotionId: promo?.id ?? null,
          note: dto.note ?? null,
        });
        const savedBooking = await bookingRepo.save(booking);

        // 6. Insert BookingSlots — UNIQUE (field_id, slot_date, slot_start)
        //    Any collision → QueryFailedError code 23505 → caught below.
        const slotRepoTx = manager.getRepository(BookingSlot);
        const slotEntities = slots.map((s) =>
          slotRepoTx.create({
            bookingId: savedBooking.id,
            fieldId: dto.fieldId,
            slotDate: dto.bookingDate,
            slotStart: s.slotStart,
            slotEnd: s.slotEnd,
          }),
        );
        await slotRepoTx.save(slotEntities);

        // 7. Insert BookingService rows
        if (bsRows.length > 0) {
          const bsRepoTx = manager.getRepository(BookingServiceEntity);
          const entities = bsRows.map((r) =>
            bsRepoTx.create({
              bookingId: savedBooking.id,
              serviceId: r.serviceId,
              quantity: r.quantity,
              unitPrice: r.unitPrice.toFixed(2),
              subtotal: r.subtotal.toFixed(2),
            }),
          );
          await bsRepoTx.save(entities);
        }

        // 8. Increment promotion usedCount
        if (promo) {
          await manager
            .getRepository(Promotion)
            .increment({ id: promo.id }, 'usedCount', 1);
        }

        // 9. Reload with relations
        const full = await bookingRepo.findOne({
          where: { id: savedBooking.id },
          relations: ['field', 'customer', 'slots', 'bookingServices', 'promotion'],
        });
        return full!;
      });
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException(
          'Khung giờ vừa bị người khác đặt, vui lòng chọn lại',
        );
      }
      throw err;
    }
  }

  private isUniqueViolation(err: unknown): boolean {
    if (err instanceof QueryFailedError) {
      const driverError = (err as QueryFailedError & {
        driverError?: { code?: string };
        code?: string;
      });
      const code = driverError.driverError?.code ?? driverError.code;
      return code === '23505';
    }
    return false;
  }

  // ============================================================
  // READ
  // ============================================================

  async findAll(
    filter: BookingFilterDto,
    currentUser: AuthUserLite,
  ): Promise<PaginatedResult<Booking>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;

    const qb = this.bookingRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.field', 'field')
      .leftJoinAndSelect('b.customer', 'customer')
      .leftJoinAndSelect('b.promotion', 'promotion');

    if (currentUser.role === UserRole.CUSTOMER) {
      qb.andWhere('b.customer_id = :uid', { uid: currentUser.id });
    } else if (filter.customerId) {
      qb.andWhere('b.customer_id = :cid', { cid: filter.customerId });
    }

    if (filter.status) {
      qb.andWhere('b.status = :status', { status: filter.status });
    }
    if (filter.fieldId) {
      qb.andWhere('b.field_id = :fid', { fid: filter.fieldId });
    }
    if (filter.fromDate) {
      qb.andWhere('b.booking_date >= :from', { from: filter.fromDate });
    }
    if (filter.toDate) {
      qb.andWhere('b.booking_date <= :to', { to: filter.toDate });
    }

    qb.orderBy('b.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findById(id: string, currentUser: AuthUserLite): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({
      where: { id },
      relations: [
        'field',
        'customer',
        'slots',
        'bookingServices',
        'bookingServices.service',
        'promotion',
        'payments',
      ],
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (
      currentUser.role === UserRole.CUSTOMER &&
      booking.customerId !== currentUser.id
    ) {
      throw new ForbiddenException('You can only view your own bookings');
    }
    return booking;
  }

  // ============================================================
  // STATE TRANSITIONS
  // ============================================================

  async confirm(id: string, staffId: string): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    if (
      booking.status !== BookingStatus.PENDING_PAYMENT &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        `Cannot confirm booking with status ${booking.status}`,
      );
    }

    // Allow confirm if paid OR if staff manually confirms (deposit paid)
    booking.status = BookingStatus.CONFIRMED;
    booking.confirmedBy = staffId;
    return this.bookingRepo.save(booking);
  }

  async reject(
    id: string,
    staffId: string,
    reason: string,
  ): Promise<Booking> {
    return this.dataSource.transaction(async (manager) => {
      const bookingRepo = manager.getRepository(Booking);
      const booking = await bookingRepo.findOne({ where: { id } });
      if (!booking) throw new NotFoundException('Booking not found');

      if (
        booking.status === BookingStatus.COMPLETED ||
        booking.status === BookingStatus.CANCELLED ||
        booking.status === BookingStatus.REJECTED
      ) {
        throw new BadRequestException(
          `Cannot reject booking with status ${booking.status}`,
        );
      }

      booking.status = BookingStatus.REJECTED;
      booking.confirmedBy = staffId;
      booking.note = booking.note
        ? `${booking.note}\n[REJECTED] ${reason}`
        : `[REJECTED] ${reason}`;
      const saved = await bookingRepo.save(booking);

      // Free slots
      await manager.getRepository(BookingSlot).delete({ bookingId: id });

      // Decrement promotion usedCount if any
      if (saved.promotionId) {
        await manager
          .getRepository(Promotion)
          .decrement({ id: saved.promotionId }, 'usedCount', 1);
      }

      return saved;
    });
  }

  async cancel(id: string, customerId: string): Promise<Booking> {
    return this.dataSource.transaction(async (manager) => {
      const bookingRepo = manager.getRepository(Booking);
      const booking = await bookingRepo.findOne({ where: { id } });
      if (!booking) throw new NotFoundException('Booking not found');

      if (booking.customerId !== customerId) {
        throw new ForbiddenException('You can only cancel your own bookings');
      }

      if (
        booking.status !== BookingStatus.PENDING_PAYMENT &&
        booking.status !== BookingStatus.CONFIRMED
      ) {
        throw new BadRequestException(
          `Cannot cancel booking with status ${booking.status}`,
        );
      }

      // Time check: bookingDate + startTime - now must be > CANCEL_CUTOFF_HOURS
      const [y, m, d] = booking.bookingDate.split('-').map(Number);
      const [hh, mm] = booking.startTime.split(':').map(Number);
      const bookingDateTime = new Date(y, m - 1, d, hh, mm);
      const diffMs = bookingDateTime.getTime() - Date.now();
      const diffH = diffMs / (1000 * 60 * 60);
      if (diffH < CANCEL_CUTOFF_HOURS) {
        throw new BadRequestException(
          `Cannot cancel within ${CANCEL_CUTOFF_HOURS} hours of the booking time`,
        );
      }

      booking.status = BookingStatus.CANCELLED;
      const saved = await bookingRepo.save(booking);

      await manager.getRepository(BookingSlot).delete({ bookingId: id });

      if (saved.promotionId) {
        await manager
          .getRepository(Promotion)
          .decrement({ id: saved.promotionId }, 'usedCount', 1);
      }

      return saved;
    });
  }

  async checkIn(id: string): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        `Cannot check in booking with status ${booking.status}`,
      );
    }
    booking.status = BookingStatus.CHECKED_IN;
    return this.bookingRepo.save(booking);
  }

  async complete(id: string): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status !== BookingStatus.CHECKED_IN) {
      throw new BadRequestException(
        `Cannot complete booking with status ${booking.status}`,
      );
    }
    booking.status = BookingStatus.COMPLETED;
    return this.bookingRepo.save(booking);
  }

  // ============================================================
  // ADD SERVICES (post-booking)
  // ============================================================

  async addServices(
    id: string,
    dto: AddServicesDto,
    currentUser: AuthUserLite,
  ): Promise<Booking> {
    return this.dataSource.transaction(async (manager) => {
      const bookingRepo = manager.getRepository(Booking);
      const booking = await bookingRepo.findOne({ where: { id } });
      if (!booking) throw new NotFoundException('Booking not found');

      if (
        currentUser.role === UserRole.CUSTOMER &&
        booking.customerId !== currentUser.id
      ) {
        throw new ForbiddenException(
          'You can only add services to your own bookings',
        );
      }

      if (
        booking.status === BookingStatus.COMPLETED ||
        booking.status === BookingStatus.CANCELLED ||
        booking.status === BookingStatus.REJECTED
      ) {
        throw new BadRequestException(
          `Cannot add services to booking with status ${booking.status}`,
        );
      }

      // aggregate
      const agg = new Map<string, number>();
      for (const it of dto.items) {
        agg.set(it.serviceId, (agg.get(it.serviceId) ?? 0) + it.quantity);
      }
      const ids = Array.from(agg.keys());
      const services = await manager.getRepository(Service).findByIds(ids);
      if (services.length !== ids.length) {
        throw new BadRequestException('One or more services not found');
      }
      const svcMap = new Map(services.map((s) => [s.id, s]));
      for (const s of services) {
        if (!s.isActive) {
          throw new BadRequestException(`Service ${s.name} is inactive`);
        }
      }

      const bsRepoTx = manager.getRepository(BookingServiceEntity);
      for (const [sid, qty] of agg) {
        const svc = svcMap.get(sid)!;
        const unit = Number(svc.unitPrice);

        // Merge with existing row if any (same serviceId)
        const existing = await bsRepoTx.findOne({
          where: { bookingId: id, serviceId: sid },
        });
        if (existing) {
          const newQty = existing.quantity + qty;
          const newSubtotal = unit * newQty;
          existing.quantity = newQty;
          existing.unitPrice = unit.toFixed(2);
          existing.subtotal = newSubtotal.toFixed(2);
          await bsRepoTx.save(existing);
        } else {
          const entity = bsRepoTx.create({
            bookingId: id,
            serviceId: sid,
            quantity: qty,
            unitPrice: unit.toFixed(2),
            subtotal: (unit * qty).toFixed(2),
          });
          await bsRepoTx.save(entity);
        }
      }

      // Recompute service price total from rows
      const allRows = await bsRepoTx.find({ where: { bookingId: id } });
      const newServicePrice = allRows.reduce(
        (acc, r) => acc + Number(r.subtotal),
        0,
      );

      const fieldPrice = Number(booking.fieldPrice);
      const discount = Number(booking.discountAmount);
      const newTotal = fieldPrice + newServicePrice - discount;
      const newDeposit = Math.round(newTotal * DEPOSIT_RATE);

      booking.servicePrice = newServicePrice.toFixed(2);
      booking.totalPrice = newTotal.toFixed(2);
      booking.depositAmount = newDeposit.toFixed(2);
      await bookingRepo.save(booking);

      const full = await bookingRepo.findOne({
        where: { id },
        relations: [
          'field',
          'customer',
          'slots',
          'bookingServices',
          'bookingServices.service',
          'promotion',
        ],
      });
      return full!;
    });
  }

  // ============================================================
  // Misc helpers exposed for tests / other services
  // ============================================================

  /**
   * Returns occupied 30-min slots for a field on a given date,
   * excluding cancelled/rejected bookings (they're removed from booking_slots
   * via cancel/reject), so this is just a direct lookup.
   */
  async getOccupiedSlots(
    fieldId: string,
    date: string,
  ): Promise<BookingSlot[]> {
    return this.slotRepo.find({
      where: { fieldId, slotDate: date },
      order: { slotStart: 'ASC' },
    });
  }
}
