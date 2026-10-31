import { describe, expect, it } from 'vitest';
import type { Triage } from '@seapilot/contracts';
import policy from '../../../../config/routing-policy.json';
import teams from '../../../../config/teams.json';
import { DemoClock } from '../demo/clock';
import { decideMode, onShift, routeHuman, type RoutingFacts } from './decide';

const low: Triage = { category: 'order_status', category_confidence: 0.96, needs_human: 0.08, risk: 1, language: 'en' };
const facts: RoutingFacts = { open_case_exists: false, has_attachment: false, second_message_after_ai_reply: false, all_facts_from_system: true };
const clock = () => new DemoClock(new Date('2026-10-31T02:00:00Z'));
describe('ordered routing policy (real JSON fixtures)', () => {
  it.each([
    [0, {}, { open_case_exists: true }],
    [1, {}, { has_attachment: true }],
    [2, { category: 'refund_request' }, {}],
    [3, { needs_human: 0.5 }, {}],
    [4, { risk: 3 }, {}],
    [5, { category_confidence: 0.699 }, {}],
    [6, {}, { second_message_after_ai_reply: true }],
    [7, {}, {}],
    [8, { category: 'other' }, {}],
  ] as [number, Partial<Triage>, Partial<RoutingFacts>][])('matches rule %i', (index, measurement, hardFacts) => {
    expect(decideMode({ ...low, ...measurement }, { ...facts, ...hardFacts }, policy)).toMatchObject({ mode: index === 7 ? 'ai' : 'human', rule: policy.rules_in_order[index], reason: expect.any(String) });
  });
  it.each(policy.human_categories)('never auto-handles sensitive category %s', category => {
    expect(decideMode({ ...low, category }, facts, policy).mode).toBe('human');
  });
  it.each(policy.ai_allowed_categories)('requires system facts for allowed category %s', category => {
    expect(decideMode({ ...low, category, category_confidence: 0.7 }, facts, policy).mode).toBe('ai');
    expect(decideMode({ ...low, category }, { ...facts, all_facts_from_system: false }, policy).mode).toBe('human');
  });
  it('takes the first matching rule even when later scores disagree', () => {
    expect(decideMode({ ...low, category: 'missing_item', needs_human: 1, risk: 5 }, { ...facts, open_case_exists: true, has_attachment: true }, policy).rule).toBe(policy.rules_in_order[0]);
    const reordered = { ...policy, rules_in_order: [policy.rules_in_order[1], policy.rules_in_order[0]] };
    expect(decideMode(low, { ...facts, open_case_exists: true, has_attachment: true }, reordered).rule).toBe(policy.rules_in_order[1]);
  });
  it('uses configured thresholds and fails closed for missing or unknown rules', () => {
    expect(decideMode(low, facts, { ...policy, thresholds: { ...policy.thresholds, risk: 1 } }).mode).toBe('human');
    expect(decideMode(low, facts, { ...policy, rules_in_order: [] }).mode).toBe('human');
    expect(decideMode(low, facts, { ...policy, rules_in_order: ['unknown'] }).mode).toBe('human');
  });
});
describe('human routing', () => {
  it('routes Scene 1 to An and Scene 2 to Binh using the demo day', () => {
    const demo = clock();
    expect(routeHuman('missing_item', 'en', demo, teams, null, {})).toMatchObject({ team: 'delivery', agent: 'an' });
    demo.advance();
    expect(routeHuman('missing_item', 'en', demo, teams, 'CS_A', {})).toMatchObject({ team: 'delivery', agent: 'binh' });
  });
  it('routes Scene 4 to Carlos during his overnight New York shift on both demo days', () => {
    const demo = clock();
    for (let day = 0; day < 2; day++) {
      expect(routeHuman('other', 'en', demo, teams, null, {})).toMatchObject({ team: 'general', agent: 'carlos' });
      expect(onShift(teams.agents[2], demo)).toBe(true);
      demo.advance();
    }
  });
  it('filters by language and falls back to the team lead with an explicit flag', () => {
    expect(routeHuman('other', 'vi', clock(), teams, null, {})).toMatchObject({ team: 'general', agent: 'carlos', flag: 'no_match' });
    expect(routeHuman('refund_request', 'en', clock(), teams, null, {})).toMatchObject({ team: 'payments', agent: 'binh', flag: 'no_match' });
    expect(routeHuman('unknown', 'en', clock(), teams, null, {})).toMatchObject({ team: 'general', agent: 'carlos' });
  });
  it('keeps an eligible owner before load balancing and supports CS actor aliases', () => {
    const both = structuredClone(teams); both.agents[1].shifts = both.agents[0].shifts;
    expect(routeHuman('missing_item', 'en', clock(), both, 'CS_A', { CS_A: 12, CS_B: 0 }).agent).toBe('an');
    expect(routeHuman('missing_item', 'en', clock(), both, null, { CS_A: 12, CS_B: 0 }).agent).toBe('binh');
    expect(routeHuman('missing_item', 'en', clock(), both, null, {}).agent).toBe('an');
    both.agents[0].languages = ['vi'];
    expect(routeHuman('missing_item', 'en', clock(), both, 'CS_A', {}).agent).toBe('binh');
    expect(routeHuman('other', 'en', clock(), both, 'an', {}).agent).toBe('carlos');
  });
  it('honors shift start/end boundaries and overnight hours in the agent timezone', () => {
    const at = (iso: string) => ({ now: () => new Date(iso), dayOffset: 0 });
    const an = teams.agents[0], carlos = teams.agents[2];
    expect(onShift(an, at('2026-10-31T00:59:00Z'))).toBe(false);
    expect(onShift(an, at('2026-10-31T01:00:00Z'))).toBe(true);
    expect(onShift(an, at('2026-10-31T10:00:00Z'))).toBe(false);
    expect(onShift(carlos, at('2026-10-31T00:00:00Z'))).toBe(true);
    expect(onShift(carlos, at('2026-10-31T08:59:00Z'))).toBe(true);
    expect(onShift(carlos, at('2026-10-31T09:00:00Z'))).toBe(false);
  });
});
