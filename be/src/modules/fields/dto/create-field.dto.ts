import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { FieldStatus, FieldSurface, FieldType } from '../../../common/enums';

export class CreateFieldDto {
  @ApiProperty({ example: 'Sân số 1', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: FieldType })
  @IsEnum(FieldType)
  type: FieldType;

  @ApiProperty({ enum: FieldSurface })
  @IsEnum(FieldSurface)
  surface: FieldSurface;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: FieldStatus })
  @IsOptional()
  @IsEnum(FieldStatus)
  status?: FieldStatus;

  @ApiProperty({ example: '123 Đường ABC, Quận 1, TP.HCM', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address: string;

  @ApiPropertyOptional({ example: '06:00', description: 'HH:mm or HH:mm:ss' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
    message: 'openTime must match HH:mm or HH:mm:ss',
  })
  openTime?: string;

  @ApiPropertyOptional({ example: '23:00', description: 'HH:mm or HH:mm:ss' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
    message: 'closeTime must match HH:mm or HH:mm:ss',
  })
  closeTime?: string;
}
