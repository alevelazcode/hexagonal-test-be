import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';

import { ProblemDetailsDto } from './errors/problem-details';

class HealthResponseDto {
  @ApiProperty({ enum: ['ok'] })
  status!: 'ok';
}

@ApiTags('Health')
@Controller()
export class HealthController {
  @ApiOperation({ summary: 'Health check' })
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiTooManyRequestsResponse({ type: ProblemDetailsDto })
  @Get()
  getHealth(): HealthResponseDto {
    return { status: 'ok' };
  }
}
