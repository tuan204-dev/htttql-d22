import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, FindOptionsWhere } from 'typeorm';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Field } from './entities/field.entity';
import { FieldImage } from './entities/field-image.entity';
import { BookingSlot } from '../bookings/entities/booking-slot.entity';
import { Review } from '../reviews/entities/review.entity';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { FieldFilterDto } from './dto/field-filter.dto';
import { FieldStatus } from '../../common/enums';

export interface AvailabilitySlot {
  slotStart: string;
  slotEnd: string;
  available: boolean;
}

@Injectable()
export class FieldsService {
  constructor(
    @InjectRepository(Field)
    private readonly fieldRepo: Repository<Field>,
    @InjectRepository(FieldImage)
    private readonly imageRepo: Repository<FieldImage>,
    @InjectRepository(BookingSlot)
    private readonly bookingSlotRepo: Repository<BookingSlot>,
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
  ) {}

  async create(dto: CreateFieldDto): Promise<Field> {
    const field = this.fieldRepo.create({
      ...dto,
      openTime: dto.openTime ?? '06:00:00',
      closeTime: dto.closeTime ?? '23:00:00',
    });
    return this.fieldRepo.save(field);
  }

  async findAll(filter: FieldFilterDto) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Field>[] = [];
    const baseWhere: FindOptionsWhere<Field> = {};

    if (filter.type) baseWhere.type = filter.type;
    if (filter.status) baseWhere.status = filter.status;

    if (filter.search) {
      where.push(
        { ...baseWhere, name: ILike(`%${filter.search}%`) },
        { ...baseWhere, address: ILike(`%${filter.search}%`) },
      );
    } else {
      where.push(baseWhere);
    }

    const [items, total] = await this.fieldRepo.findAndCount({
      where,
      relations: ['images', 'prices'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    const field = await this.fieldRepo.findOne({
      where: { id },
      relations: ['images', 'prices'],
    });
    if (!field) {
      throw new NotFoundException(`Field ${id} not found`);
    }

    const reviewStats = await this.reviewRepo
      .createQueryBuilder('r')
      .select('COUNT(r.id)', 'count')
      .addSelect('COALESCE(AVG(r.rating), 0)', 'avg')
      .where('r.field_id = :fieldId', { fieldId: id })
      .getRawOne<{ count: string; avg: string }>();

    return {
      ...field,
      reviewCount: Number(reviewStats?.count ?? 0),
      averageRating: Number(reviewStats?.avg ?? 0),
    };
  }

  async getAvailability(
    fieldId: string,
    date: string,
  ): Promise<AvailabilitySlot[]> {
    const field = await this.fieldRepo.findOne({ where: { id: fieldId } });
    if (!field) {
      throw new NotFoundException(`Field ${fieldId} not found`);
    }

    // Validate date range: not in past and not > 14 days in future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(`${date}T00:00:00`);
    if (Number.isNaN(target.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    const diffDays = Math.floor(
      (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays < 0) {
      throw new BadRequestException('Date cannot be in the past');
    }
    if (diffDays > 14) {
      throw new BadRequestException(
        'Date cannot be more than 14 days in the future',
      );
    }

    const slots = this.generateSlots(field.openTime, field.closeTime);

    const booked = await this.bookingSlotRepo.find({
      where: { fieldId, slotDate: date },
    });
    const bookedSet = new Set(
      booked.map((b) => this.normalizeTime(b.slotStart)),
    );

    return slots.map((s) => ({
      slotStart: s.slotStart,
      slotEnd: s.slotEnd,
      available: !bookedSet.has(s.slotStart),
    }));
  }

  private generateSlots(openTime: string, closeTime: string) {
    const start = this.toMinutes(openTime);
    const end = this.toMinutes(closeTime);
    const result: { slotStart: string; slotEnd: string }[] = [];
    for (let t = start; t + 30 <= end; t += 30) {
      result.push({
        slotStart: this.toHHmm(t),
        slotEnd: this.toHHmm(t + 30),
      });
    }
    return result;
  }

  private toMinutes(time: string): number {
    const [hh, mm] = time.split(':');
    return Number(hh) * 60 + Number(mm);
  }

  private toHHmm(min: number): string {
    const h = Math.floor(min / 60)
      .toString()
      .padStart(2, '0');
    const m = (min % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  private normalizeTime(time: string): string {
    // Convert "HH:mm:ss" or "HH:mm" -> "HH:mm"
    const parts = time.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }

  async update(id: string, dto: UpdateFieldDto): Promise<Field> {
    const field = await this.fieldRepo.findOne({ where: { id } });
    if (!field) {
      throw new NotFoundException(`Field ${id} not found`);
    }
    Object.assign(field, dto);
    return this.fieldRepo.save(field);
  }

  async remove(id: string): Promise<{ id: string; status: FieldStatus }> {
    const field = await this.fieldRepo.findOne({ where: { id } });
    if (!field) {
      throw new NotFoundException(`Field ${id} not found`);
    }
    field.status = FieldStatus.CLOSED;
    await this.fieldRepo.save(field);
    return { id, status: field.status };
  }

  async addImage(
    fieldId: string,
    file: Express.Multer.File,
    isPrimary = false,
  ): Promise<FieldImage> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const field = await this.fieldRepo.findOne({ where: { id: fieldId } });
    if (!field) {
      // Cleanup uploaded file if field not found
      await this.safeUnlink(file.path);
      throw new NotFoundException(`Field ${fieldId} not found`);
    }

    if (isPrimary) {
      await this.imageRepo.update({ fieldId }, { isPrimary: false });
    }

    const imageUrl = `/uploads/fields/${file.filename}`;
    const image = this.imageRepo.create({
      fieldId,
      imageUrl,
      isPrimary,
    });
    return this.imageRepo.save(image);
  }

  async removeImage(imgId: string): Promise<{ id: string; deleted: boolean }> {
    const image = await this.imageRepo.findOne({ where: { id: imgId } });
    if (!image) {
      throw new NotFoundException(`Image ${imgId} not found`);
    }

    // Best-effort delete physical file
    const filename = image.imageUrl.split('/').pop();
    if (filename) {
      const filepath = join(
        process.cwd(),
        'uploads',
        'fields',
        filename,
      );
      await this.safeUnlink(filepath);
    }

    await this.imageRepo.delete(imgId);
    return { id: imgId, deleted: true };
  }

  private async safeUnlink(path: string): Promise<void> {
    try {
      await fs.unlink(path);
    } catch {
      // ignore
    }
  }
}
