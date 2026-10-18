'use client';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { useWorkspace } from '@/lib/store';

function HighlightedLine({text}:{text:string}) {
  const tokens=text.split(/(\\[a-zA-Z]+\*?|\\[^a-zA-Z]|[{}\[\]]|%.*$)/g);
  return <>{tokens.map((token,i)=><span key={i} className={token.startsWith('\\')?'tex-command':/^[{}\[\]]$/.test(token)?'tex-delimiter':token.startsWith('%')?'tex-comment':undefined}>{token}</span>)}</>;
}

export default function LatexEditor({code}:{code:string}) {
  const { isGuest,requestAuth }=useWorkspace();
  const [copied,setCopied]=useState(false);
  const [error,setError]=useState('');
  async function copy() {
    if(isGuest){requestAuth('export');return;}
    try { await navigator.clipboard.writeText(code); setCopied(true);setError('');setTimeout(()=>setCopied(false),2200); }
    catch {setError('Clipboard access is unavailable. Select the code below and copy it manually.');}
  }
  return <div className="latex-editor"><div className="latex-toolbar"><span><span className="code-dot"/>resume.tex</span><button className="button button-secondary" onClick={copy}>{copied?<Check size={13}/>:<Copy size={13}/>} {copied?'Copied':'Copy LaTeX'}</button></div>{error && <p className="studio-message error" role="alert">{error}</p>}<div className="latex-code" tabIndex={0} aria-label="LaTeX source code"><pre><code>{code.split('\n').map((line,i)=><span className="code-line" key={i}><span className="line-number" aria-hidden="true">{i+1}</span><span><HighlightedLine text={line}/>{'\n'}</span></span>)}</code></pre></div><p className="latex-footnote">Ready for Overleaf or pdflatex. Uses a standard, single-column article template.</p></div>;
}
