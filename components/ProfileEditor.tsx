'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { useEffect, useId, useRef, useState, useTransition, type InputHTMLAttributes, type ReactNode } from 'react';
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
  const { t } = useI18n();
  const id = useId();
  return <label className="field" htmlFor={id}><span className="label">{t(label)}</span><input id={id} className="input" {...props} placeholder={props.placeholder ? t(props.placeholder) : undefined} />{hint && <span className="profile-field-hint">{t(hint)}</span>}</label>;
}

function TextArea({ label, value, onChange, placeholder, rows = 4, hint }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; rows?: number; hint?: string }) {
  const { t } = useI18n();
  const id = useId();
  return <label className="field" htmlFor={id}><span className="label">{t(label)}</span><textarea id={id} className="textarea" rows={rows} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder ? t(placeholder) : undefined} />{hint && <span className="profile-field-hint">{t(hint)}</span>}</label>;
}

function Entry({ title, detail, onRemove, children }: { title: string; detail?: string; onRemove: () => void; children: ReactNode }) {
  const { t } = useI18n();
  return <section className="profile-entry"><div className="profile-entry-header"><div><h3>{title}</h3>{detail && <p>{detail}</p>}</div><button type="button" className="profile-icon-button profile-remove" onClick={onRemove} aria-label={t('Remove {name}', {name: title})} title={t('Remove {name}', {name: title})}><Trash2 size={16} /></button></div><div className="profile-entry-fields">{children}</div></section>;
}

function EmptyState({ noun }: { noun: string }) {
  const { t } = useI18n();
  return <div className="profile-empty"><div className="profile-empty-icon"><Plus size={22} /></div><h3>{t("A little more about your journey.")}</h3><p>{t('Add your first {item} to give Forma a fuller picture.', {item: t(noun)})}</p></div>;
}

function normalizeProfile(profile: UserProfile): UserProfile {
  return { ...profile, skills: profile.skills.map(skill => skill.trim()).filter(Boolean), experience: profile.experience.map(item => ({ ...item, bullets: item.bullets.map(line => line.trim()).filter(Boolean), endDate: item.current ? '' : item.endDate })), projects: profile.projects.map(item => ({ ...item, bullets: item.bullets.map(line => line.trim()).filter(Boolean), technologies: item.technologies.map(tech => tech.trim()).filter(Boolean) })) };
}

function includePendingSkills(profile: UserProfile, input: string, trim = false): UserProfile {
  if (!input) return profile;
  const skills = [...profile.skills];
  for (const raw of input.split(',')) {
    const value = trim ? raw.trim() : raw;
    if (value && !skills.some(existing => existing.trim().toLowerCase() === value.trim().toLowerCase())) skills.push(value);
  }
  return { ...profile, skills };
}

