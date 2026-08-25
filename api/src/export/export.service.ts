import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.type';
import { ItineraryService } from '../itinerary/itinerary.service';
import { buildTripDocx } from './trip-docx.builder';

@Injectable()
export class ExportService {
  constructor(private readonly itinerary: ItineraryService) {}

  async exportDocx(user: AuthUser, tripId: string, mapPngBase64?: string) {
    const preview = await this.itinerary.preview(user, tripId);
    let mapPng: Buffer | null = null;
    if (mapPngBase64) {
      const raw = mapPngBase64.includes(',')
        ? mapPngBase64.split(',')[1]
        : mapPngBase64;
      mapPng = Buffer.from(raw, 'base64');
    }
    const buffer = await buildTripDocx({
      tripName: preview.trip.name,
      destination: preview.trip.destination,
      placeCount: preview.trip.placeCount,
      dayCount: preview.trip.dayCount,
      totals: preview.totals,
      days: preview.days,
      mapPng,
    });
    const filename = `${preview.trip.name.replace(/[^\w\-]+/g, '_') || 'trip'}.docx`;
    return { buffer, filename };
  }
}
