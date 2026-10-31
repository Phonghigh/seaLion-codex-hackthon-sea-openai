import { Workspace } from '../components/workspace';
import { FixtureWorkspace } from '../components/fixture-workspace';
export default async function Page({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const params = await searchParams;
  return process.env.NEXT_PUBLIC_USE_FIXTURES === '1' ? <FixtureWorkspace demoEnabled={params.demo === '1'} /> : <Workspace demoEnabled={params.demo === '1'} />;
}
