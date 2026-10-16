import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Forma — AI Resume Architect', template: '%s · Forma' },
  description: 'Turn your experience into a focused, ATS-friendly resume. One master profile, thoughtful AI tailoring, and clean LaTeX exports.',
  icons: { icon: '/icon.svg' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a>{children}</body></html>;
}
