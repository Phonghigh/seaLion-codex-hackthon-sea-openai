import type { HumanRoute, ModeDecision, Triage } from '@seapilot/contracts';
import type { DemoClock } from '../demo/clock';
import type policyConfig from '../../../../config/routing-policy.json';
import type teamsConfig from '../../../../config/teams.json';

export interface RoutingFacts {
  open_case_exists: boolean; has_attachment: boolean;
  second_message_after_ai_reply: boolean; all_facts_from_system: boolean;
}
export type RoutingPolicy = typeof policyConfig;
export type Teams = typeof teamsConfig;
export const agentId = (id: string) => ({ CS_A: 'an', CS_B: 'binh', CS_C: 'carlos' })[id] ?? id;

export function decideMode(triage: Triage, facts: RoutingFacts, policy: RoutingPolicy): ModeDecision {
  const checks: Record<string, [boolean, 'human' | 'ai', string]> = {
    open_case_exists: [facts.open_case_exists, 'human', 'An open case already exists; a human continues the case.'],
    has_attachment: [facts.has_attachment, 'human', 'An attachment needs human review.'],
    'category in human_categories': [policy.human_categories.includes(triage.category), 'human', 'This category requires human judgment.'],
    'needs_human >= thresholds.needs_human': [triage.needs_human >= policy.thresholds.needs_human, 'human', 'The need for human help meets the policy threshold.'],
    'risk >= thresholds.risk': [triage.risk >= policy.thresholds.risk, 'human', 'The risk meets the human-review threshold.'],
    'category_confidence < thresholds.min_category_confidence': [triage.category_confidence < policy.thresholds.min_category_confidence, 'human', 'The category is uncertain; a human will clarify the request.'],
    second_message_after_ai_reply: [facts.second_message_after_ai_reply, 'human', 'The customer wrote again after an AI reply; a human takes over.'],
    'category in ai_allowed_categories and all_facts_from_system': [policy.ai_allowed_categories.includes(triage.category) && facts.all_facts_from_system, 'ai', 'This category allows AI replies and the answer is available from system data.'],
    default: [true, 'human', 'No AI-handling rule matched; a human will review the request.'],
  };
  for (const rule of policy.rules_in_order) {
    const check = checks[rule.split(' -> ')[0]];
    if (!check) return { mode: 'human', rule, reason: 'An unknown routing rule requires human review.' };
    if (check[0]) return { mode: check[1], rule, reason: check[2] };
  }
  return { mode: 'human', rule: 'default', reason: 'No AI-handling rule matched; a human will review the request.' };
}

export function onShift(agent: Teams['agents'][number], clock: Pick<DemoClock, 'now' | 'dayOffset'>): boolean {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: agent.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(clock.now());
  const minutes = Number(parts.find(p => p.type === 'hour')?.value) * 60 + Number(parts.find(p => p.type === 'minute')?.value);
  const minuteOf = (time: string) => { const [h, m] = time.split(':').map(Number); return h * 60 + m; };
  // Config day is the demo day. Time-of-day belongs to the agent's timezone,
  // including Carlos's overnight shift on the preceding New York calendar date.
  return agent.shifts.some(shift => {
    if (shift.day !== clock.dayOffset) return false;
    const start = minuteOf(shift.start), end = minuteOf(shift.end);
    return start <= end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
  });
}

export function routeHuman(category: string, language: string, clock: Pick<DemoClock, 'now' | 'dayOffset'>, teams: Teams, openCaseOwner: string | null | undefined, openCounts: Record<string, number>): HumanRoute {
  const team = teams.teams.find(item => item.categories.includes(category)) ?? teams.teams.find(item => item.categories.includes('other'))!;
  const eligible = teams.agents.filter(agent => agent.team === team.id && onShift(agent, clock) && agent.languages.includes(language));
  const owner = openCaseOwner ? eligible.find(agent => agent.id === agentId(openCaseOwner)) : undefined;
  if (owner) return { team: team.id, agent: owner.id, reason: `${team.name}: ${owner.name} is on shift, speaks ${language}, and keeps ownership of the existing case.` };
  const count = (id: string) => Object.entries(openCounts).reduce((sum, [key, value]) => sum + (agentId(key) === id ? value : 0), 0);
  const selected = [...eligible].sort((a, b) => count(a.id) - count(b.id) || a.id.localeCompare(b.id))[0];
  if (selected) return { team: team.id, agent: selected.id, reason: `${team.name}: ${selected.name} is on shift, speaks ${language}, and has the fewest open cases (${count(selected.id)}) among eligible agents.${openCaseOwner ? ' The current owner is unavailable for this team, shift or language.' : ''}` };
  const lead = teams.agents.find(agent => agent.id === team.lead);
  return { team: team.id, agent: team.lead, flag: 'no_match', reason: `${team.name}: no on-shift agent speaks ${language}; assigned to team lead ${lead?.name ?? team.lead} for review.` };
}
