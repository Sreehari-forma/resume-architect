import { getWorkspace } from '@/lib/workspace';
import { WorkspaceProvider } from '@/lib/store';
import AppShell from '@/components/AppShell';

export default async function WorkspaceGate({ children, active }: {children: React.ReactNode; active: 'dashboard' | 'studio'}) {
  const data = await getWorkspace();
  return <WorkspaceProvider data={data} key={data.userEmail || 'demo'}><AppShell active={active}>{children}</AppShell></WorkspaceProvider>;
}
