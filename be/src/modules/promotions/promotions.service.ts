import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { DiscountType } from '../../common/enums';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { ValidatePromotionDto } from './dto/validate-promotion.dto';
import { Promotion } from './entities/promotion.entity';

export interface PromotionValidationResult {
  valid: boolean;
  discountAmount: number;
  promotion?: Promotion;
  reason?: string;
}

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
  ) {}

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * Apply promotion to amount. Returns the discount value, capped at the amount.
   */
  calculateDiscount(promotion: Promotion, amount: number): number {
    const value = Number(promotion.discountValue);
    let discount = 0;

    if (promotion.discountType === DiscountType.PERCENT) {
      discount = (amount * value) / 100;
    } else {
      discount = value;
    }

    if (discount < 0) discount = 0;
    if (discount > amount) discount = amount;

    return Math.round(discount);
  }

  /**
   * Validate a promo code against a target order amount. Does NOT mutate usedCount.
   */
  async validate(dto: ValidatePromotionDto): Promise<PromotionValidationResult> {
    const promo = await this.promotionRepository.findOne({
      where: { code: dto.code.trim() },
    });

    if (!promo) {
      return { valid: false, discountAmount: 0, reason: 'Promotion not found' };
    }

    if (!promo.isActive) {
      return {
        valid: false,
        discountAmount: 0,
        promotion: promo,
        reason: 'Promotion is inactive',
      };
    }

    const today = this.todayIso();
    if (promo.startDate > today) {
      return {
        valid: false,
        discountAmount: 0,
        promotion: promo,
        reason: 'Promotion has not started yet',
      };
    }
    if (promo.endDate < today) {
      return {
        valid: false,
        discountAmount: 0,
        promotion: promo,
        reason: 'Promotion has expired',
      };
    }

    if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
      return {
        valid: false,
        discountAmount: 0,
        promotion: promo,
        reason: 'Promotion usage limit reached',
      };
    }

    const minOrder = Number(promo.minOrder);
    if (minOrder > 0 && dto.amount < minOrder) {
      return {
        valid: false,
        discountAmount: 0,
        promotion: promo,
        reason: `Order amount must be at least ${minOrder}`,
      };
    }

    const discountAmount = this.calculateDiscount(promo, dto.amount);

    return {
      valid: true,
      discountAmount,
      promotion: promo,
    };
  }

  async findAll(activeOnly = true): Promise<Promotion[]> {
    if (!activeOnly) {
      return this.promotionRepository.find({
        order: { startDate: 'DESC' },
      });
    }

    const today = this.todayIso();
    return this.promotionRepository.find({
      where: {
        isActive: true,
        startDate: LessThanOrEqual(today),
        endDate: MoreThanOrEqual(today),
      },
      order: { startDate: 'DESC' },
    });
  }

  async findById(id: string): Promise<Promotion> {
    const promo = await this.promotionRepository.findOne({ where: { id } });
    if (!promo) {
      throw new NotFoundException('Promotion not found');
    }
    return promo;
  }

  async findByCode(code: string): Promise<Promotion | null> {
    return this.promotionRepository.findOne({ where: { code: code.trim() } });
  }

  async create(dto: CreatePromotionDto): Promise<Promotion> {
    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('endDate must be on or after startDate');
    }

    const existing = await this.promotionRepository.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException('Promotion code already exists');
    }

    const promo = this.promotionRepository.create({
      code: dto.code,
      description: dto.description ?? '',
      discountType: dto.discountType,
      discountValue: String(dto.discountValue),
      minOrder: dto.minOrder !== undefined ? String(dto.minOrder) : '0',
      startDate: dto.startDate,
      endDate: dto.endDate,
      usageLimit: dto.usageLimit ?? null,
      usedCount: 0,
      isActive: true,
    });

    return this.promotionRepository.save(promo);
  }

  async update(id: string, dto: UpdatePromotionDto): Promise<Promotion> {
    const promo = await this.findById(id);

    if (dto.code && dto.code !== promo.code) {
      const exists = await this.promotionRepository.findOne({
        where: { code: dto.code },
      });
      if (exists && exists.id !== id) {
        throw new ConflictException('Promotion code already exists');
      }
      promo.code = dto.code;
    }

    if (dto.description !== undefined) promo.description = dto.description;
    if (dto.discountType !== undefined) promo.discountType = dto.discountType;
    if (dto.discountValue !== undefined)
      promo.discountValue = String(dto.discountValue);
    if (dto.minOrder !== undefined) promo.minOrder = String(dto.minOrder);
    if (dto.startDate !== undefined) promo.startDate = dto.startDate;
    if (dto.endDate !== undefined) promo.endDate = dto.endDate;
    if (dto.usageLimit !== undefined) promo.usageLimit = dto.usageLimit;
    if (dto.isActive !== undefined) promo.isActive = dto.isActive;

    if (promo.endDate < promo.startDate) {
      throw new BadRequestException('endDate must be on or after startDate');
    }

    return this.promotionRepository.save(promo);
  }

  async remove(id: string): Promise<{ message: string }> {
    const promo = await this.findById(id);
    promo.isActive = false;
    await this.promotionRepository.save(promo);
    return { message: 'Promotion deactivated' };
  }
}
