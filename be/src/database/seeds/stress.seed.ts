/**
 * Stress seed — adds a large volume of historical bookings to make the
 * admin reports dashboard (`/admin/reports`) feel realistic.
 *
 *   - ~150 COMPLETED bookings spread across (today-90d .. today-1d)
 *   - 20  CANCELLED bookings within the same window
 *   - 10  REJECTED bookings within the same window
 *   - 15  PENDING_PAYMENT bookings in the near future (today .. today+10d)
 *
 * Idempotent: if there are already >= 80 COMPLETED bookings in the table
 * the script logs "skip" and returns. Run repeatedly is safe-ish.
 *
 * Usage:  npm run seed:stress
 */
import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { join } from 'path';

import {
  BookingStatus,
  FieldType,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  TxStatus,
  UserRole,
} from '../../common/enums';
import { User } from '../../modules/users/entities/user.entity';
import { Field } from '../../modules/fields/entities/field.entity';
import { Service } from '../../modules/services/entities/service.entity';
import { Booking } from '../../modules/bookings/entities/booking.entity';
import { BookingSlot } from '../../modules/bookings/entities/booking-slot.entity';
import { BookingService } from '../../modules/bookings/entities/booking-service.entity';
import { Payment } from '../../modules/payments/entities/payment.entity';
import { Review } from '../../modules/reviews/entities/review.entity';

config();

const DS = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'soccer_db',
  synchronize: false,
  logging: false,
  entities: [join(__dirname, '/../../**/*.entity{.ts,.js}')],
});

const pad = (n: number, w = 2) => n.toString().padStart(w, '0');
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayOfWeek = (d: Date) => d.getDay();
const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[randInt(0, arr.length - 1)];

interface SlotRange {
  startTime: string;
  endTime: string;
}

function generateSlots(date: Date, range: SlotRange) {
  const [sh, sm] = range.startTime.split(':').map(Number);
  const [eh, em] = range.endTime.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const slots: { slotDate: string; slotStart: string; slotEnd: string }[] = [];
  for (let m = startMin; m < endMin; m += 30) {
    const startStr = `${pad(Math.floor(m / 60))}:${pad(m % 60)}:00`;
    const endStr = `${pad(Math.floor((m + 30) / 60))}:${pad((m + 30) % 60)}:00`;
    slots.push({
      slotDate: isoDate(date),
      slotStart: startStr,
      slotEnd: endStr,
    });
  }
  return slots;
}

function computeFieldPrice(
  fieldType: FieldType,
  date: Date,
  startTime: string,
  endTime: string,
): number {
  const isWeekend = dayOfWeek(date) === 0 || dayOfWeek(date) === 6;
  const [sh] = startTime.split(':').map(Number);
  const [eh] = endTime.split(':').map(Number);
  const baseFiveOffset =
    fieldType === FieldType.FIVE
      ? 0
      : fieldType === FieldType.SEVEN
        ? 50000
        : 100000;

  let total = 0;
  for (let h = sh; h < eh; h += 0.5) {
    let baseFive: number;
    if (isWeekend) baseFive = 350000;
    else if (h >= 17) baseFive = 300000;
    else baseFive = 200000;
    total += (baseFive + baseFiveOffset) / 2;
  }
  return Math.round(total);
}

function bookingCode(date: Date, seq: number): string {
  return `BK${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(seq, 3)}${pad(randInt(0, 999), 3)}`;
}

const HOUR_BLOCKS = [
  { startTime: '07:00:00', endTime: '08:30:00' },
  { startTime: '09:00:00', endTime: '10:30:00' },
  { startTime: '15:30:00', endTime: '17:00:00' },
  { startTime: '17:30:00', endTime: '19:00:00' },
  { startTime: '19:30:00', endTime: '21:00:00' },
  { startTime: '21:30:00', endTime: '23:00:00' },
];

