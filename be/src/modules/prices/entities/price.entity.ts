import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DayType } from '../../../common/enums';
import { Field } from '../../fields/entities/field.entity';

@Entity({ name: 'prices' })
@Index(['fieldId', 'dayType', 'startTime'], { unique: true })
export class Price {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'field_id', type: 'uuid' })
  fieldId: string;

  @Column({ name: 'day_type', type: 'enum', enum: DayType })
  dayType: DayType;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @Column({
    name: 'price_per_hour',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  pricePerHour: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => Field, (field) => field.prices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'field_id' })
  field: Field;
}
