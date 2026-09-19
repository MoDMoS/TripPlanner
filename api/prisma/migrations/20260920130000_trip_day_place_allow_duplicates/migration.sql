-- Allow the same place more than once per day
DROP INDEX IF EXISTS "TripDayPlace_dayId_placeId_key";

CREATE INDEX "TripDayPlace_dayId_placeId_idx" ON "TripDayPlace"("dayId", "placeId");
