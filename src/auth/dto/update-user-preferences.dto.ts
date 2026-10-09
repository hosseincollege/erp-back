import { IsIn, IsString, Matches } from 'class-validator';

const supportedLocales = [
  'fa',
  'en',
  'ar',
  'zh-CN',
  'fr',
  'es',
  'de',
  'ru',
  'ja',
  'pt-BR',
];
const contrastLevels = ['soft', 'balanced', 'strong'];

export class UpdateUserPreferencesDto {
  @IsString()
  @IsIn(supportedLocales)
  locale: string;

  @IsString()
  @Matches(/^(blue|green|red|amber|violet|#[0-9a-fA-F]{6})$/)
  accentColor: string;

  @IsString()
  @IsIn(contrastLevels)
  lightContrast: string;

  @IsString()
  @IsIn(contrastLevels)
  darkContrast: string;
}
