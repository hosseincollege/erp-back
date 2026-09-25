import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectDto } from './create-project.dto';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @IsOptional()
  @IsEnum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'])
  status?: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
}
