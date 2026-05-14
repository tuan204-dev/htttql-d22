import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectBookingDto {
  @ApiProperty({ example: 'Customer did not pay deposit in time' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
