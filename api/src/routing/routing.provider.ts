export type RoutingMode = 'walk' | 'drive' | 'bike';

export type RoutingMatrix = {
  durationsSec: number[][];
  distancesM: number[][];
};

export interface RoutingProvider {
  getMatrix(
    coords: { lat: number; lng: number }[],
    mode: RoutingMode,
  ): Promise<RoutingMatrix>;
}
