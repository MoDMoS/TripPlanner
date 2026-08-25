import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { ItineraryModule } from './itinerary/itinerary.module';
import { PlacesModule } from './places/places.module';
import { PrismaModule } from './prisma/prisma.module';
import { TripsModule } from './trips/trips.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    HealthModule,
    PlacesModule,
    TripsModule,
    ItineraryModule,
  ],
})
export class AppModule {}
