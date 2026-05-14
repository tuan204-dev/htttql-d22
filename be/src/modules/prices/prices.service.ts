import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Price } from './entities/price.entity';
import { CreatePriceDto } from './dto/create-price.dto';
import { UpdatePriceDto } from './dto/update-price.dto';
import { DayType } from '../../common/enums';

@Injectable()
export class PricesService {
  constructor(
    @InjectRepository(Price)
    private readonly priceRepo: Repository<Price>,
  ) {}

  async findByField(fieldId: string): Promise<Price[]> {
    return this.priceRepo.find({
      where: { fieldId, isActive: true },
      order: { dayType: 'ASC', startTime: 'ASC' },
    });
  }

  async create(fieldId: string, dto: CreatePriceDto): Promise<Price> {
    const startTime = this.normalizeTime(dto.startTime);
    const endTime = this.normalizeTime(dto.endTime);

    const existing = await this.priceRepo.findOne({
      where: {
        fieldId,
        dayType: dto.dayType,
        startTime,
      },
    });
    if (existing) {
      throw new ConflictException(
        `Price config already exists for field=${fieldId}, dayType=${dto.dayType}, startTime=${startTime}`,
      );
    }

    const price = this.priceRepo.create({
      fieldId,
      dayType: dto.dayType,
      startTime,
      endTime,
      pricePerHour: dto.pricePerHour.toString(),
      isActive: true,
    });
    return this.priceRepo.save(price);
  }

  async update(id: string, dto: UpdatePriceDto): Promise<Price> {
    const price = await this.priceRepo.findOne({ where: { id } });
    if (!price) {
      throw new NotFoundException(`Price ${id} not found`);
    }
    if (dto.dayType !== undefined) price.dayType = dto.dayType;
    if (dto.startTime !== undefined)
      price.startTime = this.normalizeTime(dto.startTime);
    if (dto.endTime !== undefined)
      price.endTime = this.normalizeTime(dto.endTime);
    if (dto.pricePerHour !== undefined)
      price.pricePerHour = dto.pricePerHour.toString();
    return this.priceRepo.save(price);
  }

  async remove(id: string): Promise<{ id: string; isActive: boolean }> {
    const price = await this.priceRepo.findOne({ where: { id } });
    if (!price) {
      throw new NotFoundException(`Price ${id} not found`);
    }
    price.isActive = false;
    await this.priceRepo.save(price);
    return { id, isActive: false };
  }

  /**
   * Calculate field price for a booking based on configured prices.
   * Splits the booking range into 30-minute slots, finds the matching price record
   * for each slot, and accumulates pricePerHour / 2.
   */
  async calculatePrice(
    fieldId: string,
    bookingDate: string,
    startTime: string,
    endTime: string,
  ): Promise<number> {
    const dayType = this.resolveDayType(bookingDate);
    const prices = await this.priceRepo.find({
      where: { fieldId, dayType, isActive: true },
    });

    const startMin = this.toMinutes(startTime);
    const endMin = this.toMinutes(endTime);

    let total = 0;
    for (let t = startMin; t + 30 <= endMin; t += 30) {
      const match = prices.find((p) => {
        const ps = this.toMinutes(p.startTime);
        const pe = this.toMinutes(p.endTime);
        return ps <= t && t < pe;
      });
      if (match) {
        total += Number(match.pricePerHour) / 2;
      }
    }

    return total;
  }

  private resolveDayType(dateStr: string): DayType {
    const d = new Date(`${dateStr}T00:00:00`);
    const day = d.getDay();
    if (day === 0 || day === 6) {
      return DayType.WEEKEND;
    }
    return DayType.WEEKDAY;
  }

  private toMinutes(time: string): number {
    const [hh, mm] = time.split(':');
    return Number(hh) * 60 + Number(mm);
  }

  private normalizeTime(time: string): string {
    // Ensure HH:mm:ss for DB consistency
    const parts = time.split(':');
    const hh = parts[0].padStart(2, '0');
    const mm = (parts[1] ?? '00').padStart(2, '0');
    const ss = (parts[2] ?? '00').padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
}
