"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowRight, ArrowUpRight, Braces, Check, Command, FileText, Fingerprint, Layers3, Menu, Plus, ScanLine, ShieldCheck, Sparkles, Target, X } from "lucide-react";

const Background3D = dynamic(() => import("@/components/Background3D"), { ssr: false });

const samples = [
  { role: "Product Designer", score: 92, title: "SENIOR PRODUCT DESIGNER", tags: ["Design systems", "User research", "Figma"], missing: "Accessibility audits", line: "Led a design system adopted across 4 product teams, reducing design-to-development handoff time by 32%.", skill: "Product strategy · Design systems · Research · Figma" },
  { role: "UX Lead", score: 86, title: "UX LEAD", tags: ["Design leadership", "Research", "Strategy"], missing: "Workshop facilitation", line: "Partnered with 4 product teams to unify the customer experience and translate user research into a shared design system.", skill: "User research · Product strategy · Prototyping · Leadership" },
];

const questions = [
  ["What makes a resume ATS-friendly?", "A clear hierarchy, familiar section names, relevant language, and readable text help applicant tracking systems parse your experience. Forma uses a single-column resume without decorative tables or icons. No tool can guarantee a particular employer’s ATS result."],
  ["Will Forma invent experience or qualifications?", "Forma instructs the AI to use only facts in your Master Vault and checks sources, numeric claims, and recognized skill claims. Missing qualifications stay visible as gaps. These checks cannot guarantee every edit preserves the original meaning, so review the draft before sending an application."],
  ["Can I edit and export my resume?", "Yes. Your studio includes a clean resume preview and copyable LaTeX source. Download the .tex file, edit it in Overleaf, and compile a PDF using standard LaTeX packages."],
  ["How is the match score calculated?", "The score measures coverage of the job’s extracted keywords against your profile. It is a transparent guide for reviewing relevance, not a prediction of an interview or a score from the employer’s ATS."],
  ["Can I try it before connecting an AI provider?", "Yes. Open the studio to explore a clearly labeled local demo with sample data. To generate a resume with AI, configure a Google Gemini API key from AI Studio and connect Supabase for secure accounts and cloud profile storage."],
];

