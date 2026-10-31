const DAY = 86_400_000;

export class DemoClock {
  private base: number;
  private day = 0;

  constructor(today = new Date()) {
    const localDate = new Date(today.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
    this.base = Date.parse(`${localDate}T09:00:00+07:00`);
  }

  now(): Date { return new Date(this.base + this.day * DAY); }
  advance(): Date { this.day += 1; return this.now(); }
  reset(today = new Date()): void {
    this.base = new DemoClock(today).base;
    this.day = 0;
  }
  at(dayOffset: number, hour = 9, minute = 0): string {
    return new Date(this.now().getTime() + dayOffset * DAY + (hour - 9) * 3_600_000 + minute * 60_000).toISOString();
  }
}
