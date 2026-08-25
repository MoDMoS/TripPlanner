import { Module } from '@nestjs/common';
import { CacheService } from '../common/cache/cache.service';
import { NominatimClient } from './nominatim.client';
import { PhotonClient } from './photon.client';
import { PlaceLinkResolveService } from './place-link-resolve.service';
import { PlaceSearchService } from './place-search.service';
import { PlacesController } from './places.controller';

@Module({
  controllers: [PlacesController],
  providers: [
    CacheService,
    NominatimClient,
    PhotonClient,
    PlaceLinkResolveService,
    PlaceSearchService,
  ],
  exports: [PlaceLinkResolveService, PlaceSearchService, CacheService],
})
export class PlacesModule {}
