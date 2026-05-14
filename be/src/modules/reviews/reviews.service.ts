import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingStatus, UserRole } from '../../common/enums';
import { Booking } from '../bookings/entities/booking.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review } from './entities/review.entity';

interface AuthUser {
  id: string;
  role: UserRole;
}

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
  ) {}

  async create(customerId: string, dto: CreateReviewDto): Promise<Review> {
    const booking = await this.bookingRepo.findOne({
      where: { id: dto.bookingId },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.customerId !== customerId) {
      throw new ForbiddenException('You can only review your own bookings');
    }
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException(
        'You can only review a booking after it has been completed',
      );
    }

    const existing = await this.reviewRepo.findOne({
      where: { bookingId: dto.bookingId },
    });
    if (existing) {
      throw new ConflictException('This booking has already been reviewed');
    }

    const review = this.reviewRepo.create({
      customerId,
      fieldId: booking.fieldId,
      bookingId: booking.id,
      rating: dto.rating,
      comment: dto.comment,
    });
    return this.reviewRepo.save(review);
  }

  async findByField(fieldId: string) {
    const reviews = await this.reviewRepo
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.customer', 'customer')
      .where('review.fieldId = :fieldId', { fieldId })
      .orderBy('review.createdAt', 'DESC')
      .getMany();

    return reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      customer: r.customer
        ? {
            id: r.customer.id,
            fullName: r.customer.fullName,
            avatarUrl: r.customer.avatarUrl,
          }
        : null,
    }));
  }

  async getAverage(
    fieldId: string,
  ): Promise<{ average: number; count: number }> {
    const row = await this.reviewRepo
      .createQueryBuilder('review')
      .select('COALESCE(AVG(review.rating), 0)', 'avg')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.fieldId = :fieldId', { fieldId })
      .getRawOne<{ avg: string; count: string }>();

    return {
      average: Number(row?.avg ?? 0),
      count: Number(row?.count ?? 0),
    };
  }

  async remove(id: string, currentUser: AuthUser): Promise<{ message: string }> {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    if (
      currentUser.role !== UserRole.ADMIN &&
      review.customerId !== currentUser.id
    ) {
      throw new ForbiddenException('You can only delete your own reviews');
    }
    await this.reviewRepo.remove(review);
    return { message: 'Review deleted' };
  }
}
