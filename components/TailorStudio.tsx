'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import PaymentModal from '@/components/PaymentModal';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowDownToLine, ArrowRight, ArrowUpRight, Braces, Check, CheckCheck, ChevronDown, CircleHelp, FileText, Link2, LoaderCircle, ScanLine, ShieldCheck, Sparkles, Target, WandSparkles } from 'lucide-react';
import { useWorkspace } from '@/lib/store';
import { DEMO_PROFILE, SAMPLE_JOB_DESCRIPTION, SAMPLE_JOB_DESCRIPTION_PL, createDemoResume, profileCompleteness } from '@/lib/demo';
import type { TailoredResume } from '@/types';
import ResumePreview from '@/components/ResumePreview';
import LatexEditor from '@/components/LatexEditor';

function ScoreRing({score,example,unscored=false}:{score:number;example:boolean;unscored?:boolean}) {
  const { t }=useI18n();
  const circumference=2*Math.PI*39;
  return <div className="match-ring"><svg width="102" height="102" viewBox="0 0 102 102" aria-hidden="true"><circle cx="51" cy="51" r="39" fill="none" stroke="#24283c" strokeWidth="6"/><circle cx="51" cy="51" r="39" fill="none" stroke="#8e88e9" strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference*(1-(unscored?0:score)/100)} transform="rotate(-90 51 51)"/></svg><div><strong>{unscored?'—':<>{score}<span>%</span></>}</strong><small>{unscored?t("PROFILE"):example?t("EXAMPLE"):t("COVERAGE")}</small></div></div>;
}