export function ProfileEditor() {
  const { t } = useI18n();
  const { profile, setProfile, isGuest, userId, authConfigured, draftStorageError, recordGuestProfile, requestAuth } = useWorkspace();
  const [draft, setDraft] = useState<UserProfile>(profile);
  const draftRef = useRef(profile);
  const lastRecordedProfile = useRef<string | null>(null);
  const [active, setActive] = useState<Section>('personal');
  const [skill, setSkill] = useState('');
  const skillRef = useRef('');
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    // A guest's own store writes must not replace the editor draft or move a
    // partly typed skill from the input into the rendered chips on each key.
    if (isGuest && JSON.stringify(profile) === lastRecordedProfile.current) return;
    draftRef.current = profile;
    setDraft(profile);
    skillRef.current = '';
    setSkill('');
  }, [profile, isGuest]);
  const completeness = profileCompleteness(draft);
  const dirty = JSON.stringify(profile) !== JSON.stringify(draft) || Boolean(skill.trim());
  const currentSection = sections.find(section => section.id === active)!;
  const recordDraft = (next: UserProfile, pendingSkill = skillRef.current) => {
    if (!isGuest) return;
    // Preserve incomplete email/URL fields and pending skill text before any
    // validation, navigation, or account dialog can interrupt the editor.
    const snapshot = includePendingSkills(next, pendingSkill);
    lastRecordedProfile.current = JSON.stringify(snapshot);
    recordGuestProfile(snapshot);
  };
  const replaceDraft = (next: UserProfile) => {
    draftRef.current = next;
    setDraft(next);
    setStatus(null);
    recordDraft(next);
  };
  const update = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => replaceDraft({ ...draftRef.current, [key]: value });
  const updateExperience = (id: string, changes: Partial<Experience>) => update('experience', draftRef.current.experience.map(item => item.id === id ? { ...item, ...changes } : item));
  const updateEducation = (id: string, changes: Partial<Education>) => update('education', draftRef.current.education.map(item => item.id === id ? { ...item, ...changes } : item));
  const updateProject = (id: string, changes: Partial<Project>) => update('projects', draftRef.current.projects.map(item => item.id === id ? { ...item, ...changes } : item));
  const updateCertification = (id: string, changes: Partial<Certification>) => update('certifications', draftRef.current.certifications.map(item => item.id === id ? { ...item, ...changes } : item));
  const updatePendingSkill = (value: string) => {
    skillRef.current = value;
    setSkill(value);
    setStatus(null);
    recordDraft(draftRef.current, value);
  };
  const addSkill = (): UserProfile => {
    const next = includePendingSkills(draftRef.current, skillRef.current, true);
    skillRef.current = '';
    setSkill('');
    replaceDraft(next);
    return next;
  };
  const save = () => startTransition(async () => {
    const clean = normalizeProfile(addSkill());
    if (isGuest) {
      replaceDraft(clean);
      const stored = recordGuestProfile(clean);
      setStatus({ kind: stored ? 'success' : 'error', text: stored ? "Draft saved in this browser. No account required." : "Browser storage is unavailable. Keep this page open to retain your draft." });
      return;
    }
    const validation = profileSchema.safeParse(clean);
    if (!validation.success) { setStatus({ kind: 'error', text: validation.error.issues[0]?.message || "Please check your profile details." }); return; }
    try {
      const result = await saveProfile(clean, userId);
      if (!result.ok) { setStatus({ kind: 'error', text: result.error || "Your profile could not be saved. Please try again." }); return; }
      setProfile(clean);
      draftRef.current = clean;
      setDraft(clean);
      setStatus({ kind: 'success', text: "Your master profile is saved securely." });
    } catch { setStatus({ kind: 'error', text: "We could not save your profile. Check your connection and try again." }); }
  });
  const counts: Record<Section, number> = { personal: draft.fullName ? 1 : 0, experience: draft.experience.length, education: draft.education.length, skills: draft.skills.length, projects: draft.projects.length, certifications: draft.certifications.length };

  return <div className="profile-workspace">
    <div className="profile-heading"><div><div className="eyebrow">{t("YOUR CAREER, CONNECTED")}</div><h1>{t("Master Vault")}<span className="profile-heading-dot">.</span></h1><p>{t("Your entire career. One source of truth.")}</p></div><Link href="/studio" className="button button-secondary" onClick={() => { if (isGuest) addSkill(); }}>{t("Open studio")} <ArrowRight size={16} /></Link></div>
    <div className="profile-layout">
      <aside className="profile-sidebar">
        <div className="profile-completeness panel"><div className="profile-completeness-top"><span className="profile-small-label">{t("PROFILE STRENGTH")}</span><ShieldCheck size={17} /></div><div className="profile-completeness-number">{completeness}<span>%</span><span className="profile-completeness-word">{t("complete")}</span></div><div className="profile-progress" role="progressbar" aria-label={t("Master profile completeness")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={completeness}><div style={{ width: `${completeness}%` }} /></div><p>{completeness === 100 ? t("A strong foundation for your next move.") : t("A richer profile makes every tailored resume stronger.")}</p></div>
        <nav className="profile-navigation" aria-label={t("Profile sections")}>{sections.map(section => <button key={section.id} type="button" onClick={() => setActive(section.id)} className={`profile-nav-item ${active === section.id ? 'is-active' : ''}`} aria-current={active === section.id ? 'page' : undefined}><section.icon size={18} /><span>{t(section.name)}</span>{counts[section.id] > 0 ? <span className="profile-nav-count">{section.id === 'personal' ? <Check size={12} /> : counts[section.id]}</span> : <ChevronRight size={13} />}</button>)}</nav>
        <div className="profile-note"><Sparkles size={18} /><h3>{t("Your story stays yours.")}</h3><p>{t("Keeps your original facts as the source. Review AI edits before sending.")}</p></div>
        {isGuest && <div className="profile-demo-notice"><span className="badge">{t("GUEST WORKSPACE")}</span><p>{draftStorageError ? t("Browser storage is unavailable. Keep this page open to retain your draft.") : t("Your draft is kept in this browser as you edit.")} {authConfigured ? t("Create an account and make a one-time purchase for a final CV without a watermark.") : t("Account saving is not configured on this installation. You can keep editing your draft.")}</p><button type="button" className="button button-ghost" onClick={() => { const current = addSkill(); requestAuth('save', current); }}>{authConfigured ? t("Create an account") : t("Account setup")}<ArrowRight size={14} /></button></div>}
      </aside>
      <form className="profile-main panel" noValidate={isGuest} onSubmit={event => { event.preventDefault(); save(); }}>
        <div className="profile-section-heading"><div className="profile-section-icon"><currentSection.icon size={21} /></div><div><h2>{t(currentSection.name)}</h2><p>{t(currentSection.description)}</p></div></div>
        <div className="profile-form-body">
          {active === 'personal' && <div className="profile-personal-fields">
            <div className="profile-avatar-line"><div className="profile-avatar" aria-hidden="true">{draft.fullName.split(' ').filter(Boolean).map(word => word[0]).slice(0, 2).join('') || <UserRound size={24} />}</div><div><strong>{draft.fullName || t("Your next chapter starts here")}</strong><p>{draft.title || t("Add a title to introduce yourself")}</p></div><span className="profile-private"><ShieldCheck size={13} /> {t("Private profile")}</span></div>
            <div className="profile-grid"><TextField label={t("Full name")} autoComplete="name" value={draft.fullName} onChange={event => update('fullName', event.target.value)} placeholder={t("Alex Morgan")} /><TextField label={t("Professional title")} value={draft.title} onChange={event => update('title', event.target.value)} placeholder={t("Senior Product Designer")} /><TextField label={t("Email address")} type="email" autoComplete="email" value={draft.email} onChange={event => update('email', event.target.value)} placeholder="alex@example.com" /><TextField label={t("Phone number")} type="tel" autoComplete="tel" value={draft.phone} onChange={event => update('phone', event.target.value)} placeholder="+1 (555) 123-4567" /><TextField label={t("Location")} autoComplete="address-level2" value={draft.location} onChange={event => update('location', event.target.value)} placeholder={t("San Francisco, CA")} /><TextField label={t("Personal website")} type="url" value={draft.website} onChange={event => update('website', event.target.value)} placeholder="https://yourportfolio.com" /><TextField label="LinkedIn" type="url" value={draft.linkedin} onChange={event => update('linkedin', event.target.value)} placeholder="https://linkedin.com/in/alex" /><TextField label="GitHub" type="url" value={draft.github} onChange={event => update('github', event.target.value)} placeholder="https://github.com/alex" /></div>
            <div className="profile-form-divider" /><TextArea label={t("Professional summary")} value={draft.summary} onChange={value => update('summary', value)} rows={5} placeholder={t("A few sentences about your experience, strengths, and the impact you bring.")} hint={t("Think of this as your career in a paragraph. Forma will tailor it to each role.")} />
          </div>}
          {active === 'experience' && <div className="profile-entries">
            {!draft.experience.length && <EmptyState noun={t("work experience")} />}
            {draft.experience.map((item, index) => <Entry key={item.id} title={item.role || t('Experience {number}', {number: index + 1})} detail={item.company || t("Your next career highlight")} onRemove={() => update('experience', draft.experience.filter(entry => entry.id !== item.id))}><div className="profile-grid"><TextField label={t("Job title")} value={item.role} onChange={event => updateExperience(item.id, { role: event.target.value })} placeholder={t("Senior Software Engineer")} /><TextField label={t("Company")} value={item.company} onChange={event => updateExperience(item.id, { company: event.target.value })} placeholder={t("Company name")} /><TextField label={t("Location")} value={item.location} onChange={event => updateExperience(item.id, { location: event.target.value })} placeholder={t("Remote / City, Country")} /><div className="profile-date-pair"><TextField label={t("Start date")} type="month" value={item.startDate} onChange={event => updateExperience(item.id, { startDate: event.target.value })} /><TextField label={t("End date")} type="month" disabled={item.current} value={item.current ? '' : item.endDate} min={item.startDate} onChange={event => updateExperience(item.id, { endDate: event.target.value })} /></div></div><label className="profile-checkbox"><input type="checkbox" checked={item.current} onChange={event => updateExperience(item.id, { current: event.target.checked })} /><span>{t("I currently work here")}</span></label><TextArea label={t("Achievements & impact")} value={item.bullets.join('\n')} onChange={value => updateExperience(item.id, { bullets: value.split('\n') })} rows={5} placeholder={t("Led a team of 5 engineers to ship a customer dashboard.\nReduced page load time by 35% through targeted performance improvements.")} hint={t("One achievement per line. Include real numbers and outcomes wherever you can.")} /></Entry>)}
            <button className="profile-add" type="button" onClick={() => update('experience', [...draft.experience, { id: crypto.randomUUID(), company: '', role: '', location: '', startDate: '', endDate: '', current: false, bullets: [] }])}><Plus size={17} /> {t("Add work experience")}</button>
          </div>}
          {active === 'education' && <div className="profile-entries">
            {!draft.education.length && <EmptyState noun={t("education entry")} />}
            {draft.education.map((item, index) => <Entry key={item.id} title={item.school || t('Education {number}', {number: index + 1})} detail={item.degree} onRemove={() => update('education', draft.education.filter(entry => entry.id !== item.id))}><div className="profile-grid"><TextField label={t("School or university")} value={item.school} onChange={event => updateEducation(item.id, { school: event.target.value })} placeholder={t("University name")} /><TextField label={t("Degree")} value={item.degree} onChange={event => updateEducation(item.id, { degree: event.target.value })} placeholder={t("Bachelor of Science")} /><TextField label={t("Field of study")} value={item.field} onChange={event => updateEducation(item.id, { field: event.target.value })} placeholder={t("Computer Science")} /><div className="profile-date-pair"><TextField label={t("Start date")} placeholder={t("YYYY or YYYY-MM")} pattern="[0-9]{4}(-[0-9]{2})?" value={item.startDate} onChange={event => updateEducation(item.id, { startDate: event.target.value })} /><TextField label={t("End date")} placeholder={t("YYYY or YYYY-MM")} pattern="[0-9]{4}(-[0-9]{2})?" value={item.endDate} onChange={event => updateEducation(item.id, { endDate: event.target.value })} /></div></div></Entry>)}
            <button className="profile-add" type="button" onClick={() => update('education', [...draft.education, { id: crypto.randomUUID(), school: '', degree: '', field: '', startDate: '', endDate: '' }])}><Plus size={17} /> {t("Add education")}</button>
          </div>}
          {active === 'skills' && <div className="profile-skills-editor"><div className="profile-tip"><Sparkles size={17} /><p>{t("Include your tools, technologies, and core competencies. Only add skills you can confidently speak to.")}</p></div><label htmlFor="new-profile-skill" className="label">{t("Add a skill")}</label><div className="profile-skill-input"><input id="new-profile-skill" className="input" value={skill} onChange={event => updatePendingSkill(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addSkill(); } }} placeholder={t("e.g. TypeScript, product strategy, Figma")} /><button type="button" className="button button-secondary" disabled={!skill.trim()} onClick={addSkill}><Plus size={16} /> {t("Add")}</button></div><p className="profile-field-hint">{t("Press Enter or use commas to add multiple skills.")}</p><div className="profile-skills-heading"><h3>{t("Your expertise")}</h3><span>{t('{count} skills', {count: draft.skills.length})}</span></div><div className="profile-skill-list">{draft.skills.map((value, index) => <span className="profile-skill-chip" key={`${value}-${index}`}>{value}<button type="button" onClick={() => update('skills', draft.skills.filter((_, position) => position !== index))} aria-label={t('Remove {name}', {name: value})}><X size={13} /></button></span>)}{!draft.skills.length && <p className="muted">{t("Your skills will appear here.")}</p>}</div></div>}
          {active === 'projects' && <div className="profile-entries">
            {!draft.projects.length && <EmptyState noun={t("project")} />}
            {draft.projects.map((item, index) => <Entry key={item.id} title={item.name || t('Project {number}', {number: index + 1})} onRemove={() => update('projects', draft.projects.filter(entry => entry.id !== item.id))}><div className="profile-grid"><TextField label={t("Project name")} value={item.name} onChange={event => updateProject(item.id, { name: event.target.value })} placeholder={t("Project name")} /><TextField label={t("Project link")} type="url" value={item.url} onChange={event => updateProject(item.id, { url: event.target.value })} placeholder="https://example.com" /></div><TextArea label={t("Description")} rows={3} value={item.description} onChange={value => updateProject(item.id, { description: value })} placeholder={t("What did you build and who was it for?")} /><TextField label={t("Technologies used")} value={item.technologies.join(',')} onChange={event => updateProject(item.id, { technologies: event.target.value.split(',') })} placeholder="React, TypeScript, PostgreSQL" hint={t("Separate technologies with commas.")} /><TextArea label={t("Key outcomes")} value={item.bullets.join('\n')} onChange={value => updateProject(item.id, { bullets: value.split('\n') })} placeholder={t("One outcome or achievement per line")} /></Entry>)}
            <button className="profile-add" type="button" onClick={() => update('projects', [...draft.projects, { id: crypto.randomUUID(), name: '', description: '', url: '', technologies: [], bullets: [] }])}><Plus size={17} /> {t("Add project")}</button>
          </div>}
          {active === 'certifications' && <div className="profile-entries">
            {!draft.certifications.length && <EmptyState noun={t("certification")} />}
            {draft.certifications.map((item, index) => <Entry key={item.id} title={item.name || t('Certification {number}', {number: index + 1})} detail={item.issuer} onRemove={() => update('certifications', draft.certifications.filter(entry => entry.id !== item.id))}><div className="profile-grid"><TextField label={t("Certification name")} value={item.name} onChange={event => updateCertification(item.id, { name: event.target.value })} placeholder="AWS Certified Solutions Architect" /><TextField label={t("Issuing organization")} value={item.issuer} onChange={event => updateCertification(item.id, { issuer: event.target.value })} placeholder="Amazon Web Services" /><TextField label={t("Issued date")} type="month" value={item.date} onChange={event => updateCertification(item.id, { date: event.target.value })} /><TextField label={t("Credential URL")} type="url" value={item.url} onChange={event => updateCertification(item.id, { url: event.target.value })} placeholder="https://credentials.example.com/..." /></div></Entry>)}
            <button className="profile-add" type="button" onClick={() => update('certifications', [...draft.certifications, { id: crypto.randomUUID(), name: '', issuer: '', date: '', url: '' }])}><Plus size={17} /> {t("Add certification")}</button>
          </div>}
        </div>
        <div className="profile-save-footer"><div className="profile-save-status" role="status" aria-live="polite">{status ? <span className={status.kind === 'error' ? 'profile-error' : 'profile-success'}>{status.kind === 'success' && <CheckCircle2 size={15} />}{t(status.text)}</span> : <span>{isGuest ? <><ShieldCheck size={14} />{t('Guest draft · saved in this browser.')}</> : dirty ? <><span className="profile-unsaved-dot" /> {t("You have unsaved changes")}</> : <><ShieldCheck size={14} /> {t("Your master profile, always in your control")}</>}</span>}{isGuest && draftStorageError && <span className="profile-error" role="alert">{t(draftStorageError)}</span>}</div><button type="submit" className="button button-primary" disabled={pending}>{pending ? <Loader2 size={16} className="profile-spin" /> : <Save size={16} />}{pending ? t("Saving…") : isGuest ? t("Save draft") : t("Save changes")}</button></div>
      </form>
    </div>
    <div className="profile-bottom-note"><ShieldCheck size={13} /><span>{isGuest ? draftStorageError ? t("Your draft is only available in this open page while browser storage is unavailable.") : t("Guest draft stored in this browser. It is not saved to an account yet.") : t("Your profile is private and belongs to your account.")}</span></div>
  </div>;
}
