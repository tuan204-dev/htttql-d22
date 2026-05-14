import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Matches,
} from 'class-validator';
import { DayType } from '../../../common/enums';

export class CreatePriceDto {
  @ApiProperty({ enum: DayType })
  @IsEnum(DayType)
  dayType: DayType;

  @ApiProperty({ example: '06:00' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
    message: 'startTime must match HH:mm or HH:mm:ss',
  })
  startTime: string;

  @ApiProperty({ example: '17:00' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
    message: 'endTime must match HH:mm or HH:mm:ss',
  })
  endTime: string;

  @ApiProperty({ example: 200000, minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  pricePerHour: number;
}
