import type { DatabaseState, DbRows, DbTable } from '@seapilot/contracts';

export type NewRow<K extends DbTable> = Omit<DbRows[K], 'id'> & { id?: string };
export interface CaseStore {
  health(): Promise<boolean>;
  get<K extends DbTable>(table: K, id: string): Promise<DbRows[K] | undefined>;
  list<K extends DbTable>(table: K, filter?: Partial<DbRows[K]>): Promise<DbRows[K][]>;
  createConversation(row: NewRow<'conversations'>): Promise<DbRows['conversations']>;
  addMessage(row: NewRow<'messages'>): Promise<DbRows['messages']>;
  addEvidence(row: NewRow<'evidence'>): Promise<DbRows['evidence']>;
  createCase(row: NewRow<'cases'>): Promise<DbRows['cases']>;
  linkConversation(conversationId: string, caseId: string, actor: string, at: string): Promise<void>;
  addEvent(row: NewRow<'case_events'>): Promise<DbRows['case_events']>;
  createTask(row: NewRow<'tasks'>): Promise<DbRows['tasks']>;
  updateShipment(id: string, patch: Partial<Omit<DbRows['shipments'], 'id'>>): Promise<DbRows['shipments']>;
  updateCase(id: string, patch: Partial<Omit<DbRows['cases'], 'id'>>): Promise<DbRows['cases']>;
  resetTo(state: DatabaseState): Promise<void>;
  transaction<T>(work: (store: CaseStore) => Promise<T>): Promise<T>;
}
