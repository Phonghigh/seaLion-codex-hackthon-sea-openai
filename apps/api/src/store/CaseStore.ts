export interface DemoState { day: number; now: string; scene: 'start' | 'demo2' | 'advanced' }
/** Demo mutations own their transaction and return only after commit. */
export interface CaseStore {
  reset(): Promise<DemoState>;
  jump(to: 'demo2'): Promise<DemoState>;
  advanceDay(): Promise<DemoState>;
}
