import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance: string;
  errorCode: string;
  correlationId: string;
  errors?: Record<string, string[]>;
}

export class ProblemDetailsDto implements ProblemDetails {
  @ApiProperty({ example: 'about:blank' })
  type!: string;

  @ApiProperty({ example: 'Bad Request' })
  title!: string;

  @ApiProperty({ example: 400 })
  status!: number;

  @ApiPropertyOptional({ example: 'Validation failed' })
  detail?: string;

  @ApiProperty({ example: '/api/v1/auth/login' })
  instance!: string;

  @ApiProperty({ example: 'http_bad_request' })
  errorCode!: string;

  @ApiProperty({ example: '2b2a9f4a-0e14-4f56-aab2-2f5b1b1241d1' })
  correlationId!: string;

  @ApiPropertyOptional({
    type: Object,
    example: { _errors: ['email must be an email'] },
  })
  errors?: Record<string, string[]>;
}
