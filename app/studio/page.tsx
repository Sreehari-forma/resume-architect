import type { Metadata } from 'next';
import WorkspaceGate from '@/components/WorkspaceGate';
import TailorStudio from '@/components/TailorStudio';
import '../studio.css';

export const metadata: Metadata = { title: 'Tailoring Studio' };
export const dynamic = 'force-dynamic';
export default function StudioPage() { return <WorkspaceGate active="studio"><TailorStudio/></WorkspaceGate>; }
