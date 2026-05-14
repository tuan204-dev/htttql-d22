/**
 * Demo seed — adds rich showcase data on top of `initial.seed.ts`.
 *
 *   - Extra users: 8 Vietnamese customers + 2 more staff
 *   - Extra fields: 4 more (C1/C2/D1/D2) with placeholder images
 *   - Extra promotions: 3 more
 *   - ~40 bookings spread across [-30d .. +7d] in various statuses,
 *     each with realistic price, slots, optional services and payments.
 *   - 8 reviews on completed bookings.
 *
 * Idempotent: checks for marker user `nguyen.van.an@demo.local` and
 * skips if found. Run repeatedly is safe.
 *
 * Usage:  npm run seed:demo
 */
import 'reflect-metadata';
import { config } from 'dotenv';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { join } from 'path';

import {
  BookingStatus,
  DayType,
  DiscountType,
  FieldStatus,
  FieldSurface,
  FieldType,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  ServiceCategory,
  TxStatus,
  UserRole,
} from '../../common/enums';
import { User } from '../../modules/users/entities/user.entity';
import { Field } from '../../modules/fields/entities/field.entity';
import { FieldImage } from '../../modules/fields/entities/field-image.entity';
import { Price } from '../../modules/prices/entities/price.entity';
import { Service } from '../../modules/services/entities/service.entity';
import { Promotion } from '../../modules/promotions/entities/promotion.entity';
import { Booking } from '../../modules/bookings/entities/booking.entity';
import { BookingSlot } from '../../modules/bookings/entities/booking-slot.entity';
import { BookingService } from '../../modules/bookings/entities/booking-service.entity';
import { Payment } from '../../modules/payments/entities/payment.entity';
import { Review } from '../../modules/reviews/entities/review.entity';

config();

// 12 verified Pexels URLs (HEAD-checked HTTP 200, kept in sync with
// `scripts/update-field-images.ts`). 2 URLs that 404'd in the original
// curation (47356, 9810) were swapped for 114296 and 270085.
const REAL_FIELD_IMAGES = [
  'https://images.pexels.com/photos/47730/the-ball-stadion-football-the-pitch-47730.jpeg',
  'https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg',
  'https://images.pexels.com/photos/186076/pexels-photo-186076.jpeg',
  'https://images.pexels.com/photos/274506/pexels-photo-274506.jpeg',
  'https://images.pexels.com/photos/114296/pexels-photo-114296.jpeg',
  'https://images.pexels.com/photos/2570139/pexels-photo-2570139.jpeg',
  'https://images.pexels.com/photos/3651597/pexels-photo-3651597.jpeg',
  'https://images.pexels.com/photos/1311518/pexels-photo-1311518.jpeg',
  'https://images.pexels.com/photos/3041176/pexels-photo-3041176.jpeg',
  'https://images.pexels.com/photos/3621104/pexels-photo-3621104.jpeg',
  'https://images.pexels.com/photos/186230/pexels-photo-186230.jpeg',
  'https://images.pexels.com/photos/270085/pexels-photo-270085.jpeg',
];

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

const hash = (s: string) => bcrypt.hash(s, 10);
const pad = (n: number, w = 2) => n.toString().padStart(w, '0');
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayOfWeek = (d: Date) => d.getDay(); // 0=Sun, 6=Sat
const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[randInt(0, arr.length - 1)];

interface SlotRange {
  startTime: string; // 'HH:MM:SS'
  endTime: string;
}

