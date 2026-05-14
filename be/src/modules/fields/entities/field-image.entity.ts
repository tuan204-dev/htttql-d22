import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Field } from './field.entity';

@Entity({ name: 'field_images' })
export class FieldImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'field_id', type: 'uuid' })
  fieldId: string;

  @Column({ name: 'image_url', type: 'varchar', length: 255 })
  imageUrl: string;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;

  @ManyToOne(() => Field, (field) => field.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'field_id' })
  field: Field;
}
