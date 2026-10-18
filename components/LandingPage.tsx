"use client";

import dynamic from "next/dynamic";
import { useI18n } from '@/lib/i18n';
import Link from "next/link";
import LanguageToggle from "@/components/LanguageToggle";
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
  ["Can I edit and export my resume?", "Yes. Create and save drafts for free, and download a watermarked demo PDF. Sign in and pay once to unlock the clean PDF and LaTeX export for that resume."],
  ["How is the match score calculated?", "The score measures coverage of the job’s extracted keywords against your profile. It is a transparent guide for reviewing relevance, not a prediction of an interview or a score from the employer’s ATS."],
  ["What does Forma cost?", "Guest editing and watermarked demo PDFs are free. A clean PDF and LaTeX export for one resume costs 5 PLN, $1.25 USD, or €1.15 EUR, depending on your selected currency. This is a one-time purchase, not a subscription."],
];

export default function LandingPage() {
  const {t}=useI18n();
  const [sampleIndex, setSampleIndex] = useState(0);
  const [mobileNav, setMobileNav] = useState(false);
  const [openQuestion, setOpenQuestion] = useState<number | null>(0);
  const reducedMotion = useReducedMotion();
  const sample = samples[sampleIndex];

  return (
    <main className="land-page" id="main-content">
      <header className="land-header">
        <Link href="/" className="land-brand" aria-label={t("Forma home")}><span className="land-brand-mark"><Layers3 size={23} strokeWidth={1.5} /></span><span>forma<span className="land-brand-dot">.</span></span><span className="land-brand-descriptor">{t("RESUME")}<br />{t("ARCHITECT")}</span></Link>
        <nav className="land-nav" aria-label={t("Main navigation")}><a href="#how-it-works">{t("How it works")}</a><a href="#features">{t("The toolkit")}</a><a href="#faq">{t("FAQ")}</a></nav>
        <div className="land-header-actions"><LanguageToggle /><Link className="land-sign-in" href="/login">{t("Sign in")}</Link><Link className="land-nav-cta" href="/studio">{t("Open studio")} <ArrowUpRight size={15} /></Link><button className="land-menu-button" onClick={() => setMobileNav(!mobileNav)} aria-label={t(mobileNav ? "Close navigation" : "Open navigation")} aria-expanded={mobileNav}>{mobileNav ? <X size={21} /> : <Menu size={21} />}</button></div>
        {mobileNav && <nav className="land-mobile-nav" aria-label={t("Mobile navigation")}><a onClick={() => setMobileNav(false)} href="#how-it-works">{t("How it works")}</a><a onClick={() => setMobileNav(false)} href="#features">{t("The toolkit")}</a><a onClick={() => setMobileNav(false)} href="#faq">{t("FAQ")}</a><Link href="/login">{t("Sign in")}</Link></nav>}
      </header>

      <section className="land-hero" aria-labelledby="hero-heading">
        <div className="land-hero-grid" />
        <div className="land-hero-glow" />
        <motion.div className="land-hero-copy" initial={reducedMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="land-announcement"><span className="land-announcement-pill"><span className="land-status-dot" />{t("AI-POWERED")}</span><span>{t("DESIGNED FOR YOUR NEXT CHAPTER")}</span></div>
          <h1 id="hero-heading">{t("Your experience.")}<br />{t("A")} <em>{t("sharper")}</em> {t("story.")}</h1>
          <p className="land-hero-description">{t("You’ve done the work. Let it speak for you.")}<br className="land-desktop-break" /> {t("Turn your experience into a precise, compelling")}<br className="land-desktop-break" /> {t("resume for every opportunity.")}</p>
          <div className="land-hero-actions"><Link href="/studio" className="land-primary-button">{t("Craft your resume")} <ArrowUpRight size={19} /></Link><a className="land-text-button" href="#how-it-works"><span className="land-play-icon"><ArrowDown size={15} /></span>{t("See how it works")}</a></div>
          <div className="land-hero-assurance"><span><Check size={13} /> {t("Free guest drafts")}</span><span><Check size={13} /> {t("Grounded in your experience")}</span></div>
          <div className="land-mini-label"><span className="land-mini-rule" />{t("BUILT FOR THE NEXT STEP. AND THE ONE AFTER.")}</div>
        </motion.div>

        <motion.div className="land-product-scene" initial={reducedMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.15 }}>
          <Background3D />
          <div className="land-orbit land-orbit-one" /><div className="land-orbit land-orbit-two" />
          <div className="land-ai-label"><Sparkles size={13} /><span>{t("INTELLIGENCE, MEET INTENTION.")}</span></div>
          <div className="land-document"><span className="land-document-watermark" aria-label={t("Watermarked demo preview")}>forma</span>
            <div className="land-document-meta"><span>{t("FORMA / TAILORED RESUME")}</span><span>01</span></div>
            <h2>Alex Morgan<span>{t(sample.title)}</span></h2>
            <p className="land-document-contact">Brooklyn, NY&nbsp; · &nbsp;alex@example.com&nbsp; · &nbsp;alexmorgan.design</p>
            <div className="land-document-section"><h3>{t("PROFILE")}</h3><p>{t("Thoughtful product designer translating complex problems into clear, useful digital experiences. Six years building products at the intersection of people and technology.")}</p></div>
            <div className="land-document-section"><h3>{t("EXPERIENCE")}</h3><div className="land-document-job"><strong>{t("Senior Product Designer")}</strong><span>{t("2022 — PRESENT")}</span></div><div className="land-document-company">{t("Meridian Labs · New York, NY")}</div><ul><li className="land-tailored-bullet">{t(sample.line)}</li><li>{t("Redesigned the onboarding journey, increasing activation by 24% through iterative usability testing.")}</li><li>{t("Collaborated with engineering and product to deliver accessible, responsive customer experiences.")}</li></ul></div>
            <div className="land-document-section land-document-second-job"><div className="land-document-job"><strong>{t("Product Designer")}</strong><span>2020 — 2022</span></div><div className="land-document-company">{t("Studio North · Remote")}</div><ul><li>{t("Designed end-to-end web experiences from discovery through launch for a portfolio of early-stage products.")}</li></ul></div>
            <div className="land-document-section land-document-skills"><h3>{t("CORE COMPETENCIES")}</h3><p>{t(sample.skill)}</p></div>
            <div className="land-document-footer"><span>{t("Clear by design. Confident by default.")}</span><span>1 / 1</span></div>
          </div>
          <div className="land-floating-chip"><span className="land-chip-icon"><Braces size={17} /></span><div><strong>{t("Beautiful in every format.")}</strong><span>{t("ATS-friendly. LaTeX-ready.")}</span></div><Check size={14} /></div>
          <div className="land-match-card">
            <div className="land-match-heading"><span><Target size={14} /> {t("OPPORTUNITY ALIGNMENT")}</span><span className="land-sample-tag">{t("SAMPLE")}</span></div>
            <div className="land-match-content"><div className="land-score-ring" style={{ "--score": `${sample.score}%` } as CSSProperties}><div><strong>{sample.score}<span>%</span></strong><span>{t("keyword fit")}</span></div></div><div className="land-match-detail"><span className="land-match-eyebrow">{t("A more focused story.")}</span><strong>{t("Experience, aligned.")}</strong><p>{t("Your strengths. The right language.")}</p></div></div>
            <div className="land-sample-tabs" aria-label={t("Choose sample target role")}>{samples.map((item, index) => <button key={item.role} className={sampleIndex === index ? "land-sample-tab land-active" : "land-sample-tab"} onClick={() => setSampleIndex(index)} aria-pressed={sampleIndex === index}>{t(item.role)}<ArrowUpRight size={12} /></button>)}</div>
            <div className="land-keyword-tags" aria-live="polite">{sample.tags.map(tag => <span key={tag}><Check size={10} />{t(tag)}</span>)}</div>
            <p className="land-missing-keyword">{t("Worth reviewing")} <span>{t(sample.missing)}</span></p>
          </div>
          <span className="land-scene-caption">{t("INTERACTIVE EXAMPLE · FICTIONAL PROFILE")}</span>
        </motion.div>
      </section>

      <section className="land-capabilities-bar" aria-label={t("Product capabilities")}><span>{t("A LITTLE INTELLIGENCE.")}<br /><strong>{t("A LOT MORE POSSIBILITY.")}</strong></span><div><ScanLine size={21} />{t("ATS-conscious formatting")}</div><div><Fingerprint size={21} />{t("Grounded in your experience")}</div><div><Braces size={21} />{t("Editable LaTeX export")}</div><div><ShieldCheck size={21} />{t("You control your data")}</div></section>

      <section className="land-process land-section" id="how-it-works" aria-labelledby="process-heading">
        <div className="land-section-heading"><div><span className="land-eyebrow">{t("THE PROCESS")}</span><h2 id="process-heading">{t("Less rewriting.")}<br /><span>{t("More possibility.")}</span></h2></div><p>{t("One foundation for your entire career.")}<br />{t("A considered resume for every next move.")}</p></div>
        <div className="land-process-grid">
          <article className="land-step"><div className="land-step-top"><span className="land-step-icon"><Layers3 size={21} /></span><span>{t("01 / COLLECT")}</span></div><h3>{t("Your career, in one place.")}</h3><p>{t("Build your Master Vault with your experience, skills, and achievements. A living foundation that grows with you.")}</p><div className="land-vault-mini"><span><span className="land-mini-square" /><span>{t("Master profile")}</span><span className="land-mini-status">{t("Your foundation")}</span></span><div><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><small>{t("Every detail has a place.")}</small></div></article>
          <article className="land-step"><div className="land-step-top"><span className="land-step-icon"><ScanLine size={21} /></span><span>{t("02 / CONNECT")}</span></div><h3>{t("Find the common ground.")}</h3><p>{t("Paste a job description or posting link. Discover the skills that connect your experience to the opportunity.")}</p><div className="land-connect-mini"><span>{t("YOUR EXPERIENCE")}</span><div className="land-connect-diagram"><span /><i /><span><Sparkles size={16} /></span><i /><span /></div><span>{t("YOUR NEXT OPPORTUNITY")}</span></div></article>
          <article className="land-step"><div className="land-step-top"><span className="land-step-icon"><FileText size={21} /></span><span>{t("03 / CREATE")}</span></div><h3>{t("Make the right impression.")}</h3><p>{t("Review your draft for free. Download a watermarked demo, then unlock your clean PDF and LaTeX for a one-time fee.")}</p><div className="land-export-mini"><div><FileText size={18} /><span>your-next-chapter.pdf<small>{t("Ready for your finishing touches")}</small></span></div><ArrowUpRight size={19} /></div></article>
        </div>
      </section>

      <section className="land-features land-section" id="features" aria-labelledby="features-heading"><div className="land-section-heading"><div><span className="land-eyebrow">{t("PURPOSEFUL BY DESIGN")}</span><h2 id="features-heading">{t("All signal.")}<br /><span>{t("No unnecessary noise.")}</span></h2></div><Link href="/studio" className="land-text-button">{t("Explore the studio")} <ArrowRight size={17} /></Link></div><div className="land-feature-grid"><article className="land-feature-featured"><div className="land-feature-label"><Sparkles size={16} /> {t("INTELLIGENT TAILORING")}</div><h3>{t("A better expression")}<br />{t("of what’s already you.")}</h3><p>{t("Bring your experience into focus with role-specific language and stronger structure. See missing keywords and the reasoning behind each change.")}</p><div className="land-before-after"><div><span>{t("THE EXPERIENCE")}</span><p>{t("“Built our team’s component library.”")}</p></div><ArrowDown size={18} /><div><span>{t("THE SHARPER STORY")}</span><p>{t("“Developed a reusable component library to create a consistent experience across the team’s products.”")}</p></div><small>{t("Illustrative rewrite · No invented metrics.")}</small></div></article><article className="land-feature-small"><div className="land-feature-label"><Braces size={16} /> {t("OPEN BY NATURE")}</div><h3>{t("Beautiful output.")}<br />{t("Full ownership.")}</h3><p>{t("Clean, single-column previews and standard LaTeX. Unlock a clean PDF and LaTeX export with a one-time purchase.")}</p><div className="land-code-preview"><span>\documentclass</span>{"{article}"}<br /><span>\begin</span>{"{document}"}<br /><i> {t("% Your next chapter starts here")}</i><br /><span>\section*</span>{"{Experience}"}<br /><span>\end</span>{"{document}"}</div></article><article className="land-feature-small land-feature-demo"><div className="land-feature-label"><Command size={16} /> {t("START EXPLORING")}</div><h3>{t("A thoughtful toolkit.")}<br />{t("An open starting point.")}</h3><p>{t("Build and save your draft for free. Preview or download a demo PDF with the forma watermark. Pay once when your final resume is ready.")}</p><div className="land-feature-demo-bottom"><span><strong>{t("5 PLN")}</strong> {t("per final resume")}<span>{t("$1.25 USD / €1.15 EUR · One-time payment")}</span></span><Link href="/studio" aria-label={t("Start your free guest draft")}><ArrowUpRight size={23} /></Link></div></article></div></section>

      <section className="land-faq land-section" id="faq" aria-labelledby="faq-heading"><div><span className="land-eyebrow">{t("GOOD QUESTIONS")}</span><h2 id="faq-heading">{t("A little clarity")}<br /><span>{t("before you begin.")}</span></h2><p>{t("Your career deserves a thoughtful approach.")}<br />{t("Here’s what to expect from Forma.")}</p></div><div className="land-faq-list">{questions.map(([question, answer], index) => <article className={openQuestion === index ? "land-faq-item land-open" : "land-faq-item"} key={question}><h3><button onClick={() => setOpenQuestion(openQuestion === index ? null : index)} aria-expanded={openQuestion === index} aria-controls={`land-faq-${index}`}>{t(question)}<Plus size={18} /></button></h3><div id={`land-faq-${index}`} hidden={openQuestion !== index}><p>{t(answer)}</p></div></article>)}</div></section>

      <section className="land-bottom-cta"><div className="land-cta-orbit" /><span className="land-eyebrow"><span className="land-status-dot" /> {t("YOUR NEXT CHAPTER")}</span><h2>{t("Good experience.")}<br /><em>{t("Great first impression.")}</em></h2><p>{t("Make room for what’s next.")}</p><Link href="/studio" className="land-primary-button">{t("Let’s build your story")} <ArrowUpRight size={19} /></Link></section>
      <footer className="land-footer"><Link href="/" className="land-brand"><span className="land-brand-mark"><Layers3 size={20} strokeWidth={1.5} /></span><span>forma<span className="land-brand-dot">.</span></span></Link><span>{t("Thoughtfully built for your next chapter.")}</span><div><a href="#how-it-works">{t("How it works")}</a><Link href="/dashboard">{t("Master Vault")}</Link><Link href="/studio">{t("Studio")} <ArrowUpRight size={12} /></Link></div></footer>
    </main>
  );
}
