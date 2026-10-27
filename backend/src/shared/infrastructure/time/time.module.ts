import { Global, Module } from '@nestjs/common';
import { Clock } from '../../application/time/clock.js';
import { SystemClock } from './system-clock.js';

@Global()
@Module({
  providers: [{ provide: Clock, useClass: SystemClock }],
  exports: [Clock],
})
export class TimeModule {}
