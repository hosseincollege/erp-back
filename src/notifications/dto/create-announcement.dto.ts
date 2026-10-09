import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const supportedLocales = [
  'fa', 'en', 'ar', 'zh-CN', 'fr', 'es', 'de', 'ru', 'ja', 'pt-BR',
];

export class CreateAnnouncementDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  summary?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(5000)
  body!: string;

  @IsIn(supportedLocales)
  locale!: string;

  @IsIn(['general', 'operations', 'finance', 'hr', 'technical'])
  category!: string;

  @IsIn(['normal', 'important', 'urgent'])
  priority!: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}
