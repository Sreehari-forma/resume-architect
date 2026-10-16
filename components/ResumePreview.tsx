import type { UserProfile } from '@/types';

function dateLabel(value: string) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return value;
  return new Date(`${value}-01T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function Dates({start,end}:{start:string;end:string}) { return <span className="resume-dates">{[dateLabel(start),dateLabel(end)].filter(Boolean).join(' – ')}</span>; }
function SafeLink({url,children}:{url:string;children:React.ReactNode}) {
  try { const u = new URL(url); if(!['https:','http:'].includes(u.protocol) || u.username || u.password) return null; }
  catch { return null; }
  return <a href={url} target="_blank" rel="noopener noreferrer">{children}</a>;
}

export default function ResumePreview({profile}:{profile:UserProfile}) {
  return <article className="resume-paper" aria-label={`Resume for ${profile.fullName}`}>
    <header className="resume-heading"><h2>{profile.fullName || 'Your name'}</h2><p className="resume-title">{profile.title}</p><div className="resume-contact">{[profile.email,profile.phone,profile.location].filter(Boolean).map(item=><span key={item}>{item}</span>)}</div><div className="resume-contact resume-links">{profile.linkedin && <SafeLink url={profile.linkedin}>LinkedIn</SafeLink>}{profile.github && <SafeLink url={profile.github}>GitHub</SafeLink>}{profile.website && <SafeLink url={profile.website}>Portfolio</SafeLink>}</div></header>
    {profile.summary && <section><h3>Professional summary</h3><p>{profile.summary}</p></section>}
    {profile.experience.length > 0 && <section><h3>Experience</h3>{profile.experience.map(job=><div className="resume-entry" key={job.id}><div className="resume-entry-heading"><h4>{job.role}</h4><Dates start={job.startDate} end={job.current?'Present':job.endDate}/></div><p className="resume-company">{job.company}{job.location && ` · ${job.location}`}</p><ul>{job.bullets.filter(Boolean).map((bullet,i)=><li key={i}>{bullet}</li>)}</ul></div>)}</section>}
    {profile.skills.length > 0 && <section><h3>Core competencies</h3><p>{profile.skills.join(' · ')}</p></section>}
    {profile.projects.length > 0 && <section><h3>Selected projects</h3>{profile.projects.map(project=><div className="resume-entry" key={project.id}><div className="resume-entry-heading"><h4>{project.name}</h4>{project.url && <SafeLink url={project.url}>View project</SafeLink>}</div><p>{project.description}</p>{project.technologies.length>0 && <p className="resume-company">{project.technologies.join(' · ')}</p>}{project.bullets.length>0 && <ul>{project.bullets.filter(Boolean).map((bullet,i)=><li key={i}>{bullet}</li>)}</ul>}</div>)}</section>}
    {profile.education.length > 0 && <section><h3>Education</h3>{profile.education.map(education=><div className="resume-entry" key={education.id}><div className="resume-entry-heading"><h4>{education.school}</h4><Dates start={education.startDate} end={education.endDate}/></div><p>{[education.degree,education.field].filter(Boolean).join(', ')}</p></div>)}</section>}
    {profile.certifications.length > 0 && <section><h3>Certifications</h3>{profile.certifications.map(cert=><div className="resume-entry" key={cert.id}><div className="resume-entry-heading"><h4>{cert.name}</h4><span className="resume-dates">{cert.date}</span></div><p>{cert.issuer}</p></div>)}</section>}
  </article>;
}
