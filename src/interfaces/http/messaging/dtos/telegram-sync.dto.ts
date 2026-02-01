import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class TelegramSyncDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  timeoutSeconds?: number;
}
