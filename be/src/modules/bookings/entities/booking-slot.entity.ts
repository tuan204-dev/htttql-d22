import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Booking } from './booking.entity';
import { Field } from '../../fields/entities/field.entity';

@Entity({ name: 'booking_slots' })
@Index(['fieldId', 'slotDate', 'slotStart'], { unique: true })
export class BookingSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId: string;

  @Column({ name: 'field_id', type: 'uuid' })
  fieldId: string;

  @Column({ name: 'slot_date', type: 'date' })
  slotDate: string;

  @Column({ name: 'slot_start', type: 'time' })
  slotStart: string;

  @Column({ name: 'slot_end', type: 'time' })
  slotEnd: string;

  @ManyToOne(() => Booking, (booking) => booking.slots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @ManyToOne(() => Field)
  @JoinColumn({ name: 'field_id' })
  field: Field;
}
