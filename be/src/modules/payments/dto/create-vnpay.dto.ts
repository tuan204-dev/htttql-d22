import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, IsString, IsUUID, IsUrl } from 'class-validator';

export class CreateVnpayDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  bookingId: string;

  /**
   * Optional explicit amount in VND. When omitted, the service computes
   * the unpaid balance from the booking itself (safer against tampering).
   */
  @ApiPropertyOptional({ description: 'Amount in VND (defaults to booking unpaid balance)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  returnUrl?: string;
}
