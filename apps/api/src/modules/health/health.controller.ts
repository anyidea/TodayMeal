import { Controller, Get } from '@nestjs/common';
import { ok } from '../../common/api-response';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return ok({ status: 'ok' });
  }
}
