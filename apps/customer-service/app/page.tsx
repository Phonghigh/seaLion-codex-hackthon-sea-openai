import { Workspace } from '../components/workspace';
export default async function Page({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const params = await searchParams;
  return <Workspace demoEnabled={params.demo === '1'} />;
}