export default function TailorStudio() {
  const { t,locale }=useI18n();
  const { profile,isDemo,isGuest,authConfigured,resume,setResume,requestAuth,studioDraft,setStudioDraft }=useWorkspace();
  const { inputTab:inputMode,jobDescription,jobUrl,outputTab,generatedFor }=studioDraft;
  const setInputMode=(inputTab:'text'|'url')=>setStudioDraft({inputTab});
  const setJobDescription=(value:string)=>setStudioDraft({jobDescription:value});
  const setJobUrl=(value:string)=>setStudioDraft({jobUrl:value});
  const setOutputTab=(value:'preview'|'latex')=>setStudioDraft({outputTab:value});
  const [busy,setBusy]=useState(false);
  const [extracting,setExtracting]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [showKeywords,setShowKeywords]=useState(false);
  const activeRequest=useRef(false);
  const [paymentOpen,setPaymentOpen]=useState(false);
  const [downloading,setDownloading]=useState(false);
  const downloadActive=useRef(false);
  const [entitlement,setEntitlement]=useState<{key:string;resumeId:string}|null>(null);
  const [paymentRevision,setPaymentRevision]=useState(0);
  const [paidVersion,setPaidVersion]=useState<string|null>(null);
  const [checkingPayment,setCheckingPayment]=useState(false);
  const [hasCheckoutSession,setHasCheckoutSession]=useState(false);
  const [paymentCheckRevision,setPaymentCheckRevision]=useState(0);
  const reducedMotion=useReducedMotion();
  const example=useMemo(()=>createDemoResume(DEMO_PROFILE,SAMPLE_JOB_DESCRIPTION),[]);
  const profilePreview=useMemo(()=>createDemoResume(profile,''),[profile]);
  const readiness=profileCompleteness(profile);
  const ready=Boolean(profile.fullName.trim() && (profile.experience.length || profile.skills.length || profile.projects.length));
  const hasProfile=Object.values(profile).some(value=>typeof value==='string'?Boolean(value.trim()):value.length>0);
  const shown=resume ?? (hasProfile?profilePreview:example);
  const jobTitleLabel=shown.jobTitle==='Target role'?t('Target role'):shown.jobTitle;
  const companyLabel=shown.company==='Target company'?t('Target company'):shown.company;
  const isExample=!resume && !hasProfile;
  const isProfilePreview=!resume && hasProfile;
  const localTailoring=isGuest || isDemo;
  const changed=Boolean(resume && generatedFor!==jobDescription.trim());

  const entitlementKey=JSON.stringify({profile:shown.profile,locale});
  const paidResumeId=!isGuest && entitlement?.key===entitlementKey?entitlement.resumeId:null;

  useEffect(()=>{
    if(isGuest || isExample)return;
    const controller=new AbortController();
    let current=true;
    void (async()=>{
      try {
        const response=await fetch('/api/payments/entitlement',{method:'POST',headers:{'Content-Type':'application/json'},body:entitlementKey,signal:controller.signal});
        const result=await response.json();
        if(current)setEntitlement(response.ok && result.paid===true && typeof result.resumeId==='string'?{key:entitlementKey,resumeId:result.resumeId}:null);
      } catch { if(current)setEntitlement(null); }
    })();
    return ()=>{current=false;controller.abort();};
  },[entitlementKey,isGuest,isExample,paymentRevision]);

  useEffect(()=>{
    if(isGuest)return;
    const query=new URLSearchParams(window.location.search);
    const session=query.get('checkout_session_id');
    if(query.get('payment')==='cancelled')setNotice("Checkout canceled. Your draft is still here.");
    if(!session)return;
    setHasCheckoutSession(true);
    let current=true;
    const controller=new AbortController();
    setCheckingPayment(true);
    setError('');
    void (async()=>{
      try {
        const response=await fetch(`/api/payments/status?session_id=${encodeURIComponent(session)}`,{signal:controller.signal});
        const result=await response.json();
        if(!response.ok)throw new Error(result.error || "We could not check your payment. Please try again.");
        if(current){
          if(result.paid===true && typeof result.resumeId==='string'){
            setPaidVersion(result.resumeId);setPaymentRevision(value=>value+1);
            setNotice("Payment verified. Your paid CV is ready to download.");
          }else setNotice("Payment is still processing. Please check again shortly.");
        }
      }catch(cause){if(current)setError(cause instanceof Error?cause.message:"We could not check your payment. Please try again.");}
      finally{if(current)setCheckingPayment(false);}
    })();
    return ()=>{current=false;controller.abort();};
  },[isGuest,paymentCheckRevision]);

  function useExampleJob(){setJobDescription(locale==='pl'?SAMPLE_JOB_DESCRIPTION_PL:SAMPLE_JOB_DESCRIPTION);setInputMode('text');setError('');setNotice("Sample job added. Make it your own, or generate to try the workflow.");}
  async function extractJob(){
    if(extracting)return;
    if(isGuest){setInputMode('text');setError('');setNotice("Paste the job description to continue with a free local preview. Automatic URL import is available after signing in.");return;}
    setExtracting(true);setError('');setNotice('');
    try{
      const response=await fetch('/api/jobs/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:jobUrl}),signal:AbortSignal.timeout(20000)});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error || "The posting could not be imported. Paste its description instead.");
      setJobDescription(data.text);setInputMode('text');setNotice("Job description imported. Review the text before generating your resume.");
    }catch(e){setError(e instanceof Error && e.name==='TimeoutError'?"The job import timed out. Paste the description to continue.":e instanceof Error?e.message:"The posting could not be imported. Paste its description instead.");}
    finally{setExtracting(false);}
  }
  async function generate(){
    if(activeRequest.current)return;
    if(!ready){setError("Add your name and experience, projects, or skills to the Master Vault first.");return;}
    if(jobDescription.trim().length<80){setError("Add at least 80 characters from the job description so there is enough context.");return;}
    activeRequest.current=true;setBusy(true);setError('');setNotice('');
    try{
      let result:TailoredResume;
      if(localTailoring){
        // Guest tailoring stays on the device and never calls the authenticated AI endpoint.
        await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
        result=createDemoResume(profile,jobDescription.trim());
      } else {
        const response=await fetch('/api/tailor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile,jobDescription:jobDescription.trim()}),signal:AbortSignal.timeout(60000)});
        const data=await response.json();
        if(!response.ok)throw new Error(data.error || "We could not generate your resume. Please try again.");
        result=data.resume;
      }
      setResume(result);setStudioDraft({generatedFor:jobDescription.trim(),outputTab:'preview'});
      setNotice(localTailoring?"Your local preview is ready. Relevant achievements and skills were prioritized on this device; no AI request was made.":"Your tailored resume is ready and saved. Review the content before sending it.");
    }catch(e){setError(e instanceof Error && (e.name==='TimeoutError'||e.name==='AbortError')?"Generation took too long. Please try again.":e instanceof Error?e.message:"We could not generate your resume. Please try again.");}
    finally{activeRequest.current=false;setBusy(false);}
  }
  async function downloadPdf(resumeId?:string){
    if(downloadActive.current)return;
    downloadActive.current=true;setDownloading(true);setError('');
    try{
      const response=await fetch(resumeId?`/api/resumes/${encodeURIComponent(resumeId)}/pdf`:'/api/resumes/demo',resumeId?{signal:AbortSignal.timeout(45000)}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile:shown.profile,locale}),signal:AbortSignal.timeout(45000)});
      if(!response.ok){const result=await response.json().catch(()=>({}));throw new Error(result.error || "We could not download your PDF. Please try again.");}
      const blob=await response.blob();
      const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;
      const filename=shown.profile.fullName.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'').slice(0,80) || 'resume';
      anchor.download=`${filename}${resumeId?'':'-demo'}.pdf`;
      document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(cause){setError(cause instanceof Error && cause.name!=='TimeoutError'?cause.message:"We could not download your PDF. Please try again.");}
    finally{downloadActive.current=false;setDownloading(false);}
  }
  function downloadFinal(){
    if(isExample){setError("Use your own profile before purchasing a final CV.");return;}
    if(isGuest){requestAuth('export');return;}
    if(paidResumeId){void downloadPdf(paidResumeId);return;}
    setPaymentOpen(true);
  }
  function tabKeys(event:React.KeyboardEvent<HTMLDivElement>,group:'input'|'output'){
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?1:group==='input'?(inputMode==='text'?1:0):(outputTab==='preview'?1:0);
    if(group==='input')setInputMode(next?'url':'text');else setOutputTab(next?'latex':'preview');
    (event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next])?.focus();
  }

  return <div className="studio">
    <div className="studio-page-heading"><div><span className="eyebrow"><span className="tiny-spark">✦</span> {t("THE TAILORING STUDIO")}</span><h1>{t("Your story.")} <span>{t("Perfectly aligned.")}</span></h1><p>{isGuest?t("Build and preview your CV freely. Drafts and demo PDFs are free."):t("A little context. A more considered resume. Your experience does the rest.")}</p></div><Link href="/dashboard" className="button button-secondary"><FileText size={14}/>{t("My master profile")}<ArrowUpRight size={13}/></Link></div>
    <div className="studio-stepbar" aria-label={t("Tailoring workflow")}><div className="complete"><span><Check size={11}/></span>{t("Master profile")}</div><i/><div className="current"><span>02</span>{t("Match the opportunity")}</div><i/><div className={resume?'complete':''}><span>{resume?<Check size={11}/>: '03'}</span>{t("Make it yours")}</div><span className="stepbar-note"><ShieldCheck size={13}/>{t("Your experience, preserved.")}</span></div>
    <div className="studio-columns">
      <div className="studio-input-column">
        <section className="panel job-panel"><div className="panel-heading"><div className="panel-symbol"><Target size={17}/></div><div><h2>{t("The next opportunity")}</h2><p>{t("Tell us what you’re aiming for.")}</p></div><span className="section-number">01</span></div>
          <div className="studio-tabs input-tabs" role="tablist" aria-label={t("Job input method")} onKeyDown={e=>tabKeys(e,'input')}><button id="text-tab" role="tab" aria-selected={inputMode==='text'} aria-controls="job-text-panel" tabIndex={inputMode==='text'?0:-1} onClick={()=>setInputMode('text')}><FileText size={13}/>{t("Job description")}</button><button id="url-tab" role="tab" aria-selected={inputMode==='url'} aria-controls="job-url-panel" tabIndex={inputMode==='url'?0:-1} onClick={()=>setInputMode('url')}><Link2 size={13}/>{t("Job URL")}</button></div>
          {inputMode==='text'?<div id="job-text-panel" role="tabpanel" aria-labelledby="text-tab"><label htmlFor="job-description" className="sr-only">{t("Target job description")}</label><textarea id="job-description" className="job-textarea textarea" placeholder={t("Paste the job description here…\n\nInclude the role, responsibilities, and skills they’re looking for. We’ll find the overlap with your experience.")} value={jobDescription} onChange={e=>setJobDescription(e.target.value)} maxLength={24000} disabled={busy} /><div className="input-meta"><span>{jobDescription.length.toLocaleString(locale==='pl'?'pl-PL':'en-US')} / {(24000).toLocaleString(locale==='pl'?'pl-PL':'en-US')}</span><button onClick={useExampleJob} disabled={busy}><Sparkles size={11}/>{t("Try a sample job")}</button></div></div>:<div id="job-url-panel" role="tabpanel" aria-labelledby="url-tab" className="job-url-panel"><label className="label" htmlFor="job-url">{t("Link to the job posting")}</label><input id="job-url" className="input" type="url" placeholder="https://boards.greenhouse.io/…" value={jobUrl} onChange={e=>setJobUrl(e.target.value)} maxLength={2000}/><p>{isGuest?t("Automatic URL import is available with an account. Paste the job description to continue your free local preview."):t("Import a Greenhouse or Lever posting. For other websites, paste the job description.")}</p>{!isGuest&&<button className="button button-secondary" onClick={extractJob} disabled={!jobUrl.trim()||extracting}>{extracting?<LoaderCircle size={13} className="spin"/>:<Link2 size={13}/>} {extracting?t("Importing description…"):t("Import description")}</button>}<button className="url-fallback" onClick={()=>setInputMode('text')}>{t("Paste the description instead")} <ArrowRight size={12}/></button></div>}
          <div className="profile-source"><span className="source-icon"><CheckCheck size={15}/></span><div><strong>{ready?profile.fullName:t("Complete your profile")}</strong><small>{t('Master profile · {percent}% complete',{percent:readiness})}</small></div><Link href="/dashboard" aria-label={t("Edit master profile")}><ArrowUpRight size={15}/></Link></div>
          <button className={`button button-primary generate-button ${busy?'generating':''}`} onClick={generate} disabled={busy||!ready||jobDescription.trim().length<80}>{busy?<LoaderCircle className="spin" size={16}/>:<WandSparkles size={16}/>} {busy?(localTailoring?t("Preparing your preview…"):t("Architecting your resume…")):localTailoring?t("Generate local preview"):t("Generate tailored resume")}{!busy&&<ArrowRight size={15}/>}</button>
          <p className="generation-note"><ShieldCheck size={10}/>{localTailoring?(authConfigured?t("Free local preview · sign in for Gemini AI tailoring."):t("Local demo · no AI request or data transfer.")):t("Your profile and job description are sent to Google Gemini for tailoring.")}</p>
          {!ready&&<p className="studio-message"><Link href="/dashboard">{t("Add your name and experience to the Master Vault")} <ArrowUpRight size={12}/></Link></p>}
          <AnimatePresence>{error&&<motion.p className="studio-message error" role="alert" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>{t(error)}</motion.p>}{notice&&<motion.p className="studio-message success" role="status" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>{t(notice)}</motion.p>}</AnimatePresence>
        </section>
        <section className="panel analysis-panel"><div className="analysis-heading"><h2><ScanLine size={15}/>{t("The alignment report")}</h2><span className="badge">{isExample?t("EXAMPLE"):isProfilePreview?t("PROFILE"):shown.mode==='demo'?t("LOCAL PREVIEW"):t("ANALYZED")}</span></div><div className="score-summary"><ScoreRing score={shown.analysis.matchScore} example={isExample} unscored={isProfilePreview}/><div><h3>{isProfilePreview?t("Your profile, in focus."):shown.analysis.matchScore>=80?t("A strong foundation."):shown.analysis.matchScore>=50?t("Room to stand out."):t("A new direction.")}</h3><p>{isProfilePreview?t("Add a job description to check keyword coverage."):t('{matched} of {total} detected keywords found.',{matched:shown.analysis.matchedKeywords.length,total:shown.analysis.matchedKeywords.length+shown.analysis.missingKeywords.length})}</p><span className="score-caption">{isProfilePreview?t("Your CV preview is ready without tailoring."):t("Keyword coverage, not an interview prediction.")}</span></div></div>
          {!isProfilePreview&&<><div className="keyword-heading"><span>{t("OPPORTUNITIES TO STRENGTHEN")}</span><span>{shown.analysis.missingKeywords.length}</span></div><div className="keyword-chips">{shown.analysis.missingKeywords.length?shown.analysis.missingKeywords.slice(0,showKeywords?undefined:6).map(keyword=><span className="keyword missing" key={keyword}>{keyword}<span>+</span></span>):<p className="all-keywords"><Check size={13}/>{t("All detected keywords are present.")}</p>}</div>
          <p className="keyword-disclaimer">{t("Add these only when they reflect real experience.")}</p><button className="keyword-toggle" aria-expanded={showKeywords} onClick={()=>setShowKeywords(!showKeywords)}>{showKeywords?t("Hide keyword details"):t("View keyword details")}<ChevronDown size={13} style={{transform:showKeywords?'rotate(180deg)':undefined}}/></button>{showKeywords&&<div className="keyword-details"><span className="eyebrow">{t("MATCHED KEYWORDS")}</span><div className="keyword-chips">{shown.analysis.matchedKeywords.map(keyword=><span className="keyword matched" key={keyword}><Check size={10}/>{keyword}</span>)}</div><p>{t("Case-insensitive term matching against the resume. This estimate does not reproduce any employer’s ATS scoring.")}</p></div>}</>}
        </section>
        <div className="studio-aside-note"><CircleHelp size={15}/><p>{t("The best resume sounds like you.")}<br/><span>{t("Review every detail before you send it.")}</span></p></div>
      </div>
      <div className="studio-output-column">
        <section className="panel output-panel"><div className="output-header"><div className="studio-tabs output-tabs" role="tablist" aria-label={t("Resume output format")} onKeyDown={e=>tabKeys(e,'output')}><button id="preview-tab" role="tab" aria-selected={outputTab==='preview'} aria-controls="preview-panel" tabIndex={outputTab==='preview'?0:-1} onClick={()=>setOutputTab('preview')}><FileText size={13}/>{t("Resume preview")}</button><button id="latex-tab" role="tab" aria-selected={outputTab==='latex'} aria-controls="latex-panel" tabIndex={outputTab==='latex'?0:-1} onClick={()=>setOutputTab('latex')}><Braces size={14}/>{t("LaTeX source")}</button></div><button className="icon-button" onClick={downloadFinal} disabled={downloading} title={t('Download Final CV')} aria-label={t('Download Final CV')}><ArrowDownToLine size={16}/></button></div>
          <div className="resume-toolbar"><div><span className="resume-document-icon"><FileText size={15}/></span><p>{isExample?t("Your next chapter, on paper"):isProfilePreview?t("Your master CV"):jobTitleLabel}<small>{isExample?t("An example of what’s possible"):isProfilePreview?shown.profile.fullName || t("Your profile draft"):`${shown.profile.fullName}${companyLabel?' · '+companyLabel:''}`}</small></p></div><span className={`document-status ${isExample?'example':''}`}><span className="status-dot"/>{isExample?t("SAMPLE PREVIEW"):isProfilePreview?t("PROFILE PREVIEW"):changed?t("PREVIOUS RESULT"):t("READY TO REVIEW")}</span></div>
          {changed&&<p className="stale-notice">{t("Your job description has changed. Generate again to update this resume.")}</p>}
          {outputTab==='preview'?<div id="preview-panel" className="resume-stage" role="tabpanel" aria-labelledby="preview-tab"><motion.div key={shown.id} initial={reducedMotion?false:{opacity:0,y:5}} animate={{opacity:1,y:0}} transition={{duration:.3}}><ResumePreview profile={shown.profile} watermarked={!paidResumeId}/></motion.div>{busy&&<div className="resume-loading" role="status"><div><Sparkles size={26}/><h3>{t("Finding the right words.")}</h3><p>{t("Aligning your experience with the opportunity.")}</p><LoaderCircle size={20} className="spin"/></div></div>}</div>:<div id="latex-panel" role="tabpanel" aria-labelledby="latex-tab"><LatexEditor code={shown.latex} canExport={Boolean(paidResumeId)} onUnlock={downloadFinal}/></div>}
          <div className="output-footer"><span><ShieldCheck size={12}/>{t("Single-column · Text-based · ATS-friendly")}</span><button onClick={()=>void downloadPdf()} disabled={downloading}>{downloading?t('Downloading…'):t('Download demo PDF')}<ArrowDownToLine size={13}/></button></div>
        </section>
        <div className="final-download-panel"><div><ShieldCheck size={16}/><p>{t(paidResumeId?'Final PDF unlocked for this version.':'Demo PDF includes a forma watermark.')}</p></div><div className="final-download-actions">{!paidResumeId && <button type="button" className="button button-secondary" onClick={downloadFinal}>{t('Remove Watermark')}</button>}<button type="button" className="button button-primary" disabled={downloading} onClick={downloadFinal}>{downloading?<LoaderCircle className="spin" size={15}/>:<ArrowDownToLine size={15}/>} {t(downloading?'Downloading…':'Download Final CV')}</button></div>{checkingPayment && <p role="status">{t('Checking payment…')}</p>}{hasCheckoutSession && !paidVersion && <button type="button" className="button button-secondary" disabled={checkingPayment} onClick={()=>setPaymentCheckRevision(value=>value+1)}>{t('Check payment again')}</button>}{paidVersion && paidVersion!==paidResumeId && <button type="button" className="button button-secondary" disabled={downloading} onClick={()=>void downloadPdf(paidVersion)}>{t('Download paid version')}</button>}</div>
        <section className="tailoring-highlights"><div className="highlights-heading"><span><Sparkles size={14}/>{!resume?t("A thoughtful approach to every detail"):t("What changed, and why")}</span><span>{!resume?t("THE FORMA APPROACH"):t('{count} HIGHLIGHTS',{count:shown.analysis.highlights.length})}</span></div><div className="highlight-items">{(!resume?[t("Your strongest, most relevant achievements come first."),t("Your skills align with the language of the opportunity."),t("Your facts stay yours. A clean format does the rest.")]:shown.analysis.highlights).map((highlight,index)=><div key={index}><span>{String(index+1).padStart(2,'0')}</span><p>{t(highlight)}</p><ArrowUpRight size={12}/></div>)}</div></section>
      </div>
    </div>
    {paymentOpen && <PaymentModal profile={shown.profile} onClose={()=>setPaymentOpen(false)} onPaid={resumeId=>{setEntitlement({key:entitlementKey,resumeId});setPaymentRevision(value=>value+1);setPaymentOpen(false);void downloadPdf(resumeId);}} onAuthRequired={()=>{setPaymentOpen(false);window.location.assign('/login');}}/>}
  </div>;
}
