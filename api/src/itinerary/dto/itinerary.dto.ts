import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDayDto {
  @IsOptional()
  @IsString()
  title?: string;
}

export class PatchDayDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;
}

export class OrderDayDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  placeIds!: string[];
}

export class AssignPlaceDto {
  @IsString()
  placeId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  stayMinutes?: number;
}

export class MovePlaceDto {
  @IsString()
  toDayId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  index!: number;
}

export class ScheduleStayDto {
  @IsString()
  placeId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  stayMinutes!: number;
}

export class ScheduleLegDto {
  @IsString()
  toPlaceId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationSec!: number;

  @IsBoolean()
  isManualOverride!: boolean;
}

export class CalculateRouteDto {
  @IsOptional()
  @IsIn(['walk', 'drive', 'bike', 'transit'])
  transportMode?: 'walk' | 'drive' | 'bike' | 'transit';

  @IsOptional()
  @Matches(/^\d{1,2}:\d{2}$/)
  startTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  startLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  startLng?: number;
}

export class PatchScheduleDto {
  @Matches(/^\d{1,2}:\d{2}$/)
  startTime!: string;

  @IsOptional()
  @IsString()
  startLabel?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  startLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  startLng?: number;

  @IsIn(['walk', 'drive', 'bike', 'transit'])
  transportMode!: 'walk' | 'drive' | 'bike' | 'transit';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleStayDto)
  stays!: ScheduleStayDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleLegDto)
  legs?: ScheduleLegDto[];

  @IsOptional()
  @IsBoolean()
  acknowledgeWarnings?: boolean;
}
