'use client';
import { useSearchParams } from 'next/navigation';
import { Workspace } from './workspace';
import { FixtureWorkspace } from './fixture-workspace';

export function WorkspaceEntry() {
  const params = useSearchParams();
  const demoEnabled = params.get('demo') === '1';
  return process.env.NEXT_PUBLIC_USE_FIXTURES === '1'
    ? <FixtureWorkspace demoEnabled={demoEnabled} />
    : <Workspace demoEnabled={demoEnabled} />;
}
