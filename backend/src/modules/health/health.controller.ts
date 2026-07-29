import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService, HealthStatus } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Estado del servicio y conexión a la base de datos' })
  check(): Promise<HealthStatus> {
    return this.healthService.check();
  }

  @Get('live')
  live() {
    return { status: 'ok', uptime: Math.floor(process.uptime()) };
  }

  @Get('ready')
  async ready(@Res({ passthrough: true }) response: Response): Promise<HealthStatus> {
    const status = await this.healthService.check();
    if (status.status !== 'ok') response.status(503);
    return status;
  }
}
