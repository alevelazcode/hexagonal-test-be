import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

class HealthResponseDto {
  status!: 'ok';
}

@ApiTags('Health')
@Controller()
export class HealthController {
  @ApiOperation({ summary: 'Health check' })
  @ApiOkResponse({ type: HealthResponseDto })
  @Get()
  getHealth(): HealthResponseDto {
    return { status: 'ok' };
  }
}
