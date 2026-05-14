import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Field } from '../fields/entities/field.entity';
import { Price } from '../prices/entities/price.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { Service } from '../services/entities/service.entity';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingService as BookingServiceEntity } from './entities/booking-service.entity';
import { BookingSlot } from './entities/booking-slot.entity';
import { Booking } from './entities/booking.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      BookingSlot,
      BookingServiceEntity,
      Service,
      Promotion,
      Field,
      Price,
    ]),
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
