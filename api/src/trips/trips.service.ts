import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import type { AddTripPlaceDto, CreateTripDto, UpdateTripDto } from './dto/trips.dto';
import { isDuplicatePlace } from './place-duplicate';

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async create(user: AuthUser, dto: CreateTripDto) {
    await this.users.ensureFromJwt(user);
    return this.prisma.trip.create({
      data: {
        userId: user.userId,
        name: dto.name,
        destination: dto.destination,
      },
      include: { places: true, days: true },
    });
  }

  async list(user: AuthUser) {
    await this.users.ensureFromJwt(user);
    return this.prisma.trip.findMany({
      where: { userId: user.userId },
      orderBy: { updatedAt: 'desc' },
      include: { places: true, days: { orderBy: { dayNumber: 'asc' } } },
    });
  }

  async get(user: AuthUser, id: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id, userId: user.userId },
      include: {
        places: { orderBy: { createdAt: 'asc' } },
        days: {
          orderBy: { dayNumber: 'asc' },
          include: {
            places: { orderBy: { sortOrder: 'asc' }, include: { place: true } },
            legs: true,
          },
        },
      },
    });
    if (!trip) throw new NotFoundException('ไม่พบทริป');
    return trip;
  }

  async update(user: AuthUser, id: string, dto: UpdateTripDto) {
    await this.get(user, id);
    return this.prisma.trip.update({
      where: { id },
      data: {
        name: dto.name,
        destination: dto.destination,
        wizardStep: dto.wizardStep,
      },
      include: { places: true, days: true },
    });
  }

  async addPlace(user: AuthUser, tripId: string, dto: AddTripPlaceDto) {
    const trip = await this.get(user, tripId);
    const dup = trip.places.some((p) =>
      isDuplicatePlace(p, { name: dto.name, lat: dto.lat, lng: dto.lng }),
    );
    if (dup) {
      throw new BadRequestException('สถานที่นี้มีในทริปแล้ว');
    }
    return this.prisma.tripPlace.create({
      data: {
        tripId,
        name: dto.name,
        address: dto.address,
        lat: dto.lat,
        lng: dto.lng,
        source: dto.source,
        sourceUrl: dto.sourceUrl,
        category: dto.category,
        notes: dto.notes,
      },
    });
  }

  async removePlace(user: AuthUser, tripId: string, placeId: string) {
    await this.get(user, tripId);
    const place = await this.prisma.tripPlace.findFirst({
      where: { id: placeId, tripId },
    });
    if (!place) throw new NotFoundException('ไม่พบสถานที่');
    await this.prisma.tripPlace.delete({ where: { id: placeId } });
    return { ok: true };
  }
}
