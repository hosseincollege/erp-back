import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (config: ConfigService): JwtModuleOptions => {
        const jwtSecret = config.get<string>('JWT_SECRET');
        const expiresIn = Number(
          config.get<string>('JWT_EXPIRES_IN') ?? '86400',
        );

        if (!jwtSecret) {
          throw new Error('JWT_SECRET is not defined in .env');
        }

        if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
          throw new Error(
            'JWT_EXPIRES_IN must be a positive number in seconds',
          );
        }

        return {
          secret: jwtSecret,
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
  ],
  exports: [JwtModule],
})
export class AuthModule {}
