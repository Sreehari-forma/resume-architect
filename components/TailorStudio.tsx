'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowDownToLine, ArrowRight, ArrowUpRight, Braces, Check, CheckCheck, ChevronDown, CircleHelp, FileText, Link2, LoaderCircle, ScanLine, ShieldCheck, Sparkles, Target, WandSparkles } from 'lucide-react';
import { useWorkspace } from '@/lib/store';
import { DEMO_PROFILE, SAMPLE_JOB_DESCRIPTION, createDemoResume, profileCompleteness } from '@/lib/demo';
import type { TailoredResume } from '@/types';
import ResumePreview from '@/components/ResumePreview';
import LatexEditor from '@/components/LatexEditor';

function ScoreRing({score,example}:{score:number;example:boolean}) {
  const circumference=2*Math.PI*39;
  return <div className="match-ring"><svg width="102" height="102" viewBox="0 0 102 102" aria-hidden="true"><circle cx="51" cy="51" r="39" fill="none" stroke="#24283c" strokeWidth="6"/><circle cx="51" cy="51" r="39" fill="none" stroke="#8e88e9" strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference*(1-score/100)} transform="rotate(-90 51 51)"/></svg><div><strong>{score}<span>%</span></strong><small>{example?'EXAMPLE':'COVERAGE'}</small></div></div>;
}

