import { ProfileEditor } from '@/components/ProfileEditor';
import WorkspaceGate from '@/components/WorkspaceGate';
import '../profile.css';

export const metadata = { title: 'Master Vault' };
export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return <WorkspaceGate active="dashboard"><ProfileEditor /></WorkspaceGate>;
}
