import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user.type';
import { AddTripPlaceDto, CreateTripDto, UpdateTripDto } from './dto/trips.dto';
import { TripsService } from './trips.service';

@Controller('trips')
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTripDto) {
    return this.trips.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.trips.list(user);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.trips.get(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.trips.update(user, id, dto);
  }

  @Post(':id/places')
  addPlace(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AddTripPlaceDto,
  ) {
    return this.trips.addPlace(user, id, dto);
  }

  @Delete(':id/places/:placeId')
  removePlace(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('placeId') placeId: string,
  ) {
    return this.trips.removePlace(user, id, placeId);
  }
}