export default function TailorStudio() {
  const { profile,isDemo,resume,setResume }=useWorkspace();
  const [inputMode,setInputMode]=useState<'text'|'url'>('text');
  const [jobDescription,setJobDescription]=useState('');
  const [jobUrl,setJobUrl]=useState('');
  const [outputTab,setOutputTab]=useState<'preview'|'latex'>('preview');
  const [busy,setBusy]=useState(false);
  const [extracting,setExtracting]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [showKeywords,setShowKeywords]=useState(false);
  const [generatedFor,setGeneratedFor]=useState('');
  const activeRequest=useRef(false);
  const reducedMotion=useReducedMotion();
  const example=useMemo(()=>createDemoResume(DEMO_PROFILE,SAMPLE_JOB_DESCRIPTION),[]);
  const shown=resume ?? example;
  const isExample=!resume;
  const readiness=profileCompleteness(profile);
  const ready=Boolean(profile.fullName.trim() && (profile.experience.length || profile.skills.length || profile.projects.length));
  const changed=Boolean(resume && generatedFor!==jobDescription.trim());

  function useExampleJob(){setJobDescription(SAMPLE_JOB_DESCRIPTION);setInputMode('text');setError('');setNotice('Sample job added. Make it your own, or generate to try the workflow.');}
  async function extractJob(){
    if(extracting)return;
    setExtracting(true);setError('');setNotice('');
    try{
      const response=await fetch('/api/jobs/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:jobUrl}),signal:AbortSignal.timeout(20000)});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error || 'The posting could not be imported. Paste its description instead.');
      setJobDescription(data.text);setInputMode('text');setNotice('Job description imported. Review the text before generating your resume.');
    }catch(e){setError(e instanceof Error && e.name==='TimeoutError'?'The job import timed out. Paste the description to continue.':e instanceof Error?e.message:'The posting could not be imported. Paste its description instead.');}
    finally{setExtracting(false);}
  }
  async function generate(){
    if(activeRequest.current)return;
    if(!ready){setError('Add your name and experience, projects, or skills to the Master Vault first.');return;}
    if(jobDescription.trim().length<80){setError('Add at least 80 characters from the job description so there is enough context.');return;}
    activeRequest.current=true;setBusy(true);setError('');setNotice('');
    try{
      let result:TailoredResume;
      if(isDemo){
        // Demo data stays on the device. Yield one frame so pending state can paint.
        await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
        result=createDemoResume(profile,jobDescription.trim());
      } else {
        const response=await fetch('/api/tailor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile,jobDescription:jobDescription.trim()}),signal:AbortSignal.timeout(60000)});
        const data=await response.json();
        if(!response.ok)throw new Error(data.error || 'We could not generate your resume. Please try again.');
        result=data.resume;
      }
      setResume(result);setGeneratedFor(jobDescription.trim());setOutputTab('preview');
      setNotice(isDemo?'Your demo resume is ready. Relevant achievements and skills were prioritized locally.':'Your tailored resume is ready and saved. Review the content before sending it.');
    }catch(e){setError(e instanceof Error && (e.name==='TimeoutError'||e.name==='AbortError')?'Generation took too long. Please try again.':e instanceof Error?e.message:'We could not generate your resume. Please try again.');}
    finally{activeRequest.current=false;setBusy(false);}
  }
  function download(){
    const blob=new Blob([shown.latex],{type:'application/x-tex;charset=utf-8'});
    const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;
    anchor.download=`${shown.profile.fullName.toLowerCase().replace(/[^a-z0-9]+/g,'-') || 'resume'}${isExample?'-example':''}.tex`;
    document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function tabKeys(event:React.KeyboardEvent<HTMLDivElement>,group:'input'|'output'){
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?1:group==='input'?(inputMode==='text'?1:0):(outputTab==='preview'?1:0);
    if(group==='input')setInputMode(next?'url':'text');else setOutputTab(next?'latex':'preview');
    (event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next])?.focus();
  }

  return <div className="studio">
    <div className="studio-page-heading"><div><span className="eyebrow"><span className="tiny-spark">✦</span> THE TAILORING STUDIO</span><h1>Your story. <span>Perfectly aligned.</span></h1><p>A little context. A more considered resume. Your experience does the rest.</p></div><Link href="/dashboard" className="button button-secondary"><FileText size={14}/>My master profile<ArrowUpRight size={13}/></Link></div>
    <div className="studio-stepbar" aria-label="Tailoring workflow"><div className="complete"><span><Check size={11}/></span>Master profile</div><i/><div className="current"><span>02</span>Match the opportunity</div><i/><div className={resume?'complete':''}><span>{resume?<Check size={11}/>: '03'}</span>Make it yours</div><span className="stepbar-note"><ShieldCheck size={13}/>Your experience, preserved.</span></div>
    <div className="studio-columns">
      <div className="studio-input-column">
        <section className="panel job-panel"><div className="panel-heading"><div className="panel-symbol"><Target size={17}/></div><div><h2>The next opportunity</h2><p>Tell us what you’re aiming for.</p></div><span className="section-number">01</span></div>
          <div className="studio-tabs input-tabs" role="tablist" aria-label="Job input method" onKeyDown={e=>tabKeys(e,'input')}><button id="text-tab" role="tab" aria-selected={inputMode==='text'} aria-controls="job-text-panel" tabIndex={inputMode==='text'?0:-1} onClick={()=>setInputMode('text')}><FileText size={13}/>Job description</button><button id="url-tab" role="tab" aria-selected={inputMode==='url'} aria-controls="job-url-panel" tabIndex={inputMode==='url'?0:-1} onClick={()=>setInputMode('url')}><Link2 size={13}/>Job URL</button></div>
          {inputMode==='text'?<div id="job-text-panel" role="tabpanel" aria-labelledby="text-tab"><label htmlFor="job-description" className="sr-only">Target job description</label><textarea id="job-description" className="job-textarea textarea" placeholder={'Paste the job description here…\n\nInclude the role, responsibilities, and skills they’re looking for. We’ll find the overlap with your experience.'} value={jobDescription} onChange={e=>setJobDescription(e.target.value)} maxLength={24000} disabled={busy} /><div className="input-meta"><span>{jobDescription.length.toLocaleString()} / 24,000</span><button onClick={useExampleJob} disabled={busy}><Sparkles size={11}/>Try a sample job</button></div></div>:<div id="job-url-panel" role="tabpanel" aria-labelledby="url-tab" className="job-url-panel"><label className="label" htmlFor="job-url">Link to the job posting</label><input id="job-url" className="input" type="url" placeholder="https://boards.greenhouse.io/…" value={jobUrl} onChange={e=>setJobUrl(e.target.value)} maxLength={2000}/><p>Import a Greenhouse or Lever posting. For other websites, paste the job description.</p><button className="button button-secondary" onClick={extractJob} disabled={!jobUrl.trim()||extracting}>{extracting?<LoaderCircle size={13} className="spin"/>:<Link2 size={13}/>} {extracting?'Importing description…':'Import description'}</button><button className="url-fallback" onClick={()=>setInputMode('text')}>Paste the description instead <ArrowRight size={12}/></button></div>}
          <div className="profile-source"><span className="source-icon"><CheckCheck size={15}/></span><div><strong>{ready?profile.fullName:'Complete your profile'}</strong><small>Master profile · {readiness}% complete</small></div><Link href="/dashboard" aria-label="Edit master profile"><ArrowUpRight size={15}/></Link></div>
          <button className={`button button-primary generate-button ${busy?'generating':''}`} onClick={generate} disabled={busy||!ready||jobDescription.trim().length<80}>{busy?<LoaderCircle className="spin" size={16}/>:<WandSparkles size={16}/>} {busy?'Architecting your resume…':isDemo?'Generate demo resume':'Generate tailored resume'}{!busy&&<ArrowRight size={15}/>}</button>
          <p className="generation-note"><ShieldCheck size={10}/>{isDemo?'Local demo · no AI request or data transfer':'Your profile and job description are sent to Google Gemini for tailoring.'}</p>
          {!ready&&<p className="studio-message"><Link href="/dashboard">Add your name and experience to the Master Vault <ArrowUpRight size={12}/></Link></p>}
          <AnimatePresence>{error&&<motion.p className="studio-message error" role="alert" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>{error}</motion.p>}{notice&&<motion.p className="studio-message success" role="status" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>{notice}</motion.p>}</AnimatePresence>
        </section>
        <section className="panel analysis-panel"><div className="analysis-heading"><h2><ScanLine size={15}/>The alignment report</h2><span className="badge">{isExample?'EXAMPLE':shown.mode==='demo'?'DEMO':'ANALYZED'}</span></div><div className="score-summary"><ScoreRing score={shown.analysis.matchScore} example={isExample}/><div><h3>{shown.analysis.matchScore>=80?'A strong foundation.':shown.analysis.matchScore>=50?'Room to stand out.':'A new direction.'}</h3><p>{shown.analysis.matchedKeywords.length} of {shown.analysis.matchedKeywords.length+shown.analysis.missingKeywords.length} detected keywords found.</p><span className="score-caption">Keyword coverage, not an interview prediction.</span></div></div>
          <div className="keyword-heading"><span>OPPORTUNITIES TO STRENGTHEN</span><span>{shown.analysis.missingKeywords.length}</span></div><div className="keyword-chips">{shown.analysis.missingKeywords.length?shown.analysis.missingKeywords.slice(0,showKeywords?undefined:6).map(keyword=><span className="keyword missing" key={keyword}>{keyword}<span>+</span></span>):<p className="all-keywords"><Check size={13}/>All detected keywords are present.</p>}</div>
          <p className="keyword-disclaimer">Add these only when they reflect real experience.</p><button className="keyword-toggle" aria-expanded={showKeywords} onClick={()=>setShowKeywords(!showKeywords)}>{showKeywords?'Hide keyword details':'View keyword details'}<ChevronDown size={13} style={{transform:showKeywords?'rotate(180deg)':undefined}}/></button>{showKeywords&&<div className="keyword-details"><span className="eyebrow">MATCHED KEYWORDS</span><div className="keyword-chips">{shown.analysis.matchedKeywords.map(keyword=><span className="keyword matched" key={keyword}><Check size={10}/>{keyword}</span>)}</div><p>Case-insensitive term matching against the resume. This estimate does not reproduce any employer’s ATS scoring.</p></div>}
        </section>
        <div className="studio-aside-note"><CircleHelp size={15}/><p>The best resume sounds like you.<br/><span>Review every detail before you send it.</span></p></div>
      </div>
      <div className="studio-output-column">
        <section className="panel output-panel"><div className="output-header"><div className="studio-tabs output-tabs" role="tablist" aria-label="Resume output format" onKeyDown={e=>tabKeys(e,'output')}><button id="preview-tab" role="tab" aria-selected={outputTab==='preview'} aria-controls="preview-panel" tabIndex={outputTab==='preview'?0:-1} onClick={()=>setOutputTab('preview')}><FileText size={13}/>Resume preview</button><button id="latex-tab" role="tab" aria-selected={outputTab==='latex'} aria-controls="latex-panel" tabIndex={outputTab==='latex'?0:-1} onClick={()=>setOutputTab('latex')}><Braces size={14}/>LaTeX source</button></div><button className="icon-button" onClick={download} title={isExample?'Download example LaTeX':'Download LaTeX'} aria-label={isExample?'Download example LaTeX':'Download LaTeX'}><ArrowDownToLine size={16}/></button></div>
          <div className="resume-toolbar"><div><span className="resume-document-icon"><FileText size={15}/></span><p>{isExample?'Your next chapter, on paper':shown.jobTitle}<small>{isExample?'An example of what’s possible':`${shown.profile.fullName}${shown.company?' · '+shown.company:''}`}</small></p></div><span className={`document-status ${isExample?'example':''}`}><span className="status-dot"/>{isExample?'SAMPLE PREVIEW':changed?'PREVIOUS RESULT':'READY TO REVIEW'}</span></div>
          {changed&&<p className="stale-notice">Your job description has changed. Generate again to update this resume.</p>}
          {outputTab==='preview'?<div id="preview-panel" className="resume-stage" role="tabpanel" aria-labelledby="preview-tab"><motion.div key={shown.id} initial={reducedMotion?false:{opacity:0,y:5}} animate={{opacity:1,y:0}} transition={{duration:.3}}><ResumePreview profile={shown.profile}/></motion.div>{busy&&<div className="resume-loading" role="status"><div><Sparkles size={26}/><h3>Finding the right words.</h3><p>Aligning your experience with the opportunity.</p><LoaderCircle size={20} className="spin"/></div></div>}</div>:<div id="latex-panel" role="tabpanel" aria-labelledby="latex-tab"><LatexEditor code={shown.latex}/></div>}
          <div className="output-footer"><span><ShieldCheck size={12}/>Single-column · Text-based · ATS-friendly</span><button onClick={download}>Export {isExample?'example ':''}.tex<ArrowDownToLine size={13}/></button></div>
        </section>
        <section className="tailoring-highlights"><div className="highlights-heading"><span><Sparkles size={14}/>{isExample?'A thoughtful approach to every detail':'What changed, and why'}</span><span>{isExample?'THE FORMA APPROACH':`${shown.analysis.highlights.length} HIGHLIGHTS`}</span></div><div className="highlight-items">{(isExample?['Your strongest, most relevant achievements come first.','Your skills align with the language of the opportunity.','Your facts stay yours. A clean format does the rest.']:shown.analysis.highlights).map((highlight,index)=><div key={index}><span>{String(index+1).padStart(2,'0')}</span><p>{highlight}</p><ArrowUpRight size={12}/></div>)}</div></section>
      </div>
    </div>
  </div>;
}
