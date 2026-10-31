import { connectDatabase } from './client';
import { readConfig } from '../config';
import { createCaseStore } from '../store/postgres';
const { client, db } = connectDatabase(readConfig().databaseUrl);
try { console.log(JSON.stringify({ ok: true, ...await createCaseStore(db).reset() })); }
finally { await client.end(); }
