import { afterEach, describe, expect, it, vi } from 'vitest';
import policy from '../../../../config/routing-policy.json';
import { triage, safeTriage } from './triage';
import type { ResponsesClient } from './agent';

const measured = { category: 'order_status', category_confidence: 0.96, needs_human: 0.08, risk: 1, language: 'en' };
const context = { open_case_exists: false, has_attachment: false, language: 'en' };
const client = () => ({ responses: { create: vi.fn<ResponsesClient['responses']['create']>() } });
const final = (value: unknown) => ({ status: 'completed' as const, output: [], output_text: JSON.stringify(value) });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
describe('Responses triage adapter (mocked only)', () => {
  it('uses strict structured output, every configured category, and TRIAGE_MODEL', async () => {
    vi.stubEnv('TRIAGE_MODEL', 'triage-test'); vi.stubEnv('OPENAI_MODEL', 'suggest-test');
    const mock = client(); mock.responses.create.mockResolvedValue(final(measured));
    expect(await triage('Where is my order DH002?', context, { client: mock })).toEqual(measured);
    const [request, options] = mock.responses.create.mock.calls[0];
    expect(request).toMatchObject({ model: 'triage-test', store: false, text: { format: { type: 'json_schema', strict: true } } });
    expect(JSON.stringify(request.text)).toContain('additionalProperties');
    for (const category of [...policy.ai_allowed_categories, ...policy.human_categories, 'other']) expect(JSON.stringify(request.text)).toContain(category);
    expect(request).not.toHaveProperty('temperature'); expect(request).not.toHaveProperty('top_p');
    expect(options.maxRetries).toBe(0);
  });
  it('defaults to OPENAI_MODEL and accepts confirm_receipt from the policy', async () => {
    vi.stubEnv('TRIAGE_MODEL', ''); vi.stubEnv('OPENAI_MODEL', 'configured-default');
    const mock = client(); mock.responses.create.mockResolvedValue(final({ ...measured, category: 'confirm_receipt' }));
    expect((await triage('Thanks', context, { client: mock })).category).toBe('confirm_receipt');
    expect(mock.responses.create.mock.calls[0][0].model).toBe('configured-default');
  });
  it.each([
    { ...measured, category: 'invented' }, { ...measured, needs_human: 2 }, { ...measured, risk: 0 },
    { ...measured, language: 'fr' }, { ...measured, extra: 'bad' }, {},
  ])('falls back safely on invalid model output %#', async value => {
    const mock = client(); mock.responses.create.mockResolvedValue(final(value));
    expect(await triage('Problem', context, { client: mock, model: 'test' })).toEqual(safeTriage('en'));
  });
  it('falls back on transport failure, refusal, incomplete output and missing configuration', async () => {
    const mock = client();
    mock.responses.create.mockRejectedValueOnce(new Error('private provider details')).mockResolvedValueOnce({ status: 'completed', output: [], output_text: '' }).mockResolvedValueOnce({ ...final(measured), status: 'incomplete' });
    for (let i = 0; i < 3; i++) expect(await triage('Problem', context, { client: mock, model: 'test' })).toEqual(safeTriage('en'));
    vi.stubEnv('OPENAI_API_KEY', ''); vi.stubEnv('OPENAI_MODEL', ''); vi.stubEnv('TRIAGE_MODEL', '');
    expect(await triage('Problem', context)).toEqual(safeTriage('en'));
  });
  it('returns safe human measurements at 15 seconds even if a client ignores abort', async () => {
    vi.useFakeTimers();
    const mock = client(); mock.responses.create.mockImplementation(() => new Promise(() => {}));
    const pending = triage('Problem', context, { client: mock, model: 'test' });
    await vi.advanceTimersByTimeAsync(15_000);
    expect(await pending).toEqual(safeTriage('en'));
    expect(mock.responses.create.mock.calls[0][1].signal.aborted).toBe(true);
  });
});
