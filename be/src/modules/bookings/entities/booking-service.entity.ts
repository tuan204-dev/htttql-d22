import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Booking } from './booking.entity';
import { Service } from '../../services/entities/service.entity';

@Entity({ name: 'booking_services' })
export class BookingService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId: string;

  @Column({ name: 'service_id', type: 'uuid' })
  serviceId: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  unitPrice: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: string;

  @ManyToOne(() => Booking, (booking) => booking.bookingServices, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @ManyToOne(() => Service, (service) => service.bookingServices)
  @JoinColumn({ name: 'service_id' })
  service: Service;
}
