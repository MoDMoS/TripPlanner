import { IsNumber, IsOptional, IsString, IsUrl, Max, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class ResolveLinkDto {
  @IsUrl({ require_tld: false })
  url!: string;
}

export class SearchPlacesDto {
  @IsString()
  @MinLength(1)
  query!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number;
}