function generateSlots(date: Date, range: SlotRange) {
  // Returns Array<{slotDate, slotStart, slotEnd}> in 30-min increments.
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

async function run(): Promise<void> {
  console.log('[demo-seed] connecting…');
  await DS.initialize();

  const userRepo = DS.getRepository(User);
  const fieldRepo = DS.getRepository(Field);
  const fieldImgRepo = DS.getRepository(FieldImage);
  const priceRepo = DS.getRepository(Price);
  const serviceRepo = DS.getRepository(Service);
  const promoRepo = DS.getRepository(Promotion);
  const bookingRepo = DS.getRepository(Booking);
  const slotRepo = DS.getRepository(BookingSlot);
  const bsRepo = DS.getRepository(BookingService);
  const payRepo = DS.getRepository(Payment);
  const reviewRepo = DS.getRepository(Review);

  const marker = await userRepo.findOne({
    where: { email: 'nguyen.van.an@demo.local' },
  });
  if (marker) {
    console.log('[demo-seed] demo data already present → skip.');
    await DS.destroy();
    return;
  }

  // ---------- Users ----------
  const customers = await userRepo.save([
    userRepo.create({ email: 'nguyen.van.an@demo.local', password: await hash('demo123'), fullName: 'Nguyễn Văn An', phone: '0901111111', role: UserRole.CUSTOMER, isActive: true }),
    userRepo.create({ email: 'tran.thi.huong@demo.local', password: await hash('demo123'), fullName: 'Trần Thị Hương', phone: '0901111112', role: UserRole.CUSTOMER, isActive: true }),
    userRepo.create({ email: 'le.minh.tuan@demo.local', password: await hash('demo123'), fullName: 'Lê Minh Tuấn', phone: '0901111113', role: UserRole.CUSTOMER, isActive: true }),
    userRepo.create({ email: 'pham.thi.lan@demo.local', password: await hash('demo123'), fullName: 'Phạm Thị Lan', phone: '0901111114', role: UserRole.CUSTOMER, isActive: true }),
    userRepo.create({ email: 'hoang.duc@demo.local', password: await hash('demo123'), fullName: 'Hoàng Đức Trí', phone: '0901111115', role: UserRole.CUSTOMER, isActive: true }),
    userRepo.create({ email: 'vu.thi.mai@demo.local', password: await hash('demo123'), fullName: 'Vũ Thị Mai', phone: '0901111116', role: UserRole.CUSTOMER, isActive: true }),
    userRepo.create({ email: 'dang.van.hung@demo.local', password: await hash('demo123'), fullName: 'Đặng Văn Hùng', phone: '0901111117', role: UserRole.CUSTOMER, isActive: true }),
    userRepo.create({ email: 'bui.thi.thu@demo.local', password: await hash('demo123'), fullName: 'Bùi Thị Thu', phone: '0901111118', role: UserRole.CUSTOMER, isActive: true }),
  ]);
  const staffs = await userRepo.save([
    userRepo.create({ email: 'staff.linh@demo.local', password: await hash('staff123'), fullName: 'Phan Mỹ Linh', phone: '0902222001', role: UserRole.STAFF, isActive: true }),
    userRepo.create({ email: 'staff.long@demo.local', password: await hash('staff123'), fullName: 'Trương Văn Long', phone: '0902222002', role: UserRole.STAFF, isActive: true }),
  ]);
  console.log(`[demo-seed] users inserted: ${customers.length} customers, ${staffs.length} staff`);

  // ---------- Fields ----------
  const fieldDefs = [
    { name: 'Sân C1', type: FieldType.FIVE, surface: FieldSurface.GRASS, description: 'Sân mini 5 người, cỏ tự nhiên dày, gần khu ăn uống.' },
    { name: 'Sân C2', type: FieldType.FIVE, surface: FieldSurface.ARTIFICIAL, description: 'Sân mini 5 người, cỏ nhân tạo mới thay 2025.' },
    { name: 'Sân D1', type: FieldType.ELEVEN, surface: FieldSurface.ARTIFICIAL, description: 'Sân 11 người tiêu chuẩn FIFA, mái che một phần.' },
    { name: 'Sân D2', type: FieldType.SEVEN, surface: FieldSurface.ARTIFICIAL, description: 'Sân 7 người có khán đài nhỏ, đèn LED chuyên nghiệp.' },
  ];
  const newFields = await fieldRepo.save(
    fieldDefs.map((f) =>
      fieldRepo.create({
        name: f.name,
        type: f.type,
        surface: f.surface,
        description: f.description,
        status: FieldStatus.AVAILABLE,
        address: '123 Đường ABC, Quận 1, TP.HCM',
        openTime: '06:00:00',
        closeTime: '23:00:00',
      }),
    ),
  );
  console.log(`[demo-seed] fields inserted: ${newFields.length}`);

  // ---------- Field images (real Pexels photos) ----------
  const allFields = await fieldRepo.find({ order: { createdAt: 'ASC' } });
  const pexelsSuffix = '?auto=compress&cs=tinysrgb&w=1200';
  for (let i = 0; i < allFields.length; i++) {
    const f = allFields[i];
    await fieldImgRepo.save([
      fieldImgRepo.create({ fieldId: f.id, imageUrl: `${REAL_FIELD_IMAGES[i % 12]}${pexelsSuffix}`, isPrimary: true }),
      fieldImgRepo.create({ fieldId: f.id, imageUrl: `${REAL_FIELD_IMAGES[(i + 1) % 12]}${pexelsSuffix}`, isPrimary: false }),
      fieldImgRepo.create({ fieldId: f.id, imageUrl: `${REAL_FIELD_IMAGES[(i + 2) % 12]}${pexelsSuffix}`, isPrimary: false }),
    ]);
  }
  console.log(`[demo-seed] field images inserted for ${allFields.length} fields`);

  // ---------- Prices for the new fields (mirror existing tier scheme) ----------
  const tierBase: { dayType: DayType; startTime: string; endTime: string; baseFive: number }[] = [
    { dayType: DayType.WEEKDAY, startTime: '06:00:00', endTime: '17:00:00', baseFive: 200000 },
    { dayType: DayType.WEEKDAY, startTime: '17:00:00', endTime: '23:00:00', baseFive: 300000 },
    { dayType: DayType.WEEKEND, startTime: '06:00:00', endTime: '23:00:00', baseFive: 350000 },
  ];
  let priceCount = 0;
  for (const f of newFields) {
    const offset =
      f.type === FieldType.FIVE ? 0 : f.type === FieldType.SEVEN ? 50000 : 100000;
    for (const tier of tierBase) {
      await priceRepo.save(
        priceRepo.create({
          fieldId: f.id,
          dayType: tier.dayType,
          startTime: tier.startTime,
          endTime: tier.endTime,
          pricePerHour: (tier.baseFive + offset).toString(),
          isActive: true,
        }),
      );
      priceCount += 1;
    }
  }
  console.log(`[demo-seed] prices inserted: ${priceCount}`);

  // ---------- Extra services ----------
  const newServices = [
    { name: 'Bia Saigon', category: ServiceCategory.DRINK, unitPrice: '15000', unit: 'lon', stock: 200 },
    { name: 'Cà phê đá', category: ServiceCategory.DRINK, unitPrice: '20000', unit: 'ly', stock: 50 },
    { name: 'Giày đá bóng', category: ServiceCategory.EQUIPMENT, unitPrice: '50000', unit: 'đôi', stock: 15 },
    { name: 'Băng cuốn cổ chân', category: ServiceCategory.EQUIPMENT, unitPrice: '10000', unit: 'cuộn', stock: 50 },
  ];
  for (const s of newServices) {
    await serviceRepo.save(serviceRepo.create({ ...s, isActive: true }));
  }
  console.log(`[demo-seed] services inserted: ${newServices.length}`);
  const allServices = await serviceRepo.find();

  // ---------- Promotions ----------
  await promoRepo.save([
    promoRepo.create({
      code: 'STUDENT15',
      description: 'Giảm 15% cho sinh viên (đặt từ T2 đến T6)',
      discountType: DiscountType.PERCENT,
      discountValue: '15',
      minOrder: '0',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      usageLimit: 200,
      usedCount: 0,
      isActive: true,
    }),
    promoRepo.create({
      code: 'BIRTHDAY100',
      description: 'Giảm 100.000đ mừng sinh nhật, đơn từ 800.000đ',
      discountType: DiscountType.FIXED,
      discountValue: '100000',
      minOrder: '800000',
      startDate: '2026-04-01',
      endDate: '2026-07-31',
      usageLimit: 50,
      usedCount: 0,
      isActive: true,
    }),
    promoRepo.create({
      code: 'NEWUSER',
      description: 'Giảm 20% cho lần đặt đầu tiên',
      discountType: DiscountType.PERCENT,
      discountValue: '20',
      minOrder: '200000',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      usageLimit: 500,
      usedCount: 0,
      isActive: true,
    }),
  ]);
  console.log('[demo-seed] promotions inserted: 3');

  // ---------- Bookings + slots + services + payments ----------
  const allCustomers = await userRepo.find({
    where: { role: UserRole.CUSTOMER },
  });
  const allStaff = await userRepo.find({ where: { role: UserRole.STAFF } });
  const fieldsList = await fieldRepo.find();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  type StatusPlan = { status: BookingStatus; offsetDays: number; payments: 'none' | 'deposit' | 'full' };
  const plans: StatusPlan[] = [
    // Past completed
    ...Array.from({ length: 10 }, (_, i) => ({ status: BookingStatus.COMPLETED, offsetDays: -(30 - i * 2), payments: 'full' as const })),
    // Past cancelled
    ...Array.from({ length: 5 }, (_, i) => ({ status: BookingStatus.CANCELLED, offsetDays: -(20 - i), payments: 'none' as const })),
    // Past rejected
    { status: BookingStatus.REJECTED, offsetDays: -5, payments: 'none' as const },
    { status: BookingStatus.REJECTED, offsetDays: -3, payments: 'none' as const },
    // Today checked-in
    { status: BookingStatus.CHECKED_IN, offsetDays: 0, payments: 'deposit' as const },
    { status: BookingStatus.CHECKED_IN, offsetDays: 0, payments: 'deposit' as const },
    // Confirmed (upcoming + today)
    ...Array.from({ length: 8 }, (_, i) => ({ status: BookingStatus.CONFIRMED, offsetDays: i, payments: 'deposit' as const })),
    // Pending payment (upcoming)
    ...Array.from({ length: 5 }, (_, i) => ({ status: BookingStatus.PENDING_PAYMENT, offsetDays: 1 + i, payments: 'none' as const })),
  ];

  const HOUR_BLOCKS = [
    { startTime: '07:00:00', endTime: '08:30:00' },
    { startTime: '09:00:00', endTime: '10:30:00' },
    { startTime: '15:30:00', endTime: '17:00:00' },
    { startTime: '17:30:00', endTime: '19:00:00' },
    { startTime: '19:30:00', endTime: '21:00:00' },
    { startTime: '21:30:00', endTime: '23:00:00' },
  ];

  // Track per (fieldId, date) which slots are already taken to avoid UNIQUE violation
  const occupied = new Set<string>();
  let bookingSeq = 0;
  let bookingsCreated = 0;
  const completedBookings: Booking[] = [];

  for (const plan of plans) {
    const date = new Date(today);
    date.setDate(date.getDate() + plan.offsetDays);

    // Try a few combos until we find one not occupied
    let attempt = 0;
    let chosenField: Field | null = null;
    let chosenBlock: { startTime: string; endTime: string } | null = null;
    while (attempt < 20) {
      attempt += 1;
      const f = pick(fieldsList);
      const b = pick(HOUR_BLOCKS);
      const slots = generateSlots(date, b);
      const conflict = slots.some((s) =>
        occupied.has(`${f.id}:${s.slotDate}:${s.slotStart}`),
      );
      if (!conflict) {
        chosenField = f;
        chosenBlock = b;
        break;
      }
    }
    if (!chosenField || !chosenBlock) continue; // skip if can't fit

    const slots = generateSlots(date, chosenBlock);
    slots.forEach((s) =>
      occupied.add(`${chosenField!.id}:${s.slotDate}:${s.slotStart}`),
    );

    const fieldPrice = computeFieldPrice(
      chosenField.type,
      date,
      chosenBlock.startTime,
      chosenBlock.endTime,
    );
    // optional services for some bookings
    const useServices = randInt(0, 2) > 0;
    const svcItems: { service: Service; quantity: number }[] = [];
    if (useServices) {
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

    const booking = bookingRepo.create({
      bookingCode: bookingCode(date, bookingSeq),
      customerId: customer.id,
      fieldId: chosenField.id,
      bookingDate: isoDate(date),
      startTime: chosenBlock.startTime,
      endTime: chosenBlock.endTime,
      totalHours: totalHours.toFixed(2),
      fieldPrice: fieldPrice.toString(),
      servicePrice: servicePrice.toString(),
      discountAmount: '0',
      totalPrice: totalPrice.toString(),
      depositAmount: depositAmount.toString(),
      status: plan.status,
      paymentStatus:
        plan.payments === 'full'
          ? PaymentStatus.FULLY_PAID
          : plan.payments === 'deposit'
            ? PaymentStatus.DEPOSITED
            : PaymentStatus.UNPAID,
      note:
        plan.status === BookingStatus.REJECTED
          ? 'Khách không xác nhận trong thời gian quy định'
          : null,
      confirmedBy:
        plan.status !== BookingStatus.PENDING_PAYMENT &&
        plan.status !== BookingStatus.REJECTED &&
        plan.status !== BookingStatus.CANCELLED
          ? pick(allStaff).id
          : null,
    });
    const savedBooking = await bookingRepo.save(booking);

    // slots — only insert if not CANCELLED/REJECTED (otherwise slots are released)
    if (
      plan.status !== BookingStatus.CANCELLED &&
      plan.status !== BookingStatus.REJECTED
    ) {
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
    } else {
      // free the slots back so future bookings can take them
      slots.forEach((s) =>
        occupied.delete(`${chosenField!.id}:${s.slotDate}:${s.slotStart}`),
      );
    }

    // booking services
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

    // payments
    const paidAtDate = new Date(date);
    paidAtDate.setHours(randInt(9, 18), randInt(0, 59), 0, 0);
    if (plan.payments === 'deposit') {
      await payRepo.save(
        payRepo.create({
          bookingId: savedBooking.id,
          amount: depositAmount.toString(),
          method: pick([PaymentMethod.CASH, PaymentMethod.BANK_TRANSFER, PaymentMethod.VNPAY]),
          type: PaymentType.DEPOSIT,
          status: TxStatus.SUCCESS,
          paidAt: paidAtDate,
          receivedBy: pick(allStaff).id,
        }),
      );
    } else if (plan.payments === 'full') {
      await payRepo.save([
        payRepo.create({
          bookingId: savedBooking.id,
          amount: depositAmount.toString(),
          method: PaymentMethod.VNPAY,
          type: PaymentType.DEPOSIT,
          status: TxStatus.SUCCESS,
          paidAt: paidAtDate,
        }),
        payRepo.create({
          bookingId: savedBooking.id,
          amount: (totalPrice - depositAmount).toString(),
          method: PaymentMethod.CASH,
          type: PaymentType.FULL_PAYMENT,
          status: TxStatus.SUCCESS,
          paidAt: paidAtDate,
          receivedBy: pick(allStaff).id,
        }),
      ]);
      completedBookings.push(savedBooking);
    }

    bookingsCreated += 1;
  }
  console.log(`[demo-seed] bookings created: ${bookingsCreated}`);

  // ---------- Reviews on completed bookings ----------
  const reviewComments = [
    'Sân đẹp, mặt cỏ tốt, đèn sáng. Sẽ quay lại!',
    'Nhân viên thân thiện, giá hợp lý.',
    'Sân khá ổn nhưng phòng thay đồ hơi chật.',
    'Đặt sân dễ, thanh toán nhanh.',
    'Cỏ hơi mềm, nhưng tổng thể tốt.',
    'Trải nghiệm tuyệt vời, đội mình sẽ thuê cố định mỗi tuần.',
    'Sân sạch, có đầy đủ dịch vụ nước uống.',
    'Phục vụ chuyên nghiệp, đáng đồng tiền.',
  ];
  let reviewCount = 0;
  for (const b of completedBookings.slice(0, 8)) {
    await reviewRepo.save(
      reviewRepo.create({
        customerId: b.customerId,
        fieldId: b.fieldId,
        bookingId: b.id,
        rating: randInt(3, 5),
        comment: pick(reviewComments),
      }),
    );
    reviewCount += 1;
  }
  console.log(`[demo-seed] reviews created: ${reviewCount}`);

  await DS.destroy();
  console.log('[demo-seed] DONE.');
}

run().catch(async (err) => {
  console.error('[demo-seed] ERROR:', err);
  if (DS.isInitialized) await DS.destroy();
  process.exit(1);
});
