import { Body, Controller, Post } from '@nestjs/common';
import { ResolveLinkDto, SearchPlacesDto } from './dto/places.dto';
import { PlaceLinkResolveService } from './place-link-resolve.service';
import { PlaceSearchService } from './place-search.service';

@Controller('places')
export class PlacesController {
  constructor(
    private readonly linkResolve: PlaceLinkResolveService,
    private readonly search: PlaceSearchService,
  ) {}

  @Post('resolve-link')
  resolveLink(@Body() dto: ResolveLinkDto) {
    return this.linkResolve.resolve(dto.url);
  }

  @Post('search')
  searchPlaces(@Body() dto: SearchPlacesDto) {
    return this.search.search(dto);
  }
}
