import '../src/env';
import OpenAI from 'openai';
import { triage } from '../src/ai/triage';

async function main() {
  const model = process.env.TRIAGE_MODEL?.trim() || process.env.OPENAI_MODEL?.trim();
  if (!process.env.OPENAI_API_KEY?.trim() || !model) {
    console.error('Set OPENAI_API_KEY and OPENAI_MODEL (or TRIAGE_MODEL) in apps/api/.env. No request was sent.');
    process.exitCode = 1;
    return;
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, project: process.env.OPENAI_PROJECT_ID?.trim() || undefined, maxRetries: 0 });
  let completed = false;
  const result = await triage('Where is my order DH002?', {
    open_case_exists: false, has_attachment: false, language: 'en', order_id: 'DH002',
    shipments: [{ parcel_code: 'A', status: 'in_transit' }],
  }, { model, client: { responses: { create: async (body, options) => {
    const response = await client.responses.create(body, options);
    completed = response.status === 'completed';
    return response;
  } } } });
  if (!completed || result.category_confidence === 0) {
    console.error('Triage did not return a usable classification. Check the project key, model access, billing and network. No replies or database changes were made.');
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify({ ok: true, detection_only: true, triage: result }, null, 2));
}
void main().catch(() => { console.error('Triage check failed. No credentials are printed.'); process.exitCode = 1; });
