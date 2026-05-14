import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // pgcrypto for gen_random_uuid (uuid_generate_v4 alternative not required by TypeORM)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // ---------- ENUM types ----------
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('ADMIN','STAFF','CUSTOMER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."fields_type_enum" AS ENUM('FIVE','SEVEN','ELEVEN')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."fields_surface_enum" AS ENUM('GRASS','ARTIFICIAL')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."fields_status_enum" AS ENUM('AVAILABLE','MAINTENANCE','CLOSED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."prices_day_type_enum" AS ENUM('WEEKDAY','WEEKEND','HOLIDAY')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."services_category_enum" AS ENUM('DRINK','EQUIPMENT','REFEREE','OTHER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."bookings_status_enum" AS ENUM('PENDING_PAYMENT','CONFIRMED','CHECKED_IN','COMPLETED','CANCELLED','REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."bookings_payment_status_enum" AS ENUM('UNPAID','DEPOSITED','FULLY_PAID','REFUNDED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payments_method_enum" AS ENUM('CASH','BANK_TRANSFER','VNPAY','MOMO')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payments_type_enum" AS ENUM('DEPOSIT','FULL_PAYMENT','REFUND')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payments_status_enum" AS ENUM('PENDING','SUCCESS','FAILED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."promotions_discount_type_enum" AS ENUM('PERCENT','FIXED')`,
    );

    // ---------- users ----------
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" varchar(120) NOT NULL,
        "password" varchar(255) NOT NULL,
        "full_name" varchar(100) NOT NULL,
        "phone" varchar(15) NOT NULL,
        "role" "public"."users_role_enum" NOT NULL DEFAULT 'CUSTOMER',
        "avatar_url" varchar(255),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "UQ_users_phone" UNIQUE ("phone")
      )
    `);

    // ---------- fields ----------
    await queryRunner.query(`
      CREATE TABLE "fields" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(100) NOT NULL,
        "type" "public"."fields_type_enum" NOT NULL,
        "surface" "public"."fields_surface_enum" NOT NULL,
        "description" text,
        "status" "public"."fields_status_enum" NOT NULL DEFAULT 'AVAILABLE',
        "address" varchar(255) NOT NULL,
        "open_time" time NOT NULL DEFAULT '06:00:00',
        "close_time" time NOT NULL DEFAULT '23:00:00',
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fields_id" PRIMARY KEY ("id")
      )
    `);

    // ---------- field_images ----------
    await queryRunner.query(`
      CREATE TABLE "field_images" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "field_id" uuid NOT NULL,
        "image_url" varchar(255) NOT NULL,
        "is_primary" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_field_images_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_field_images_field" FOREIGN KEY ("field_id")
          REFERENCES "fields"("id") ON DELETE CASCADE
      )
    `);

    // ---------- prices ----------
    await queryRunner.query(`
      CREATE TABLE "prices" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "field_id" uuid NOT NULL,
        "day_type" "public"."prices_day_type_enum" NOT NULL,
        "start_time" time NOT NULL,
        "end_time" time NOT NULL,
        "price_per_hour" numeric(10,2) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_prices_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_prices_field" FOREIGN KEY ("field_id")
          REFERENCES "fields"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_prices_field_day_start" ON "prices" ("field_id","day_type","start_time")`,
    );

    // ---------- services ----------
    await queryRunner.query(`
      CREATE TABLE "services" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(100) NOT NULL,
        "category" "public"."services_category_enum" NOT NULL,
        "unit_price" numeric(10,2) NOT NULL,
        "unit" varchar(20) NOT NULL,
        "stock" int NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_services_id" PRIMARY KEY ("id")
      )
    `);

    // ---------- promotions ----------
    await queryRunner.query(`
      CREATE TABLE "promotions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "code" varchar(30) NOT NULL,
        "description" text NOT NULL,
        "discount_type" "public"."promotions_discount_type_enum" NOT NULL,
        "discount_value" numeric(10,2) NOT NULL,
        "min_order" numeric(10,2) NOT NULL DEFAULT 0,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "usage_limit" int,
        "used_count" int NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_promotions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_promotions_code" UNIQUE ("code")
      )
    `);

    // ---------- bookings ----------
    await queryRunner.query(`
      CREATE TABLE "bookings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "booking_code" varchar(20) NOT NULL,
        "customer_id" uuid NOT NULL,
        "field_id" uuid NOT NULL,
        "booking_date" date NOT NULL,
        "start_time" time NOT NULL,
        "end_time" time NOT NULL,
        "total_hours" numeric(4,2) NOT NULL,
        "field_price" numeric(10,2) NOT NULL,
        "service_price" numeric(10,2) NOT NULL DEFAULT 0,
        "discount_amount" numeric(10,2) NOT NULL DEFAULT 0,
        "total_price" numeric(10,2) NOT NULL,
        "deposit_amount" numeric(10,2) NOT NULL DEFAULT 0,
        "status" "public"."bookings_status_enum" NOT NULL DEFAULT 'PENDING_PAYMENT',
        "payment_status" "public"."bookings_payment_status_enum" NOT NULL DEFAULT 'UNPAID',
        "promotion_id" uuid,
        "note" text,
        "confirmed_by" uuid,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bookings_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_bookings_code" UNIQUE ("booking_code"),
        CONSTRAINT "FK_bookings_customer" FOREIGN KEY ("customer_id")
          REFERENCES "users"("id"),
        CONSTRAINT "FK_bookings_field" FOREIGN KEY ("field_id")
          REFERENCES "fields"("id"),
        CONSTRAINT "FK_bookings_promotion" FOREIGN KEY ("promotion_id")
          REFERENCES "promotions"("id"),
        CONSTRAINT "FK_bookings_confirmed_by" FOREIGN KEY ("confirmed_by")
          REFERENCES "users"("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_field_date" ON "bookings" ("field_id","booking_date")`,
    );

    // ---------- booking_slots ----------
    await queryRunner.query(`
      CREATE TABLE "booking_slots" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "booking_id" uuid NOT NULL,
        "field_id" uuid NOT NULL,
        "slot_date" date NOT NULL,
        "slot_start" time NOT NULL,
        "slot_end" time NOT NULL,
        CONSTRAINT "PK_booking_slots_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_booking_slots_booking" FOREIGN KEY ("booking_id")
          REFERENCES "bookings"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_booking_slots_field" FOREIGN KEY ("field_id")
          REFERENCES "fields"("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_booking_slots_field_date_start" ON "booking_slots" ("field_id","slot_date","slot_start")`,
    );

    // ---------- booking_services ----------
    await queryRunner.query(`
      CREATE TABLE "booking_services" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "booking_id" uuid NOT NULL,
        "service_id" uuid NOT NULL,
        "quantity" int NOT NULL,
        "unit_price" numeric(10,2) NOT NULL,
        "subtotal" numeric(10,2) NOT NULL,
        CONSTRAINT "PK_booking_services_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_booking_services_booking" FOREIGN KEY ("booking_id")
          REFERENCES "bookings"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_booking_services_service" FOREIGN KEY ("service_id")
          REFERENCES "services"("id")
      )
    `);

    // ---------- payments ----------
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "booking_id" uuid NOT NULL,
        "amount" numeric(10,2) NOT NULL,
        "method" "public"."payments_method_enum" NOT NULL,
        "type" "public"."payments_type_enum" NOT NULL,
        "status" "public"."payments_status_enum" NOT NULL DEFAULT 'PENDING',
        "transaction_code" varchar(100),
        "paid_at" timestamp,
        "received_by" uuid,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payments_booking" FOREIGN KEY ("booking_id")
          REFERENCES "bookings"("id"),
        CONSTRAINT "FK_payments_received_by" FOREIGN KEY ("received_by")
          REFERENCES "users"("id")
      )
    `);

    // ---------- reviews ----------
    await queryRunner.query(`
      CREATE TABLE "reviews" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "customer_id" uuid NOT NULL,
        "field_id" uuid NOT NULL,
        "booking_id" uuid NOT NULL,
        "rating" int NOT NULL,
        "comment" text NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reviews_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_reviews_booking" UNIQUE ("booking_id"),
        CONSTRAINT "CHK_reviews_rating" CHECK ("rating" >= 1 AND "rating" <= 5),
        CONSTRAINT "FK_reviews_customer" FOREIGN KEY ("customer_id")
          REFERENCES "users"("id"),
        CONSTRAINT "FK_reviews_field" FOREIGN KEY ("field_id")
          REFERENCES "fields"("id"),
        CONSTRAINT "FK_reviews_booking" FOREIGN KEY ("booking_id")
          REFERENCES "bookings"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "reviews"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "booking_services"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_booking_slots_field_date_start"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "booking_slots"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bookings_field_date"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bookings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "promotions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "services"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_prices_field_day_start"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "prices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "field_images"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fields"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "public"."promotions_discount_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."payments_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."payments_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."payments_method_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."bookings_payment_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."bookings_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."services_category_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."prices_day_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."fields_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."fields_surface_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."fields_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_role_enum"`);
  }
}
