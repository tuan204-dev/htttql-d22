import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class DateRangeDto {
  @ApiPropertyOptional({
    description: 'Start date (YYYY-MM-DD). Defaults to 30 days ago.',
    example: '2026-04-14',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'End date (YYYY-MM-DD). Defaults to today.',
    example: '2026-05-14',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Group revenue series by day | month | field (revenue endpoint only).',
    enum: ['day', 'month', 'field'],
  })
  @IsOptional()
  @IsIn(['day', 'month', 'field'])
  groupBy?: 'day' | 'month' | 'field';
}

/**
 * Resolve the optional from/to inputs to concrete YYYY-MM-DD strings using
 * a 30-day default window ending today.
 */
export function resolveDateRange(input: DateRangeDto): {
  from: string;
  to: string;
} {
  const today = new Date();
  const defaultFrom = new Date(today);
  defaultFrom.setDate(defaultFrom.getDate() - 30);

  const toIso = (d: Date) => d.toISOString().slice(0, 10);

  return {
    from: input.from ?? toIso(defaultFrom),
    to: input.to ?? toIso(today),
  };
}
