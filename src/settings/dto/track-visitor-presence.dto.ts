import { IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class TrackVisitorPresenceDto {
  @IsUUID('4')
  visitorId!: string;

  @IsOptional()
  @IsUUID('4')
  sessionId?: string;

  @IsOptional()
  @IsUUID('4')
  pageViewId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^\/[^\u0000-\u001f]*$/)
  path?: string;

  @IsOptional()
  @IsIn(['ENTER', 'HEARTBEAT', 'EXIT'])
  event?: 'ENTER' | 'HEARTBEAT' | 'EXIT';
}
