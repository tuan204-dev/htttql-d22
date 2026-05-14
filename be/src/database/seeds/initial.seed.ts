import 'reflect-metadata';
import { config } from 'dotenv';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { join } from 'path';

import {
  DayType,
  DiscountType,
  FieldStatus,
  FieldSurface,
  FieldType,
  ServiceCategory,
  UserRole,
} from '../../common/enums';
import { User } from '../../modules/users/entities/user.entity';
import { Field } from '../../modules/fields/entities/field.entity';
import { Price } from '../../modules/prices/entities/price.entity';
import { Service } from '../../modules/services/entities/service.entity';
import { Promotion } from '../../modules/promotions/entities/promotion.entity';

config();

const SeedDataSource = new DataSource({
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

async function hash(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

interface FieldSeed {
  name: string;
  type: FieldType;
  surface: FieldSurface;
  description: string;
  basePriceOffset: number;
}

interface PriceTier {
  dayType: DayType;
  startTime: string;
  endTime: string;
  baseFive: number;
}

const PRICE_TIERS: PriceTier[] = [
  {
    dayType: DayType.WEEKDAY,
    startTime: '06:00:00',
    endTime: '17:00:00',
    baseFive: 200000,
  },
  {
    dayType: DayType.WEEKDAY,
    startTime: '17:00:00',
    endTime: '23:00:00',
    baseFive: 300000,
  },
  {
    dayType: DayType.WEEKEND,
    startTime: '06:00:00',
    endTime: '23:00:00',
    baseFive: 350000,
  },
];

function priceForType(type: FieldType, baseFive: number): number {
  if (type === FieldType.FIVE) return baseFive;
  if (type === FieldType.SEVEN) return baseFive + 50000;
  return baseFive + 100000;
}

async function run(): Promise<void> {
  console.log('[seed] connecting...');
  await SeedDataSource.initialize();
  console.log('[seed] connected.');

  const userRepo = SeedDataSource.getRepository(User);
  const fieldRepo = SeedDataSource.getRepository(Field);
  const priceRepo = SeedDataSource.getRepository(Price);
  const serviceRepo = SeedDataSource.getRepository(Service);
  const promoRepo = SeedDataSource.getRepository(Promotion);

  const existingAdmin = await userRepo.findOne({
    where: { email: 'admin@soccer.local' },
  });
  if (existingAdmin) {
    console.log('[seed] admin already exists -> skip seeding.');
    await SeedDataSource.destroy();
    return;
  }

  // -- users --
  const admin = userRepo.create({
    email: 'admin@soccer.local',
    password: await hash('admin123'),
    fullName: 'System Admin',
    phone: '0900000001',
    role: UserRole.ADMIN,
    isActive: true,
  });
  const staff = userRepo.create({
    email: 'staff@soccer.local',
    password: await hash('staff123'),
    fullName: 'Demo Staff',
    phone: '0900000002',
    role: UserRole.STAFF,
    isActive: true,
  });
  const customer = userRepo.create({
    email: 'customer@soccer.local',
    password: await hash('customer123'),
    fullName: 'Demo Customer',
    phone: '0900000003',
    role: UserRole.CUSTOMER,
    isActive: true,
  });
  await userRepo.save([admin, staff, customer]);
  console.log('[seed] users inserted: admin, staff, customer');

  // -- fields --
  const fieldSeeds: FieldSeed[] = [
    {
      name: 'Sân A1',
      type: FieldType.FIVE,
      surface: FieldSurface.ARTIFICIAL,
      description: 'Sân mini 5 người, cỏ nhân tạo cao cấp.',
      basePriceOffset: 0,
    },
    {
      name: 'Sân A2',
      type: FieldType.SEVEN,
      surface: FieldSurface.ARTIFICIAL,
      description: 'Sân 7 người, cỏ nhân tạo.',
      basePriceOffset: 0,
    },
    {
      name: 'Sân B1',
      type: FieldType.ELEVEN,
      surface: FieldSurface.GRASS,
      description: 'Sân 11 người, cỏ tự nhiên tiêu chuẩn.',
      basePriceOffset: 0,
    },
    {
      name: 'Sân B2',
      type: FieldType.SEVEN,
      surface: FieldSurface.GRASS,
      description: 'Sân 7 người, cỏ tự nhiên.',
      basePriceOffset: 0,
    },
  ];

  const fields: Field[] = [];
  for (const f of fieldSeeds) {
    const field = fieldRepo.create({
      name: f.name,
      type: f.type,
      surface: f.surface,
      description: f.description,
      status: FieldStatus.AVAILABLE,
      address: '123 Đường ABC, Quận 1, TP.HCM',
      openTime: '06:00:00',
      closeTime: '23:00:00',
    });
    fields.push(await fieldRepo.save(field));
  }
  console.log(`[seed] fields inserted: ${fields.length}`);

  // -- prices --
  let pricesCount = 0;
  for (const f of fields) {
    for (const tier of PRICE_TIERS) {
      const price = priceRepo.create({
        fieldId: f.id,
        dayType: tier.dayType,
        startTime: tier.startTime,
        endTime: tier.endTime,
        pricePerHour: priceForType(f.type, tier.baseFive).toString(),
        isActive: true,
      });
      await priceRepo.save(price);
      pricesCount += 1;
    }
  }
  console.log(`[seed] prices inserted: ${pricesCount}`);

  // -- services --
  const services = [
    {
      name: 'Nước suối',
      category: ServiceCategory.DRINK,
      unitPrice: '10000',
      unit: 'chai',
      stock: 100,
    },
    {
      name: 'Trà đá',
      category: ServiceCategory.DRINK,
      unitPrice: '5000',
      unit: 'ly',
      stock: 100,
    },
    {
      name: 'Áo đấu',
      category: ServiceCategory.EQUIPMENT,
      unitPrice: '30000',
      unit: 'bộ',
      stock: 30,
    },
    {
      name: 'Bóng',
      category: ServiceCategory.EQUIPMENT,
      unitPrice: '50000',
      unit: 'quả',
      stock: 20,
    },
    {
      name: 'Trọng tài',
      category: ServiceCategory.REFEREE,
      unitPrice: '200000',
      unit: 'trận',
      stock: 0,
    },
    {
      name: 'Khăn lạnh',
      category: ServiceCategory.OTHER,
      unitPrice: '5000',
      unit: 'cái',
      stock: 100,
    },
  ];
  for (const s of services) {
    await serviceRepo.save(serviceRepo.create({ ...s, isActive: true }));
  }
  console.log(`[seed] services inserted: ${services.length}`);

  // -- promotions --
  const promo1 = promoRepo.create({
    code: 'WELCOME10',
    description: 'Giảm 10% cho đơn từ 100.000đ',
    discountType: DiscountType.PERCENT,
    discountValue: '10',
    minOrder: '100000',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    usageLimit: null,
    usedCount: 0,
    isActive: true,
  });
  const promo2 = promoRepo.create({
    code: 'SUMMER2026',
    description: 'Giảm 50.000đ cho đơn từ 500.000đ',
    discountType: DiscountType.FIXED,
    discountValue: '50000',
    minOrder: '500000',
    startDate: '2026-06-01',
    endDate: '2026-12-31',
    usageLimit: null,
    usedCount: 0,
    isActive: true,
  });
  await promoRepo.save([promo1, promo2]);
  console.log('[seed] promotions inserted: 2');

  await SeedDataSource.destroy();
  console.log('[seed] DONE.');
}

run().catch(async (err) => {
  console.error('[seed] ERROR:', err);
  if (SeedDataSource.isInitialized) {
    await SeedDataSource.destroy();
  }
  process.exit(1);
});
