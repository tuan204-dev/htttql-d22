import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FieldStatus, FieldSurface, FieldType } from '../../../common/enums';
import { FieldImage } from './field-image.entity';
import { Price } from '../../prices/entities/price.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { Review } from '../../reviews/entities/review.entity';

@Entity({ name: 'fields' })
export class Field {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'enum', enum: FieldType })
  type: FieldType;

  @Column({ type: 'enum', enum: FieldSurface })
  surface: FieldSurface;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: FieldStatus,
    default: FieldStatus.AVAILABLE,
  })
  status: FieldStatus;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ name: 'open_time', type: 'time', default: '06:00:00' })
  openTime: string;

  @Column({ name: 'close_time', type: 'time', default: '23:00:00' })
  closeTime: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @OneToMany(() => FieldImage, (image) => image.field)
  images: FieldImage[];

  @OneToMany(() => Price, (price) => price.field)
  prices: Price[];

  @OneToMany(() => Booking, (booking) => booking.field)
  bookings: Booking[];

  @OneToMany(() => Review, (review) => review.field)
  reviews: Review[];
}
