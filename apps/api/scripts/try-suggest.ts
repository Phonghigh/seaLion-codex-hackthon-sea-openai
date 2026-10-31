import '../src/env';
import { connectDatabase } from '../src/db/client';
import { createPostgresStore } from '../src/store/postgres';
import { createDemoService } from '../src/demo/service';
import { createAgent } from '../src/ai/agent';

async function main() {
  // Check before connecting or resetting: a missing key must leave demo data intact.
  if (!process.env.OPENAI_API_KEY?.trim()) throw new Error('OPENAI_API_KEY is missing. Set it in apps/api/.env before running pnpm try:suggest. No data was changed.');
  if (!process.env.OPENAI_MODEL?.trim()) throw new Error('OPENAI_MODEL is required in apps/api/.env. No data was changed.');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in apps/api/.env. No data was changed.');
  const database = connectDatabase(process.env.DATABASE_URL);
  try {
    const store = createPostgresStore(database.db);
    const demo = createDemoService(store);
    await demo.reset('After Demo 1');
    await demo.advanceDay();
    const at = demo.clock.now().toISOString();
    // Scene 2 needs only the returning conversation and its customer message.
    const conversation = await store.createConversation({ customer_id: 'CUST001', case_id: null, channel: 'chat', mode: 'human', opened_at: at });
    await store.addMessage({ conversation_id: conversation.id, role: 'customer', actor: 'CUST001', created_at: at,
      text: 'Vụ thiếu mũ hôm qua vẫn chưa giải quyết. Tôi gửi ảnh rồi, giờ lại phải trình bày từ đầu à?',
    });
    const result = await createAgent(store, { now: () => demo.clock.now() }).suggest(conversation.id);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  } finally { await database.close(); }
}
main().catch(error => {
  console.error(error instanceof Error && /^(OPENAI_API_KEY|OPENAI_MODEL|DATABASE_URL)/.test(error.message)
    ? error.message : 'try:suggest failed. Check the database, migrations and model configuration.');
  process.exitCode = 1;
});
