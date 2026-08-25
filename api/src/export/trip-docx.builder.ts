import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';

type PreviewDay = {
  dayNumber: number;
  title?: string | null;
  startTime: string;
  startLabel?: string | null;
  transportMode: string;
  schedule: {
    stops: Array<{
      name: string;
      arrive: string;
      depart: string;
      stayMinutes: number;
    }>;
    legs: Array<{ toPlaceId: string; durationSec: number }>;
    endTime: string;
    totalTravelSec: number;
    totalActivitySec: number;
  } | null;
  places: Array<{
    name: string;
    address?: string | null;
    lat: number;
    lng: number;
  }>;
};

export async function buildTripDocx(input: {
  tripName: string;
  destination?: string | null;
  placeCount: number;
  dayCount: number;
  totals: { totalTravelSec: number; totalActivitySec: number };
  days: PreviewDay[];
  mapPng?: Buffer | null;
}): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      text: input.tripName,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: input.destination
            ? `Destination: ${input.destination}`
            : 'Trip itinerary',
          italics: true,
        }),
      ],
    }),
    new Paragraph({
      text: `Days: ${input.dayCount} · Places: ${input.placeCount} · Travel: ${Math.round(input.totals.totalTravelSec / 60)} min · Activities: ${Math.round(input.totals.totalActivitySec / 60)} min`,
    }),
  ];

  if (input.mapPng?.length) {
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: input.mapPng,
            transformation: { width: 500, height: 280 },
            type: 'png',
          }),
        ],
      }),
    );
  }

  for (const day of input.days) {
    children.push(
      new Paragraph({
        text: `Day ${day.dayNumber}${day.title ? ` — ${day.title}` : ''}`,
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        text: `Start ${day.startTime}${day.startLabel ? ` from ${day.startLabel}` : ''} · Mode: ${day.transportMode}`,
      }),
    );

    if (day.schedule) {
      for (const stop of day.schedule.stops) {
        children.push(
          new Paragraph({
            text: `${stop.arrive}–${stop.depart}  ${stop.name} (${stop.stayMinutes} min)`,
          }),
        );
      }
      children.push(
        new Paragraph({
          text: `End ${day.schedule.endTime} · Travel ${Math.round(day.schedule.totalTravelSec / 60)} min`,
        }),
      );
    } else {
      for (const place of day.places) {
        children.push(
          new Paragraph({
            text: `${place.name}${place.address ? ` — ${place.address}` : ''} (${place.lat.toFixed(5)}, ${place.lng.toFixed(5)})`,
          }),
        );
      }
    }
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '© OpenStreetMap contributors',
          size: 18,
          color: '666666',
        }),
      ],
    }),
  );

  const doc = new Document({
    sections: [{ children }],
  });
  return Packer.toBuffer(doc);
}
