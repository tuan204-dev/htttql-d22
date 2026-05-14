import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateBookingItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  serviceId: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateBookingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  fieldId: string;

  @ApiProperty({ example: '2026-05-20' })
  @IsDateString()
  bookingDate: string;

  @ApiProperty({ example: '18:00', description: 'HH:mm, must be multiple of 30 minutes' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):(00|30)$/, {
    message: 'startTime must be in HH:mm format and a multiple of 30 minutes',
  })
  startTime: string;

  @ApiProperty({ example: '20:00', description: 'HH:mm, must be multiple of 30 minutes' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):(00|30)$/, {
    message: 'endTime must be in HH:mm format and a multiple of 30 minutes',
  })
  endTime: string;

  @ApiPropertyOptional({ type: [CreateBookingItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CreateBookingItemDto)
  services?: CreateBookingItemDto[];

  @ApiPropertyOptional({ example: 'WELCOME10' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  promotionCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  note?: string;
}
