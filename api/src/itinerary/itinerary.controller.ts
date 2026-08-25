import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user.type';
import {
  AssignPlaceDto,
  CreateDayDto,
  MovePlaceDto,
  OrderDayDto,
  PatchDayDto,
  PatchScheduleDto,
  CalculateRouteDto,
} from './dto/itinerary.dto';
import { ItineraryService } from './itinerary.service';

@Controller('trips/:tripId')
export class ItineraryController {
  constructor(private readonly itinerary: ItineraryService) {}

  @Post('days')
  createDay(
    @CurrentUser() user: AuthUser,
    @Param('tripId') tripId: string,
    @Body() dto: CreateDayDto,
  ) {
    return this.itinerary.createDay(user, tripId, dto.title);
  }

  @Patch('days/:dayId')
  patchDay(
    @CurrentUser() user: AuthUser,
    @Param('tripId') tripId: string,
    @Param('dayId') dayId: string,
    @Body() dto: PatchDayDto,
  ) {
    return this.itinerary.patchDay(user, tripId, dayId, dto);
  }

  @Delete('days/:dayId')
  deleteDay(
    @CurrentUser() user: AuthUser,
    @Param('tripId') tripId: string,
    @Param('dayId') dayId: string,
  ) {
    return this.itinerary.deleteDay(user, tripId, dayId);
  }

  @Patch('days/:dayId/order')
  setOrder(
    @CurrentUser() user: AuthUser,
    @Param('tripId') tripId: string,
    @Param('dayId') dayId: string,
    @Body() dto: OrderDayDto,
  ) {
    return this.itinerary.setOrder(user, tripId, dayId, dto.placeIds);
  }

  @Post('days/:dayId/places')
  assignPlace(
    @CurrentUser() user: AuthUser,
    @Param('tripId') tripId: string,
    @Param('dayId') dayId: string,
    @Body() dto: AssignPlaceDto,
  ) {
    return this.itinerary.assignPlace(
      user,
      tripId,
      dayId,
      dto.placeId,
      dto.stayMinutes,
    );
  }

  @Delete('days/:dayId/places/:placeId')
  removePlace(
    @CurrentUser() user: AuthUser,
    @Param('tripId') tripId: string,
    @Param('dayId') dayId: string,
    @Param('placeId') placeId: string,
  ) {
    return this.itinerary.removePlaceFromDay(user, tripId, dayId, placeId);
  }

  @Post('days/:dayId/places/:placeId/move')
  movePlace(
    @CurrentUser() user: AuthUser,
    @Param('tripId') tripId: string,
    @Param('dayId') dayId: string,
    @Param('placeId') placeId: string,
    @Body() dto: MovePlaceDto,
  ) {
    return this.itinerary.movePlace(
      user,
      tripId,
      dayId,
      placeId,
      dto.toDayId,
      dto.index,
    );
  }

  @Post('days/:dayId/route/calculate')
  calculateRoute(
    @CurrentUser() user: AuthUser,
    @Param('tripId') tripId: string,
    @Param('dayId') dayId: string,
    @Body() dto: CalculateRouteDto,
  ) {
    return this.itinerary.calculateDayRoute(user, tripId, dayId, dto);
  }

  @Patch('days/:dayId/schedule')
  saveSchedule(
    @CurrentUser() user: AuthUser,
    @Param('tripId') tripId: string,
    @Param('dayId') dayId: string,
    @Body() dto: PatchScheduleDto,
  ) {
    return this.itinerary.saveSchedule(user, tripId, dayId, dto);
  }
}
