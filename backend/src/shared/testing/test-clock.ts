import { Clock } from '../application/time/clock.js';

export const TEST_NOW = new Date('2026-10-27T12:00:00Z');

export class FixedClock extends Clock {
  constructor(private readonly instant: Date = TEST_NOW) {
    super();
  }

  now(): Date {
    return this.instant;
  }
}
