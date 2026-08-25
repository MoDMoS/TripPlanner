import { Module } from '@nestjs/common';
import { ItineraryModule } from '../itinerary/itinerary.module';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

@Module({
  imports: [ItineraryModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
