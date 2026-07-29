import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { EstablishmentTier, EstablishmentType } from '@prisma/client';

export class CreateStoreDto {
  @IsString() name!: string;
  @IsEnum(EstablishmentType) type!: EstablishmentType;
  @Type(() => Number) @IsNumber() lat!: number;
  @Type(() => Number) @IsNumber() lng!: number;
  @IsString() address!: string;
  @IsOptional() @IsEnum(EstablishmentTier) membershipTier?: EstablishmentTier;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsString() contactEmail?: string;
  @IsOptional() @IsBoolean() authorized?: boolean;
}

export class UpdateStoreDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEnum(EstablishmentType) type?: EstablishmentType;
  @IsOptional() @Type(() => Number) @IsNumber() lat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() lng?: number;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsEnum(EstablishmentTier) membershipTier?: EstablishmentTier;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsString() contactEmail?: string;
  @IsOptional() @IsBoolean() authorized?: boolean;
}
