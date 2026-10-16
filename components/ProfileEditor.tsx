'use client';

import Link from 'next/link';
import { useEffect, useId, useState, useTransition, type InputHTMLAttributes, type ReactNode } from 'react';
import { ArrowRight, Award, BookOpen, BriefcaseBusiness, Check, CheckCircle2, ChevronRight, Code2, FolderKanban, Loader2, Plus, Save, ShieldCheck, Sparkles, Trash2, UserRound, X } from 'lucide-react';
import { saveProfile } from '@/app/actions/profile';
import { profileCompleteness } from '@/lib/demo';
import { profileSchema } from '@/lib/schemas';
import { useWorkspace } from '@/lib/store';
import type { Certification, Education, Experience, Project, UserProfile } from '@/types';

const sections = [
  { id: 'personal', name: 'Personal information', icon: UserRound, description: 'The introduction before the introduction.' },
  { id: 'experience', name: 'Work experience', icon: BriefcaseBusiness, description: 'Tell the story of the impact you have made.' },
  { id: 'education', name: 'Education', icon: BookOpen, description: 'Your foundation for what comes next.' },
  { id: 'skills', name: 'Skills & expertise', icon: Code2, description: 'The things you know. The things you do best.' },
  { id: 'projects', name: 'Projects', icon: FolderKanban, description: 'Work that deserves a spotlight of its own.' },
  { id: 'certifications', name: 'Certifications', icon: Award, description: 'Give your credentials a place to shine.' },
] as const;
type Section = typeof sections[number]['id'];

function TextField({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = useId();
  return <label className="field" htmlFor={id}><span className="label">{label}</span><input id={id} className="input" {...props} />{hint && <span className="profile-field-hint">{hint}</span>}</label>;
}

function TextArea({ label, value, onChange, placeholder, rows = 4, hint }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; rows?: number; hint?: string }) {
  const id = useId();
  return <label className="field" htmlFor={id}><span className="label">{label}</span><textarea id={id} className="textarea" rows={rows} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} />{hint && <span className="profile-field-hint">{hint}</span>}</label>;
}

function Entry({ title, detail, onRemove, children }: { title: string; detail?: string; onRemove: () => void; children: ReactNode }) {
  return <section className="profile-entry"><div className="profile-entry-header"><div><h3>{title}</h3>{detail && <p>{detail}</p>}</div><button type="button" className="profile-icon-button profile-remove" onClick={onRemove} aria-label={`Remove ${title}`} title={`Remove ${title}`}><Trash2 size={16} /></button></div><div className="profile-entry-fields">{children}</div></section>;
}

function EmptyState({ noun }: { noun: string }) {
  return <div className="profile-empty"><div className="profile-empty-icon"><Plus size={22} /></div><h3>A little more about your journey.</h3><p>Add your first {noun} to give Forma a fuller picture.</p></div>;
}

function normalizeProfile(profile: UserProfile): UserProfile {
  return { ...profile, skills: profile.skills.map(skill => skill.trim()).filter(Boolean), experience: profile.experience.map(item => ({ ...item, bullets: item.bullets.map(line => line.trim()).filter(Boolean), endDate: item.current ? '' : item.endDate })), projects: profile.projects.map(item => ({ ...item, bullets: item.bullets.map(line => line.trim()).filter(Boolean), technologies: item.technologies.map(tech => tech.trim()).filter(Boolean) })) };
}

