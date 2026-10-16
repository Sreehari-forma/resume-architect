'use client';
import Link from 'next/link';
export default function ErrorPage({reset}:{error:Error & {digest?:string};reset:()=>void}) {
  return <main id="main-content" className="error-page"><span className="eyebrow">A SMALL INTERRUPTION</span><h1>Let’s try that again.</h1><p>We couldn’t load this workspace. Your saved profile is still available.</p><div className="flex gap-3"><button className="button button-primary" onClick={reset}>Try again</button><Link href="/" className="button button-secondary">Back to Forma</Link></div></main>;
}
