import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { RoutingService } from '../routing/routing.service';
import { TripsService } from '../trips/trips.service';
import { buildDaySchedule, validateSchedule } from './schedule.engine';

@Injectable()
export class ItineraryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
    private readonly routing: RoutingService,
  ) {}

  async createDay(user: AuthUser, tripId: string, title?: string) {
    await this.trips.get(user, tripId);
    const last = await this.prisma.tripDay.findFirst({
      where: { tripId },
      orderBy: { dayNumber: 'desc' },
    });
    const dayNumber = (last?.dayNumber ?? 0) + 1;
    return this.prisma.tripDay.create({
      data: { tripId, dayNumber, title: title ?? `Day ${dayNumber}` },
      include: { places: { include: { place: true } }, legs: true },
    });
  }

  async patchDay(
    user: AuthUser,
    tripId: string,
    dayId: string,
    data: { title?: string },
  ) {
    await this.requireDay(user, tripId, dayId);
    return this.prisma.tripDay.update({
      where: { id: dayId },
      data: { title: data.title },
    });
  }

  async deleteDay(user: AuthUser, tripId: string, dayId: string) {
    await this.requireDay(user, tripId, dayId);
    await this.prisma.tripDay.delete({ where: { id: dayId } });
    return { ok: true };
  }

  async setOrder(
    user: AuthUser,
    tripId: string,
    dayId: string,
    placeIds: string[],
  ) {
    await this.requireDay(user, tripId, dayId);
    const places = await this.prisma.tripPlace.findMany({
      where: { tripId, id: { in: placeIds } },
    });
    if (places.length !== placeIds.length) {
      throw new BadRequestException('placeIds ต้องอยู่ในทริปนี้ทั้งหมด');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.tripDayPlace.deleteMany({ where: { dayId } });
      for (let i = 0; i < placeIds.length; i += 1) {
        await tx.tripDayPlace.create({
          data: {
            dayId,
            placeId: placeIds[i],
            sortOrder: i,
          },
        });
      }
    });

    return this.prisma.tripDay.findUniqueOrThrow({
      where: { id: dayId },
      include: {
        places: { orderBy: { sortOrder: 'asc' }, include: { place: true } },
      },
    });
  }

  async assignPlace(
    user: AuthUser,
    tripId: string,
    dayId: string,
    placeId: string,
    stayMinutes = 60,
  ) {
    await this.requireDay(user, tripId, dayId);
    const place = await this.prisma.tripPlace.findFirst({
      where: { id: placeId, tripId },
    });
    if (!place) throw new NotFoundException('ไม่พบสถานที่');

    const count = await this.prisma.tripDayPlace.count({ where: { dayId } });
    return this.prisma.tripDayPlace.upsert({
      where: { dayId_placeId: { dayId, placeId } },
      create: { dayId, placeId, sortOrder: count, stayMinutes },
      update: { stayMinutes },
      include: { place: true },
    });
  }

  async removePlaceFromDay(
    user: AuthUser,
    tripId: string,
    dayId: string,
    placeId: string,
  ) {
    await this.requireDay(user, tripId, dayId);
    await this.prisma.tripDayPlace.deleteMany({ where: { dayId, placeId } });
    return { ok: true };
  }

  async movePlace(
    user: AuthUser,
    tripId: string,
    dayId: string,
    placeId: string,
    toDayId: string,
    index: number,
  ) {
    await this.requireDay(user, tripId, dayId);
    await this.requireDay(user, tripId, toDayId);

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.tripDayPlace.findUnique({
        where: { dayId_placeId: { dayId, placeId } },
      });
      const stayMinutes = existing?.stayMinutes ?? 60;
      await tx.tripDayPlace.deleteMany({ where: { placeId } });

      const target = await tx.tripDayPlace.findMany({
        where: { dayId: toDayId },
        orderBy: { sortOrder: 'asc' },
      });
      const ids = target.map((t) => t.placeId);
      const clamped = Math.max(0, Math.min(index, ids.length));
      ids.splice(clamped, 0, placeId);

      await tx.tripDayPlace.deleteMany({ where: { dayId: toDayId } });
      for (let i = 0; i < ids.length; i += 1) {
        await tx.tripDayPlace.create({
          data: {
            dayId: toDayId,
            placeId: ids[i],
            sortOrder: i,
            stayMinutes: ids[i] === placeId ? stayMinutes : 60,
          },
        });
      }
    });

    return this.trips.get(user, tripId);
  }

  async calculateDayRoute(
    user: AuthUser,
    tripId: string,
    dayId: string,
    opts?: {
      transportMode?: 'walk' | 'drive' | 'bike' | 'transit';
      startTime?: string;
      startLat?: number;
      startLng?: number;
    },
  ) {
    const day = await this.loadDayWithPlaces(user, tripId, dayId);
    const ordered = day.places;
    if (!ordered.length) {
      return {
        dayId,
        mode: day.transportMode,
        schedule: null,
        warnings: [],
        needsManual: false,
      };
    }

    const mode = (opts?.transportMode || day.transportMode || 'drive') as
      | 'walk'
      | 'drive'
      | 'bike'
      | 'transit';

    if (mode === 'transit') {
      return {
        dayId,
        mode,
        schedule: null,
        warnings: ['โหมดขนส่งสาธารณะต้องใส่เวลาเดินทางเอง'],
        needsManual: true,
      };
    }

    const startLat = opts?.startLat ?? day.startLat;
    const startLng = opts?.startLng ?? day.startLng;
    const startTime = opts?.startTime || day.startTime || '09:00';

    const placeCoords = ordered.map((row) => ({
      lat: row.place.lat,
      lng: row.place.lng,
    }));
    const routingPoints =
      startLat != null && startLng != null
        ? [{ lat: startLat, lng: startLng }, ...placeCoords]
        : placeCoords;

    const legsResult = await this.routing.getLegDurations({
      mode,
      points: routingPoints,
    });

    if (!legsResult) {
      return {
        dayId,
        mode,
        schedule: null,
        warnings: [
          'คำนวณเส้นทางไม่ได้ในตอนนี้ กรุณาใส่เวลาเดินทางเอง',
        ],
        needsManual: true,
      };
    }

    const durations =
      startLat != null && startLng != null
        ? legsResult.durationSec.slice(0, ordered.length)
        : [0, ...legsResult.durationSec].slice(0, ordered.length);

    const schedule = buildDaySchedule({
      startTime,
      places: ordered.map((row) => ({
        placeId: row.placeId,
        name: row.place.name,
        stayMinutes: row.stayMinutes,
      })),
      legsDurationSec: durations,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.tripDay.update({
        where: { id: dayId },
        data: {
          transportMode: mode,
          startTime,
          startLat: startLat ?? undefined,
          startLng: startLng ?? undefined,
        },
      });
      await tx.tripLeg.deleteMany({ where: { dayId } });
      for (let i = 0; i < schedule.legs.length; i += 1) {
        const leg = schedule.legs[i];
        await tx.tripLeg.create({
          data: {
            dayId,
            fromPlaceId: leg.fromPlaceId,
            toPlaceId: leg.toPlaceId,
            durationSec: leg.durationSec,
            distanceM:
              startLat != null && startLng != null
                ? (legsResult.distanceM[i] ?? null)
                : i === 0
                  ? 0
                  : (legsResult.distanceM[i - 1] ?? null),
            mode,
            isManualOverride: false,
          },
        });
      }
    });

    return {
      dayId,
      mode,
      schedule,
      warnings: [] as string[],
      needsManual: false,
    };
  }

  async saveSchedule(
    user: AuthUser,
    tripId: string,
    dayId: string,
    dto: {
      startTime: string;
      startLabel?: string;
      startLat?: number;
      startLng?: number;
      transportMode: 'walk' | 'drive' | 'bike' | 'transit';
      stays: { placeId: string; stayMinutes: number }[];
      legs?: {
        toPlaceId: string;
        durationSec: number;
        isManualOverride: boolean;
      }[];
      acknowledgeWarnings?: boolean;
    },
  ) {
    const day = await this.loadDayWithPlaces(user, tripId, dayId);
    const ordered = day.places;
    const stayMap = new Map(dto.stays.map((s) => [s.placeId, s.stayMinutes]));

    for (const row of ordered) {
      if (!stayMap.has(row.placeId)) {
        throw new BadRequestException(`ขาด stayMinutes ของ ${row.placeId}`);
      }
    }

    let durations: number[] = [];
    const legMeta = new Map(
      (dto.legs ?? []).map((l) => [l.toPlaceId, l] as const),
    );

    if (dto.transportMode === 'transit') {
      for (const row of ordered) {
        const leg = legMeta.get(row.placeId);
        if (!leg) {
          throw new BadRequestException(
            'โหมดขนส่งสาธารณะต้องใส่เวลาเดินทางทุกช่วง',
          );
        }
        durations.push(leg.durationSec);
      }
    } else {
      // Prefer manual legs when provided; else recalculate
      const allManual =
        ordered.every((row) => legMeta.get(row.placeId)?.isManualOverride) &&
        ordered.length > 0;
      if (allManual || (dto.legs && dto.legs.length === ordered.length)) {
        durations = ordered.map((row) => {
          const leg = legMeta.get(row.placeId);
          if (!leg) {
            throw new BadRequestException('ขาเดินทางไม่ครบ');
          }
          return leg.durationSec;
        });
      } else {
        const points: { lat: number; lng: number }[] = [];
        if (dto.startLat != null && dto.startLng != null) {
          points.push({ lat: dto.startLat, lng: dto.startLng });
        } else if (ordered[0]) {
          points.push({ lat: ordered[0].place.lat, lng: ordered[0].place.lng });
        }
        for (let i = dto.startLat != null ? 0 : 1; i < ordered.length; i += 1) {
          points.push({ lat: ordered[i].place.lat, lng: ordered[i].place.lng });
        }
        const routed = await this.routing.getLegDurations({
          mode: dto.transportMode,
          points:
            dto.startLat != null && dto.startLng != null
              ? [
                  { lat: dto.startLat, lng: dto.startLng },
                  ...ordered.map((r) => ({
                    lat: r.place.lat,
                    lng: r.place.lng,
                  })),
                ]
              : [
                  { lat: ordered[0].place.lat, lng: ordered[0].place.lng },
                  ...ordered.slice(1).map((r) => ({
                    lat: r.place.lat,
                    lng: r.place.lng,
                  })),
                ],
        });
        if (!routed) {
          throw new BadRequestException(
            'คำนวณเส้นทางไม่ได้ กรุณาใส่เวลาเดินทางเอง',
          );
        }
        durations =
          dto.startLat != null && dto.startLng != null
            ? routed.durationSec
            : [0, ...routed.durationSec];
        durations = durations.slice(0, ordered.length);
        // Apply manual overrides on top
        for (let i = 0; i < ordered.length; i += 1) {
          const override = legMeta.get(ordered[i].placeId);
          if (override?.isManualOverride) {
            durations[i] = override.durationSec;
          }
        }
      }
    }

    const schedule = buildDaySchedule({
      startTime: dto.startTime,
      places: ordered.map((row) => ({
        placeId: row.placeId,
        name: row.place.name,
        stayMinutes: stayMap.get(row.placeId) ?? row.stayMinutes,
      })),
      legsDurationSec: durations,
    });

    const validation = validateSchedule({ legsDurationSec: durations });
    if (validation.errors.length && !dto.acknowledgeWarnings) {
      throw new BadRequestException({
        message: validation.errors.join('; '),
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }
    if (validation.warnings.length && !dto.acknowledgeWarnings) {
      throw new BadRequestException({
        message: validation.warnings.join('; '),
        errors: validation.errors,
        warnings: validation.warnings,
        needsAcknowledge: true,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.tripDay.update({
        where: { id: dayId },
        data: {
          startTime: dto.startTime,
          startLabel: dto.startLabel,
          startLat: dto.startLat,
          startLng: dto.startLng,
          transportMode: dto.transportMode,
        },
      });
      for (const row of ordered) {
        await tx.tripDayPlace.update({
          where: { dayId_placeId: { dayId, placeId: row.placeId } },
          data: { stayMinutes: stayMap.get(row.placeId) ?? row.stayMinutes },
        });
      }
      await tx.tripLeg.deleteMany({ where: { dayId } });
      for (let i = 0; i < schedule.legs.length; i += 1) {
        const leg = schedule.legs[i];
        const override = legMeta.get(leg.toPlaceId);
        await tx.tripLeg.create({
          data: {
            dayId,
            fromPlaceId: leg.fromPlaceId,
            toPlaceId: leg.toPlaceId,
            durationSec: durations[i],
            mode: dto.transportMode,
            isManualOverride:
              dto.transportMode === 'transit' ||
              Boolean(override?.isManualOverride),
            warning: validation.warnings[i] ?? null,
          },
        });
      }
    });

    return {
      schedule,
      warnings: validation.warnings,
      errors: validation.errors,
      day: await this.loadDayWithPlaces(user, tripId, dayId),
    };
  }

  private async loadDayWithPlaces(
    user: AuthUser,
    tripId: string,
    dayId: string,
  ) {
    await this.trips.get(user, tripId);
    const day = await this.prisma.tripDay.findFirst({
      where: { id: dayId, tripId },
      include: {
        places: {
          orderBy: { sortOrder: 'asc' },
          include: { place: true },
        },
        legs: true,
      },
    });
    if (!day) throw new NotFoundException('ไม่พบวันในทริป');
    return day;
  }

  private async requireDay(user: AuthUser, tripId: string, dayId: string) {
    await this.trips.get(user, tripId);
    const day = await this.prisma.tripDay.findFirst({
      where: { id: dayId, tripId },
    });
    if (!day) throw new NotFoundException('ไม่พบวันในทริป');
    return day;
  }
}