const REVIEW_COMMENTS = [
  'Sân đẹp, mặt cỏ tốt, đèn sáng. Sẽ quay lại!',
  'Nhân viên thân thiện, giá hợp lý.',
  'Sân khá ổn nhưng phòng thay đồ hơi chật.',
  'Đặt sân dễ, thanh toán nhanh.',
  'Cỏ hơi mềm, nhưng tổng thể tốt.',
  'Trải nghiệm tuyệt vời, đội mình sẽ thuê cố định mỗi tuần.',
  'Sân sạch, có đầy đủ dịch vụ nước uống.',
  'Phục vụ chuyên nghiệp, đáng đồng tiền.',
  'Vị trí thuận tiện, dễ tìm.',
  'Bãi giữ xe rộng rãi, an ninh tốt.',
];

interface BookingPlan {
  status: BookingStatus;
  date: Date;
  withServices: boolean;
  withReview: boolean;
  depositSplit: boolean; // true = 30/70 DEPOSIT+FULL, false = single FULL
}

async function run(): Promise<void> {
  console.log('[stress-seed] connecting…');
  await DS.initialize();

  const userRepo = DS.getRepository(User);
  const fieldRepo = DS.getRepository(Field);
  const serviceRepo = DS.getRepository(Service);
  const bookingRepo = DS.getRepository(Booking);
  const slotRepo = DS.getRepository(BookingSlot);
  const bsRepo = DS.getRepository(BookingService);
  const payRepo = DS.getRepository(Payment);
  const reviewRepo = DS.getRepository(Review);

  // Idempotency check — by count of COMPLETED bookings
  const completedExisting = await bookingRepo.count({
    where: { status: BookingStatus.COMPLETED },
  });
  if (completedExisting >= 80) {
    console.log(
      `[stress-seed] already ${completedExisting} COMPLETED bookings → skip.`,
    );
    await DS.destroy();
    return;
  }

  const allCustomers = await userRepo.find({
    where: { role: UserRole.CUSTOMER },
  });
  const allStaff = await userRepo.find({ where: { role: UserRole.STAFF } });
  const fieldsList = await fieldRepo.find();
  const allServices = await serviceRepo.find();

  if (!allCustomers.length || !allStaff.length || !fieldsList.length) {
    console.error(
      '[stress-seed] missing prerequisites (customers/staff/fields). Run seed + seed:demo first.',
    );
    await DS.destroy();
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ---------- Build plan list ----------
  const plans: BookingPlan[] = [];

  // 150 COMPLETED in [-90 .. -1]
  let completedTarget = 150;
  // Build day-by-day from (today-90) to (today-1)
  for (let offset = -90; offset <= -1 && completedTarget > 0; offset += 1) {
    const perDay = Math.min(randInt(2, 5), completedTarget);
    for (let i = 0; i < perDay; i += 1) {
      const d = new Date(today);
      d.setDate(d.getDate() + offset);
      plans.push({
        status: BookingStatus.COMPLETED,
        date: d,
        withServices: Math.random() < 0.7,
        withReview: Math.random() < 0.4,
        depositSplit: true,
      });
      completedTarget -= 1;
      if (completedTarget <= 0) break;
    }
  }

  // 20 CANCELLED scattered in [-90 .. -1]
  for (let i = 0; i < 20; i += 1) {
    const d = new Date(today);
    d.setDate(d.getDate() + randInt(-90, -1));
    plans.push({
      status: BookingStatus.CANCELLED,
      date: d,
      withServices: false,
      withReview: false,
      depositSplit: false,
    });
  }

  // 10 REJECTED scattered in [-90 .. -1]
  for (let i = 0; i < 10; i += 1) {
    const d = new Date(today);
    d.setDate(d.getDate() + randInt(-90, -1));
    plans.push({
      status: BookingStatus.REJECTED,
      date: d,
      withServices: false,
      withReview: false,
      depositSplit: false,
    });
  }

  // 15 PENDING_PAYMENT in [today .. today+10]
  for (let i = 0; i < 15; i += 1) {
    const d = new Date(today);
    d.setDate(d.getDate() + randInt(0, 10));
    plans.push({
      status: BookingStatus.PENDING_PAYMENT,
      date: d,
      withServices: false,
      withReview: false,
      depositSplit: false,
    });
  }

  // Shuffle plans to spread inserts naturally
  plans.sort(() => Math.random() - 0.5);

  // ---------- Pre-load existing slot occupancy so we don't collide ----------
  const occupied = new Set<string>();
  const existingSlots = await slotRepo
    .createQueryBuilder('s')
    .select(['s.fieldId', 's.slotDate', 's.slotStart'])
    .getMany();
  for (const s of existingSlots) {
    occupied.add(`${s.fieldId}:${s.slotDate}:${s.slotStart}`);
  }

  let bookingSeq = 0;
  const counts = {
    completed: 0,
    cancelled: 0,
    rejected: 0,
    pending: 0,
    skipped: 0,
    reviews: 0,
  };

  for (const plan of plans) {
    // Try up to 20 random (field, block) combos to find a free slot range
    let chosenField: Field | null = null;
    let chosenBlock: { startTime: string; endTime: string } | null = null;

    const needsSlot =
      plan.status !== BookingStatus.CANCELLED &&
      plan.status !== BookingStatus.REJECTED;

    if (needsSlot) {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const f = pick(fieldsList);
        const b = pick(HOUR_BLOCKS);
        const slots = generateSlots(plan.date, b);
        const conflict = slots.some((s) =>
          occupied.has(`${f.id}:${s.slotDate}:${s.slotStart}`),
        );
        if (!conflict) {
          chosenField = f;
          chosenBlock = b;
          break;
        }
      }
      if (!chosenField || !chosenBlock) {
        counts.skipped += 1;
        continue;
      }
    } else {
      // CANCELLED/REJECTED don't insert slots — just pick a field/block for pricing
      chosenField = pick(fieldsList);
      chosenBlock = pick(HOUR_BLOCKS);
    }

    const slots = generateSlots(plan.date, chosenBlock);
    if (needsSlot) {
      slots.forEach((s) =>
        occupied.add(`${chosenField!.id}:${s.slotDate}:${s.slotStart}`),
      );
    }

    const fieldPrice = computeFieldPrice(
      chosenField.type,
      plan.date,
      chosenBlock.startTime,
      chosenBlock.endTime,
    );

    // Services
    const svcItems: { service: Service; quantity: number }[] = [];
    if (plan.withServices && allServices.length) {
      const count = randInt(1, 3);
      const shuffled = [...allServices].sort(() => Math.random() - 0.5);
      for (let i = 0; i < count && i < shuffled.length; i += 1) {
        svcItems.push({ service: shuffled[i], quantity: randInt(1, 4) });
      }
    }
    const servicePrice = svcItems.reduce(
      (s, it) => s + Number(it.service.unitPrice) * it.quantity,
      0,
    );

    const totalPrice = fieldPrice + servicePrice;
    const depositAmount = Math.round(totalPrice * 0.3);

    bookingSeq += 1;
    const customer = pick(allCustomers);
    const totalHours =
      (Number(chosenBlock.endTime.slice(0, 2)) * 60 +
        Number(chosenBlock.endTime.slice(3, 5)) -
        (Number(chosenBlock.startTime.slice(0, 2)) * 60 +
          Number(chosenBlock.startTime.slice(3, 5)))) /
      60;

    let paymentStatus: PaymentStatus;
    if (plan.status === BookingStatus.COMPLETED) {
      paymentStatus = PaymentStatus.FULLY_PAID;
    } else {
      paymentStatus = PaymentStatus.UNPAID;
    }

    const confirmedBy =
      plan.status === BookingStatus.COMPLETED ||
      plan.status === BookingStatus.CONFIRMED
        ? pick(allStaff).id
        : null;

    const note =
      plan.status === BookingStatus.REJECTED
        ? 'Khách không xác nhận trong thời gian quy định'
        : plan.status === BookingStatus.CANCELLED
          ? 'Khách huỷ trước giờ thi đấu'
          : null;

    const booking = bookingRepo.create({
      bookingCode: bookingCode(plan.date, bookingSeq),
      customerId: customer.id,
      fieldId: chosenField.id,
      bookingDate: isoDate(plan.date),
      startTime: chosenBlock.startTime,
      endTime: chosenBlock.endTime,
      totalHours: totalHours.toFixed(2),
      fieldPrice: fieldPrice.toString(),
      servicePrice: servicePrice.toString(),
      discountAmount: '0',
      totalPrice: totalPrice.toString(),
      depositAmount: depositAmount.toString(),
      status: plan.status,
      paymentStatus,
      note,
      confirmedBy,
    });
    const savedBooking = await bookingRepo.save(booking);

    // Insert slots only for non-cancelled/rejected
    if (needsSlot) {
      await slotRepo.save(
        slots.map((s) =>
          slotRepo.create({
            bookingId: savedBooking.id,
            fieldId: chosenField!.id,
            slotDate: s.slotDate,
            slotStart: s.slotStart,
            slotEnd: s.slotEnd,
          }),
        ),
      );
    }

    // Booking services
    if (svcItems.length) {
      await bsRepo.save(
        svcItems.map((it) =>
          bsRepo.create({
            bookingId: savedBooking.id,
            serviceId: it.service.id,
            quantity: it.quantity,
            unitPrice: it.service.unitPrice,
            subtotal: (Number(it.service.unitPrice) * it.quantity).toString(),
          }),
        ),
      );
    }

    // Payments — only for COMPLETED
    if (plan.status === BookingStatus.COMPLETED) {
      const paidAtDate = new Date(plan.date);
      paidAtDate.setHours(randInt(18, 22), randInt(0, 59), 0, 0);
      await payRepo.save([
        payRepo.create({
          bookingId: savedBooking.id,
          amount: depositAmount.toString(),
          method: pick([
            PaymentMethod.VNPAY,
            PaymentMethod.MOMO,
            PaymentMethod.BANK_TRANSFER,
          ]),
          type: PaymentType.DEPOSIT,
          status: TxStatus.SUCCESS,
          paidAt: paidAtDate,
        }),
        payRepo.create({
          bookingId: savedBooking.id,
          amount: (totalPrice - depositAmount).toString(),
          method: pick([PaymentMethod.CASH, PaymentMethod.BANK_TRANSFER]),
          type: PaymentType.FULL_PAYMENT,
          status: TxStatus.SUCCESS,
          paidAt: paidAtDate,
          receivedBy: pick(allStaff).id,
        }),
      ]);
    }

    // Review — only for COMPLETED with withReview flag
    if (plan.status === BookingStatus.COMPLETED && plan.withReview) {
      await reviewRepo.save(
        reviewRepo.create({
          customerId: savedBooking.customerId,
          fieldId: savedBooking.fieldId,
          bookingId: savedBooking.id,
          rating: randInt(3, 5),
          comment: pick(REVIEW_COMMENTS),
        }),
      );
      counts.reviews += 1;
    }

    // Update counters
    switch (plan.status) {
      case BookingStatus.COMPLETED:
        counts.completed += 1;
        break;
      case BookingStatus.CANCELLED:
        counts.cancelled += 1;
        break;
      case BookingStatus.REJECTED:
        counts.rejected += 1;
        break;
      case BookingStatus.PENDING_PAYMENT:
        counts.pending += 1;
        break;
    }
  }

  console.log('[stress-seed] inserted:', counts);

  await DS.destroy();
  console.log('[stress-seed] DONE.');
}

run().catch(async (err) => {
  console.error('[stress-seed] ERROR:', err);
  if (DS.isInitialized) await DS.destroy();
  process.exit(1);
});
