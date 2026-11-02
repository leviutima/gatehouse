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

export class ManualClock extends Clock {
  private instant: Date;

  constructor(start: Date = TEST_NOW) {
    super();
    this.instant = start;
  }

  now(): Date {
    return this.instant;
  }

  advance(seconds: number): void {
    this.instant = new Date(this.instant.getTime() + seconds * 1000);
  }
}
