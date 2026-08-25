import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { TripsService } from '../trips/trips.service';

@Injectable()
export class ItineraryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
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

  private async requireDay(user: AuthUser, tripId: string, dayId: string) {
    await this.trips.get(user, tripId);
    const day = await this.prisma.tripDay.findFirst({
      where: { id: dayId, tripId },
    });
    if (!day) throw new NotFoundException('ไม่พบวันในทริป');
    return day;
  }
}
