import { IsString, IsNotEmpty, IsOptional, IsArray, IsEnum } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  memberUserIds?: string[];
}
