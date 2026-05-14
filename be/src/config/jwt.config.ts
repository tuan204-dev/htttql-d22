import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export const jwtConfig = (configService: ConfigService): JwtModuleOptions => ({
  secret: configService.get<string>('JWT_SECRET', 'change_me_super_secret'),
  signOptions: {
    expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1d') as any,
  },
});

export const jwtRefreshConfig = (
  configService: ConfigService,
): JwtModuleOptions => ({
  secret: configService.get<string>(
    'JWT_REFRESH_SECRET',
    'change_me_refresh_secret',
  ),
  signOptions: {
    expiresIn: configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    ) as any,
  },
});
