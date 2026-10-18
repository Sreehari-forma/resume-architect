'use client';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '@/lib/i18n';

function HighlightedLine({text}:{text:string}) {
  const tokens=text.split(/(\\[a-zA-Z]+\*?|\\[^a-zA-Z]|[{}\[\]]|%.*$)/g);
  return <>{tokens.map((token,i)=><span key={i} className={token.startsWith('\\')?'tex-command':/^[{}\[\]]$/.test(token)?'tex-delimiter':token.startsWith('%')?'tex-comment':undefined}>{token}</span>)}</>;
}

export default function LatexEditor({code,canExport=false,onUnlock}:{code:string;canExport?:boolean;onUnlock:()=>void}) {
  const { t }=useI18n();
  const [copied,setCopied]=useState(false);
  const [error,setError]=useState('');
  async function copy() {
    if(!canExport){onUnlock();return;}
    try { await navigator.clipboard.writeText(code); setCopied(true);setError('');setTimeout(()=>setCopied(false),2200); }
    catch {setError("Clipboard access is unavailable. Select the code below and copy it manually.");}
  }
  return <div className="latex-editor"><div className="latex-toolbar"><span><span className="code-dot"/>resume.tex</span><button className="button button-secondary" onClick={copy}>{copied?<Check size={13}/>:<Copy size={13}/>} {copied?t("Copied"):t("Copy LaTeX")}</button></div>{error && <p className="studio-message error" role="alert">{t(error)}</p>}<div className="latex-code" tabIndex={0} aria-label={t("LaTeX source code")}><pre><code>{code.split('\n').map((line,i)=><span className="code-line" key={i}><span className="line-number" aria-hidden="true">{i+1}</span><span><HighlightedLine text={line}/>{'\n'}</span></span>)}</code></pre></div><p className="latex-footnote">{t("Ready for Overleaf or pdflatex. Uses a standard, single-column article template.")}</p></div>;
}
