import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
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
