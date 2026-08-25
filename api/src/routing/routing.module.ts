import { Module } from '@nestjs/common';
import { RouteCacheService } from '../common/cache/cache.service';
import { OsrmRoutingProvider } from './osrm.routing.provider';
import { RoutingService } from './routing.service';

@Module({
  providers: [OsrmRoutingProvider, RoutingService, RouteCacheService],
  exports: [RoutingService],
})
export class RoutingModule {}
