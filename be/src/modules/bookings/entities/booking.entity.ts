import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookingStatus, PaymentStatus } from '../../../common/enums';
import { User } from '../../users/entities/user.entity';
import { Field } from '../../fields/entities/field.entity';
import { Promotion } from '../../promotions/entities/promotion.entity';
import { BookingSlot } from './booking-slot.entity';
import { BookingService } from './booking-service.entity';
import { Payment } from '../../payments/entities/payment.entity';

@Entity({ name: 'bookings' })
@Index(['fieldId', 'bookingDate'])
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_code', type: 'varchar', length: 20, unique: true })
  bookingCode: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @Column({ name: 'field_id', type: 'uuid' })
  fieldId: string;

  @Column({ name: 'booking_date', type: 'date' })
  bookingDate: string;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @Column({
    name: 'total_hours',
    type: 'decimal',
    precision: 4,
    scale: 2,
  })
  totalHours: string;

  @Column({
    name: 'field_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  fieldPrice: string;

  @Column({
    name: 'service_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  servicePrice: string;

  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  discountAmount: string;

  @Column({
    name: 'total_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  totalPrice: string;

  @Column({
    name: 'deposit_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  depositAmount: string;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING_PAYMENT,
  })
  status: BookingStatus;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.UNPAID,
  })
  paymentStatus: PaymentStatus;

  @Column({ name: 'promotion_id', type: 'uuid', nullable: true })
  promotionId: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'confirmed_by', type: 'uuid', nullable: true })
  confirmedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.bookings)
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @ManyToOne(() => Field, (field) => field.bookings)
  @JoinColumn({ name: 'field_id' })
  field: Field;

  @ManyToOne(() => Promotion, (promotion) => promotion.bookings, {
    nullable: true,
  })
  @JoinColumn({ name: 'promotion_id' })
  promotion: Promotion | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'confirmed_by' })
  confirmedByUser: User | null;

  @OneToMany(() => BookingSlot, (slot) => slot.booking)
  slots: BookingSlot[];

  @OneToMany(() => BookingService, (bs) => bs.booking)
  bookingServices: BookingService[];

  @OneToMany(() => Payment, (payment) => payment.booking)
  payments: Payment[];
}
