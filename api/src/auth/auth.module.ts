import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { JwtCookieGuard } from './jwt-cookie.guard';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('AUTH_SECRET'),
      }),
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtCookieGuard,
    },
  ],
  exports: [JwtModule],
})
export class AuthModule {}
