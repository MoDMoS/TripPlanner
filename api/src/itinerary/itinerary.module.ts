import { Module } from '@nestjs/common';
import { RoutingModule } from '../routing/routing.module';
import { TripsModule } from '../trips/trips.module';
import { ItineraryController } from './itinerary.controller';
import { ItineraryService } from './itinerary.service';

@Module({
  imports: [TripsModule, RoutingModule],
  controllers: [ItineraryController],
  providers: [ItineraryService],
  exports: [ItineraryService],
})
export class ItineraryModule {}
