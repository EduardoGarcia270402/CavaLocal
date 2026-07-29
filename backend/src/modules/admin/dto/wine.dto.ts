import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateWineDto {
  @IsString() name!: string;
  @IsString() type!: string;
  @IsString() wineryName!: string;
  @IsString() origin!: string;
  @IsString() grape!: string;
  @Type(() => Number) @IsNumber() @Min(0) referencePrice!: number;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @Type(() => Number) @IsInt() vintage?: number;
  @IsOptional() @IsString() tastingNote?: string;
  @IsOptional() @IsString() pairing?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @Type(() => Number) @IsInt() criticScore?: number;
  @IsOptional() @IsBoolean() verified?: boolean;
}

export class UpdateWineDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() wineryName?: string;
  @IsOptional() @IsString() origin?: string;
  @IsOptional() @IsString() grape?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) referencePrice?: number;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @Type(() => Number) @IsInt() vintage?: number;
  @IsOptional() @IsString() tastingNote?: string;
  @IsOptional() @IsString() pairing?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @Type(() => Number) @IsInt() criticScore?: number;
  @IsOptional() @IsBoolean() verified?: boolean;
}