export function ProfileEditor() {
  const { profile, setProfile, isDemo } = useWorkspace();
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [active, setActive] = useState<Section>('personal');
  const [skill, setSkill] = useState('');
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  useEffect(() => { setDraft(profile); }, [profile]);
  const completeness = profileCompleteness(draft);
  const dirty = JSON.stringify(profile) !== JSON.stringify(draft);
  const currentSection = sections.find(section => section.id === active)!;
  const update = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => { setDraft(current => ({ ...current, [key]: value })); setStatus(null); };
  const updateExperience = (id: string, changes: Partial<Experience>) => update('experience', draft.experience.map(item => item.id === id ? { ...item, ...changes } : item));
  const updateEducation = (id: string, changes: Partial<Education>) => update('education', draft.education.map(item => item.id === id ? { ...item, ...changes } : item));
  const updateProject = (id: string, changes: Partial<Project>) => update('projects', draft.projects.map(item => item.id === id ? { ...item, ...changes } : item));
  const updateCertification = (id: string, changes: Partial<Certification>) => update('certifications', draft.certifications.map(item => item.id === id ? { ...item, ...changes } : item));
  const addSkill = () => {
    const additions = skill.split(',').map(value => value.trim()).filter(Boolean);
    const next = [...draft.skills];
    for (const value of additions) if (!next.some(existing => existing.toLowerCase() === value.toLowerCase())) next.push(value);
    update('skills', next); setSkill('');
  };
  const save = () => startTransition(async () => {
    const clean = normalizeProfile(draft);
    const validation = profileSchema.safeParse(clean);
    if (!validation.success) { setStatus({ kind: 'error', text: validation.error.issues[0]?.message || 'Please check your profile details.' }); return; }
    try {
      if (!isDemo) {
        const result = await saveProfile(clean);
        if (!result.ok) { setStatus({ kind: 'error', text: result.error || 'Your profile could not be saved. Please try again.' }); return; }
      }
      const persisted = setProfile(clean); setDraft(clean);
      setStatus({ kind: persisted ? 'success' : 'error', text: isDemo ? persisted ? 'Saved on this device. Demo profiles are not synced to an account.' : 'Updated in this view. Browser storage is unavailable; changes will be lost when you leave or reload.' : 'Your master profile is saved securely.' });
    } catch { setStatus({ kind: 'error', text: 'We could not save your profile. Check your connection and try again.' }); }
  });
  const counts: Record<Section, number> = { personal: draft.fullName ? 1 : 0, experience: draft.experience.length, education: draft.education.length, skills: draft.skills.length, projects: draft.projects.length, certifications: draft.certifications.length };

  return <div className="profile-workspace">
    <div className="profile-heading"><div><div className="eyebrow">YOUR CAREER, CONNECTED</div><h1>Master Vault<span className="profile-heading-dot">.</span></h1><p>Your entire career. One source of truth.</p></div><Link href="/studio" className="button button-secondary">Open studio <ArrowRight size={16} /></Link></div>
    <div className="profile-layout">
      <aside className="profile-sidebar">
        <div className="profile-completeness panel"><div className="profile-completeness-top"><span className="profile-small-label">PROFILE STRENGTH</span><ShieldCheck size={17} /></div><div className="profile-completeness-number">{completeness}<span>%</span><span className="profile-completeness-word">complete</span></div><div className="profile-progress" role="progressbar" aria-label="Master profile completeness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completeness}><div style={{ width: `${completeness}%` }} /></div><p>{completeness === 100 ? 'A strong foundation for your next move.' : 'A richer profile makes every tailored resume stronger.'}</p></div>
        <nav className="profile-navigation" aria-label="Profile sections">{sections.map(section => <button key={section.id} type="button" onClick={() => setActive(section.id)} className={`profile-nav-item ${active === section.id ? 'is-active' : ''}`} aria-current={active === section.id ? 'page' : undefined}><section.icon size={18} /><span>{section.name}</span>{counts[section.id] > 0 ? <span className="profile-nav-count">{section.id === 'personal' ? <Check size={12} /> : counts[section.id]}</span> : <ChevronRight size={13} />}</button>)}</nav>
        <div className="profile-note"><Sparkles size={18} /><h3>Your story stays yours.</h3><p>Keeps your original facts as the source. Review AI edits before sending.</p></div>
        {isDemo && <div className="profile-demo-notice"><span className="badge">DEMO WORKSPACE</span><p>Changes are stored in this browser. <Link href="/login">Create an account</Link> for secure cloud saving.</p></div>}
      </aside>
      <form className="profile-main panel" onSubmit={event => { event.preventDefault(); save(); }}>
        <div className="profile-section-heading"><div className="profile-section-icon"><currentSection.icon size={21} /></div><div><h2>{currentSection.name}</h2><p>{currentSection.description}</p></div></div>
        <div className="profile-form-body">
          {active === 'personal' && <div className="profile-personal-fields">
            <div className="profile-avatar-line"><div className="profile-avatar" aria-hidden="true">{draft.fullName.split(' ').filter(Boolean).map(word => word[0]).slice(0, 2).join('') || <UserRound size={24} />}</div><div><strong>{draft.fullName || 'Your next chapter starts here'}</strong><p>{draft.title || 'Add a title to introduce yourself'}</p></div><span className="profile-private"><ShieldCheck size={13} /> Private profile</span></div>
            <div className="profile-grid"><TextField label="Full name" autoComplete="name" value={draft.fullName} onChange={event => update('fullName', event.target.value)} placeholder="Alex Morgan" /><TextField label="Professional title" value={draft.title} onChange={event => update('title', event.target.value)} placeholder="Senior Product Designer" /><TextField label="Email address" type="email" autoComplete="email" value={draft.email} onChange={event => update('email', event.target.value)} placeholder="alex@example.com" /><TextField label="Phone number" type="tel" autoComplete="tel" value={draft.phone} onChange={event => update('phone', event.target.value)} placeholder="+1 (555) 123-4567" /><TextField label="Location" autoComplete="address-level2" value={draft.location} onChange={event => update('location', event.target.value)} placeholder="San Francisco, CA" /><TextField label="Personal website" type="url" value={draft.website} onChange={event => update('website', event.target.value)} placeholder="https://yourportfolio.com" /><TextField label="LinkedIn" type="url" value={draft.linkedin} onChange={event => update('linkedin', event.target.value)} placeholder="https://linkedin.com/in/alex" /><TextField label="GitHub" type="url" value={draft.github} onChange={event => update('github', event.target.value)} placeholder="https://github.com/alex" /></div>
            <div className="profile-form-divider" /><TextArea label="Professional summary" value={draft.summary} onChange={value => update('summary', value)} rows={5} placeholder="A few sentences about your experience, strengths, and the impact you bring." hint="Think of this as your career in a paragraph. Forma will tailor it to each role." />
          </div>}
          {active === 'experience' && <div className="profile-entries">
            {!draft.experience.length && <EmptyState noun="work experience" />}
            {draft.experience.map((item, index) => <Entry key={item.id} title={item.role || `Experience ${index + 1}`} detail={item.company || 'Your next career highlight'} onRemove={() => update('experience', draft.experience.filter(entry => entry.id !== item.id))}><div className="profile-grid"><TextField label="Job title" value={item.role} onChange={event => updateExperience(item.id, { role: event.target.value })} placeholder="Senior Software Engineer" /><TextField label="Company" value={item.company} onChange={event => updateExperience(item.id, { company: event.target.value })} placeholder="Company name" /><TextField label="Location" value={item.location} onChange={event => updateExperience(item.id, { location: event.target.value })} placeholder="Remote / City, Country" /><div className="profile-date-pair"><TextField label="Start date" type="month" value={item.startDate} onChange={event => updateExperience(item.id, { startDate: event.target.value })} /><TextField label="End date" type="month" disabled={item.current} value={item.current ? '' : item.endDate} min={item.startDate} onChange={event => updateExperience(item.id, { endDate: event.target.value })} /></div></div><label className="profile-checkbox"><input type="checkbox" checked={item.current} onChange={event => updateExperience(item.id, { current: event.target.checked })} /><span>I currently work here</span></label><TextArea label="Achievements & impact" value={item.bullets.join('\n')} onChange={value => updateExperience(item.id, { bullets: value.split('\n') })} rows={5} placeholder={'Led a team of 5 engineers to ship a customer dashboard.\nReduced page load time by 35% through targeted performance improvements.'} hint="One achievement per line. Include real numbers and outcomes wherever you can." /></Entry>)}
            <button className="profile-add" type="button" onClick={() => update('experience', [...draft.experience, { id: crypto.randomUUID(), company: '', role: '', location: '', startDate: '', endDate: '', current: false, bullets: [] }])}><Plus size={17} /> Add work experience</button>
          </div>}
          {active === 'education' && <div className="profile-entries">
            {!draft.education.length && <EmptyState noun="education entry" />}
            {draft.education.map((item, index) => <Entry key={item.id} title={item.school || `Education ${index + 1}`} detail={item.degree} onRemove={() => update('education', draft.education.filter(entry => entry.id !== item.id))}><div className="profile-grid"><TextField label="School or university" value={item.school} onChange={event => updateEducation(item.id, { school: event.target.value })} placeholder="University name" /><TextField label="Degree" value={item.degree} onChange={event => updateEducation(item.id, { degree: event.target.value })} placeholder="Bachelor of Science" /><TextField label="Field of study" value={item.field} onChange={event => updateEducation(item.id, { field: event.target.value })} placeholder="Computer Science" /><div className="profile-date-pair"><TextField label="Start date" placeholder="YYYY or YYYY-MM" pattern="[0-9]{4}(-[0-9]{2})?" value={item.startDate} onChange={event => updateEducation(item.id, { startDate: event.target.value })} /><TextField label="End date" placeholder="YYYY or YYYY-MM" pattern="[0-9]{4}(-[0-9]{2})?" value={item.endDate} onChange={event => updateEducation(item.id, { endDate: event.target.value })} /></div></div></Entry>)}
            <button className="profile-add" type="button" onClick={() => update('education', [...draft.education, { id: crypto.randomUUID(), school: '', degree: '', field: '', startDate: '', endDate: '' }])}><Plus size={17} /> Add education</button>
          </div>}
          {active === 'skills' && <div className="profile-skills-editor"><div className="profile-tip"><Sparkles size={17} /><p>Include your tools, technologies, and core competencies. Only add skills you can confidently speak to.</p></div><label htmlFor="new-profile-skill" className="label">Add a skill</label><div className="profile-skill-input"><input id="new-profile-skill" className="input" value={skill} onChange={event => setSkill(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addSkill(); } }} placeholder="e.g. TypeScript, product strategy, Figma" /><button type="button" className="button button-secondary" disabled={!skill.trim()} onClick={addSkill}><Plus size={16} /> Add</button></div><p className="profile-field-hint">Press Enter or use commas to add multiple skills.</p><div className="profile-skills-heading"><h3>Your expertise</h3><span>{draft.skills.length} skills</span></div><div className="profile-skill-list">{draft.skills.map((value, index) => <span className="profile-skill-chip" key={`${value}-${index}`}>{value}<button type="button" onClick={() => update('skills', draft.skills.filter((_, position) => position !== index))} aria-label={`Remove ${value}`}><X size={13} /></button></span>)}{!draft.skills.length && <p className="muted">Your skills will appear here.</p>}</div></div>}
          {active === 'projects' && <div className="profile-entries">
            {!draft.projects.length && <EmptyState noun="project" />}
            {draft.projects.map((item, index) => <Entry key={item.id} title={item.name || `Project ${index + 1}`} onRemove={() => update('projects', draft.projects.filter(entry => entry.id !== item.id))}><div className="profile-grid"><TextField label="Project name" value={item.name} onChange={event => updateProject(item.id, { name: event.target.value })} placeholder="Project name" /><TextField label="Project link" type="url" value={item.url} onChange={event => updateProject(item.id, { url: event.target.value })} placeholder="https://example.com" /></div><TextArea label="Description" rows={3} value={item.description} onChange={value => updateProject(item.id, { description: value })} placeholder="What did you build and who was it for?" /><TextField label="Technologies used" value={item.technologies.join(',')} onChange={event => updateProject(item.id, { technologies: event.target.value.split(',') })} placeholder="React, TypeScript, PostgreSQL" hint="Separate technologies with commas." /><TextArea label="Key outcomes" value={item.bullets.join('\n')} onChange={value => updateProject(item.id, { bullets: value.split('\n') })} placeholder="One outcome or achievement per line" /></Entry>)}
            <button className="profile-add" type="button" onClick={() => update('projects', [...draft.projects, { id: crypto.randomUUID(), name: '', description: '', url: '', technologies: [], bullets: [] }])}><Plus size={17} /> Add project</button>
          </div>}
          {active === 'certifications' && <div className="profile-entries">
            {!draft.certifications.length && <EmptyState noun="certification" />}
            {draft.certifications.map((item, index) => <Entry key={item.id} title={item.name || `Certification ${index + 1}`} detail={item.issuer} onRemove={() => update('certifications', draft.certifications.filter(entry => entry.id !== item.id))}><div className="profile-grid"><TextField label="Certification name" value={item.name} onChange={event => updateCertification(item.id, { name: event.target.value })} placeholder="AWS Certified Solutions Architect" /><TextField label="Issuing organization" value={item.issuer} onChange={event => updateCertification(item.id, { issuer: event.target.value })} placeholder="Amazon Web Services" /><TextField label="Issued date" type="month" value={item.date} onChange={event => updateCertification(item.id, { date: event.target.value })} /><TextField label="Credential URL" type="url" value={item.url} onChange={event => updateCertification(item.id, { url: event.target.value })} placeholder="https://credentials.example.com/..." /></div></Entry>)}
            <button className="profile-add" type="button" onClick={() => update('certifications', [...draft.certifications, { id: crypto.randomUUID(), name: '', issuer: '', date: '', url: '' }])}><Plus size={17} /> Add certification</button>
          </div>}
        </div>
        <div className="profile-save-footer"><div className="profile-save-status" role="status" aria-live="polite">{status ? <span className={status.kind === 'error' ? 'profile-error' : 'profile-success'}>{status.kind === 'success' && <CheckCircle2 size={15} />}{status.text}</span> : <span>{dirty ? <><span className="profile-unsaved-dot" /> You have unsaved changes</> : <><ShieldCheck size={14} /> Your master profile, always in your control</>}</span>}</div><button type="submit" className="button button-primary" disabled={pending}>{pending ? <Loader2 size={16} className="profile-spin" /> : <Save size={16} />}{pending ? 'Saving…' : 'Save changes'}</button></div>
      </form>
    </div>
    <div className="profile-bottom-note"><ShieldCheck size={13} /><span>{isDemo ? 'Demo data stays in this browser. Use a sample profile to explore.' : 'Your profile is private and belongs to your account.'}</span></div>
  </div>;
}