export default function LandingPage() {
  const [sampleIndex, setSampleIndex] = useState(0);
  const [mobileNav, setMobileNav] = useState(false);
  const [openQuestion, setOpenQuestion] = useState<number | null>(0);
  const reducedMotion = useReducedMotion();
  const sample = samples[sampleIndex];

  return (
    <main className="land-page" id="main-content">
      <header className="land-header">
        <Link href="/" className="land-brand" aria-label="Forma home"><span className="land-brand-mark"><Layers3 size={23} strokeWidth={1.5} /></span><span>forma<span className="land-brand-dot">.</span></span><span className="land-brand-descriptor">RESUME<br />ARCHITECT</span></Link>
        <nav className="land-nav" aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#features">The toolkit</a><a href="#faq">FAQ</a></nav>
        <div className="land-header-actions"><Link className="land-sign-in" href="/login">Sign in</Link><Link className="land-nav-cta" href="/studio">Open studio <ArrowUpRight size={15} /></Link><button className="land-menu-button" onClick={() => setMobileNav(!mobileNav)} aria-label={mobileNav ? "Close navigation" : "Open navigation"} aria-expanded={mobileNav}>{mobileNav ? <X size={21} /> : <Menu size={21} />}</button></div>
        {mobileNav && <nav className="land-mobile-nav" aria-label="Mobile navigation"><a onClick={() => setMobileNav(false)} href="#how-it-works">How it works</a><a onClick={() => setMobileNav(false)} href="#features">The toolkit</a><a onClick={() => setMobileNav(false)} href="#faq">FAQ</a><Link href="/login">Sign in</Link></nav>}
      </header>

      <section className="land-hero" aria-labelledby="hero-heading">
        <div className="land-hero-grid" />
        <div className="land-hero-glow" />
        <motion.div className="land-hero-copy" initial={reducedMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="land-announcement"><span className="land-announcement-pill"><span className="land-status-dot" />AI-POWERED</span><span>DESIGNED FOR YOUR NEXT CHAPTER</span></div>
          <h1 id="hero-heading">Your experience.<br />A <em>sharper</em> story.</h1>
          <p className="land-hero-description">You’ve done the work. Let it speak for you.<br className="land-desktop-break" /> Turn your experience into a precise, compelling<br className="land-desktop-break" /> resume for every opportunity.</p>
          <div className="land-hero-actions"><Link href="/studio" className="land-primary-button">Craft your resume <ArrowUpRight size={19} /></Link><a className="land-text-button" href="#how-it-works"><span className="land-play-icon"><ArrowDown size={15} /></span>See how it works</a></div>
          <div className="land-hero-assurance"><span><Check size={13} /> Free to explore</span><span><Check size={13} /> Grounded in your experience</span></div>
          <div className="land-mini-label"><span className="land-mini-rule" />BUILT FOR THE NEXT STEP. AND THE ONE AFTER.</div>
        </motion.div>

        <motion.div className="land-product-scene" initial={reducedMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.15 }}>
          <Background3D />
          <div className="land-orbit land-orbit-one" /><div className="land-orbit land-orbit-two" />
          <div className="land-ai-label"><Sparkles size={13} /><span>INTELLIGENCE, MEET INTENTION.</span></div>
          <div className="land-document">
            <div className="land-document-meta"><span>FORMA / TAILORED RESUME</span><span>01</span></div>
            <h2>Alex Morgan<span>{sample.title}</span></h2>
            <p className="land-document-contact">Brooklyn, NY&nbsp; · &nbsp;alex@example.com&nbsp; · &nbsp;alexmorgan.design</p>
            <div className="land-document-section"><h3>PROFILE</h3><p>Thoughtful product designer translating complex problems into clear, useful digital experiences. Six years building products at the intersection of people and technology.</p></div>
            <div className="land-document-section"><h3>EXPERIENCE</h3><div className="land-document-job"><strong>Senior Product Designer</strong><span>2022 — PRESENT</span></div><div className="land-document-company">Meridian Labs · New York, NY</div><ul><li className="land-tailored-bullet">{sample.line}</li><li>Redesigned the onboarding journey, increasing activation by 24% through iterative usability testing.</li><li>Collaborated with engineering and product to deliver accessible, responsive customer experiences.</li></ul></div>
            <div className="land-document-section land-document-second-job"><div className="land-document-job"><strong>Product Designer</strong><span>2020 — 2022</span></div><div className="land-document-company">Studio North · Remote</div><ul><li>Designed end-to-end web experiences from discovery through launch for a portfolio of early-stage products.</li></ul></div>
            <div className="land-document-section land-document-skills"><h3>CORE COMPETENCIES</h3><p>{sample.skill}</p></div>
            <div className="land-document-footer"><span>Clear by design. Confident by default.</span><span>1 / 1</span></div>
          </div>
          <div className="land-floating-chip"><span className="land-chip-icon"><Braces size={17} /></span><div><strong>Beautiful in every format.</strong><span>ATS-friendly. LaTeX-ready.</span></div><Check size={14} /></div>
          <div className="land-match-card">
            <div className="land-match-heading"><span><Target size={14} /> OPPORTUNITY ALIGNMENT</span><span className="land-sample-tag">SAMPLE</span></div>
            <div className="land-match-content"><div className="land-score-ring" style={{ "--score": `${sample.score}%` } as CSSProperties}><div><strong>{sample.score}<span>%</span></strong><span>keyword fit</span></div></div><div className="land-match-detail"><span className="land-match-eyebrow">A more focused story.</span><strong>Experience, aligned.</strong><p>Your strengths. The right language.</p></div></div>
            <div className="land-sample-tabs" aria-label="Choose sample target role">{samples.map((item, index) => <button key={item.role} className={sampleIndex === index ? "land-sample-tab land-active" : "land-sample-tab"} onClick={() => setSampleIndex(index)} aria-pressed={sampleIndex === index}>{item.role}<ArrowUpRight size={12} /></button>)}</div>
            <div className="land-keyword-tags" aria-live="polite">{sample.tags.map(tag => <span key={tag}><Check size={10} />{tag}</span>)}</div>
            <p className="land-missing-keyword">Worth reviewing <span>{sample.missing}</span></p>
          </div>
          <span className="land-scene-caption">INTERACTIVE EXAMPLE · FICTIONAL PROFILE</span>
        </motion.div>
      </section>

      <section className="land-capabilities-bar" aria-label="Product capabilities"><span>A LITTLE INTELLIGENCE.<br /><strong>A LOT MORE POSSIBILITY.</strong></span><div><ScanLine size={21} />ATS-conscious formatting</div><div><Fingerprint size={21} />Grounded in your experience</div><div><Braces size={21} />Editable LaTeX export</div><div><ShieldCheck size={21} />You control your data</div></section>

      <section className="land-process land-section" id="how-it-works" aria-labelledby="process-heading">
        <div className="land-section-heading"><div><span className="land-eyebrow">THE PROCESS</span><h2 id="process-heading">Less rewriting.<br /><span>More possibility.</span></h2></div><p>One foundation for your entire career.<br />A considered resume for every next move.</p></div>
        <div className="land-process-grid">
          <article className="land-step"><div className="land-step-top"><span className="land-step-icon"><Layers3 size={21} /></span><span>01 / COLLECT</span></div><h3>Your career, in one place.</h3><p>Build your Master Vault with your experience, skills, and achievements. A living foundation that grows with you.</p><div className="land-vault-mini"><span><span className="land-mini-square" /><span>Master profile</span><span className="land-mini-status">Your foundation</span></span><div><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><small>Every detail has a place.</small></div></article>
          <article className="land-step"><div className="land-step-top"><span className="land-step-icon"><ScanLine size={21} /></span><span>02 / CONNECT</span></div><h3>Find the common ground.</h3><p>Paste a job description or posting link. Discover the skills that connect your experience to the opportunity.</p><div className="land-connect-mini"><span>YOUR EXPERIENCE</span><div className="land-connect-diagram"><span /><i /><span><Sparkles size={16} /></span><i /><span /></div><span>YOUR NEXT OPPORTUNITY</span></div></article>
          <article className="land-step"><div className="land-step-top"><span className="land-step-icon"><FileText size={21} /></span><span>03 / CREATE</span></div><h3>Make the right impression.</h3><p>Review a sharper, focused draft. Understand every change, then take your polished LaTeX wherever you work.</p><div className="land-export-mini"><div><FileText size={18} /><span>your-next-chapter.tex<small>Ready for your finishing touches</small></span></div><ArrowUpRight size={19} /></div></article>
        </div>
      </section>

      <section className="land-features land-section" id="features" aria-labelledby="features-heading"><div className="land-section-heading"><div><span className="land-eyebrow">PURPOSEFUL BY DESIGN</span><h2 id="features-heading">All signal.<br /><span>No unnecessary noise.</span></h2></div><Link href="/studio" className="land-text-button">Explore the studio <ArrowRight size={17} /></Link></div><div className="land-feature-grid"><article className="land-feature-featured"><div className="land-feature-label"><Sparkles size={16} /> INTELLIGENT TAILORING</div><h3>A better expression<br />of what’s already you.</h3><p>Bring your experience into focus with role-specific language and stronger structure. See missing keywords and the reasoning behind each change.</p><div className="land-before-after"><div><span>THE EXPERIENCE</span><p>“Built our team’s component library.”</p></div><ArrowDown size={18} /><div><span>THE SHARPER STORY</span><p>“Developed a reusable component library to create a consistent experience across the team’s products.”</p></div><small>Illustrative rewrite · No invented metrics.</small></div></article><article className="land-feature-small"><div className="land-feature-label"><Braces size={16} /> OPEN BY NATURE</div><h3>Beautiful output.<br />Full ownership.</h3><p>Clean, single-column previews and standard LaTeX. Your resume stays editable, portable, and entirely yours.</p><div className="land-code-preview"><span>\documentclass</span>{"{article}"}<br /><span>\begin</span>{"{document}"}<br /><i>  % Your next chapter starts here</i><br /><span>\section*</span>{"{Experience}"}<br /><span>\end</span>{"{document}"}</div></article><article className="land-feature-small land-feature-demo"><div className="land-feature-label"><Command size={16} /> START EXPLORING</div><h3>A thoughtful toolkit.<br />An open starting point.</h3><p>Explore the local demo for free. Connect Google Gemini and Supabase when you’re ready for your real workflow.</p><div className="land-feature-demo-bottom"><span><strong>$0</strong> to explore<span>Gemini limits and pricing apply.</span></span><Link href="/studio" aria-label="Try the free local demo"><ArrowUpRight size={23} /></Link></div></article></div></section>

      <section className="land-faq land-section" id="faq" aria-labelledby="faq-heading"><div><span className="land-eyebrow">GOOD QUESTIONS</span><h2 id="faq-heading">A little clarity<br /><span>before you begin.</span></h2><p>Your career deserves a thoughtful approach.<br />Here’s what to expect from Forma.</p></div><div className="land-faq-list">{questions.map(([question, answer], index) => <article className={openQuestion === index ? "land-faq-item land-open" : "land-faq-item"} key={question}><h3><button onClick={() => setOpenQuestion(openQuestion === index ? null : index)} aria-expanded={openQuestion === index} aria-controls={`land-faq-${index}`}>{question}<Plus size={18} /></button></h3><div id={`land-faq-${index}`} hidden={openQuestion !== index}><p>{answer}</p></div></article>)}</div></section>

      <section className="land-bottom-cta"><div className="land-cta-orbit" /><span className="land-eyebrow"><span className="land-status-dot" /> YOUR NEXT CHAPTER</span><h2>Good experience.<br /><em>Great first impression.</em></h2><p>Make room for what’s next.</p><Link href="/studio" className="land-primary-button">Let’s build your story <ArrowUpRight size={19} /></Link></section>
      <footer className="land-footer"><Link href="/" className="land-brand"><span className="land-brand-mark"><Layers3 size={20} strokeWidth={1.5} /></span><span>forma<span className="land-brand-dot">.</span></span></Link><span>Thoughtfully built for your next chapter.</span><div><a href="#how-it-works">How it works</a><Link href="/dashboard">Master Vault</Link><Link href="/studio">Studio <ArrowUpRight size={12} /></Link></div></footer>
    </main>
  );
}
