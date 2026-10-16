import type { UserProfile } from '@/types';

/** Every user-controlled string passes through this map exactly once. */
export function escapeLatex(value: string): string {
  const symbols: Record<string, string> = {
    '\\': '\\textbackslash{}', '&': '\\&', '%': '\\%', '$': '\\$', '#': '\\#',
    '_': '\\_', '{': '\\{', '}': '\\}', '~': '\\textasciitilde{}', '^': '\\textasciicircum{}',
  };
  return value.normalize('NFC').replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[\\&%$#_{}~^]/g, (character) => symbols[character]);
}

export function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    // Restrict TeX URL arguments to a conservative alphabet; encode TeX delimiters.
    return url.href.replace(/[\\{}^~]/g, (character) =>
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  } catch { return null; }
}

function link(value: string, label: string): string {
  const url = safeExternalUrl(value);
  // Preserve existing URL encodings, query strings, and fragment semantics while
  // escaping their TeX delimiters. The PDF link still receives the original URL.
  return url ? `\\href{${url.replace(/[%#&_]/g, (character) => `\\${character}`)}}{${escapeLatex(label)}}` : '';
}

export function generateLatex(profile: UserProfile): string {
  const e = escapeLatex;
  const bullets = (items: string[]) => items.filter(Boolean).length
    ? `\\begin{itemize}\n${items.filter(Boolean).map((item) => `  \\item ${e(item)}`).join('\n')}\n\\end{itemize}` : '';
  const dates = (start: string, end: string) => [start, end].filter(Boolean).map(e).join(' -- ');
  const contacts = [profile.email, profile.phone, profile.location].filter(Boolean).map(e);
  contacts.push(...[link(profile.linkedin, 'LinkedIn'), link(profile.github, 'GitHub'), link(profile.website, 'Portfolio')].filter(Boolean));
  const sections = [
    profile.summary ? `\\section{Professional Summary}\n${e(profile.summary)}` : '',
    profile.experience.length ? `\\section{Experience}\n${profile.experience.map((job) =>
      `\\textbf{${e(job.role)}} \\hfill ${dates(job.startDate, job.current ? 'Present' : job.endDate)}\\\\\n\\textit{${e(job.company)}${job.location ? ` | ${e(job.location)}` : ''}}\n${bullets(job.bullets)}`
    ).join('\n\\vspace{4pt}\n')}` : '',
    profile.skills.length ? `\\section{Skills}\n${profile.skills.map(e).join(' $\\cdot$ ')}` : '',
    profile.projects.length ? `\\section{Projects}\n${profile.projects.map((project) =>
      `\\textbf{${e(project.name)}}${project.url ? ` \\hfill ${link(project.url, 'Project link')}` : ''}\\\\\n${e(project.description)}${project.technologies.length ? `\\\\\n\\textit{${project.technologies.map(e).join(', ')}}` : ''}\n${bullets(project.bullets)}`
    ).join('\n\\vspace{4pt}\n')}` : '',
    profile.education.length ? `\\section{Education}\n${profile.education.map((education) =>
      `\\textbf{${e(education.school)}} \\hfill ${dates(education.startDate, education.endDate)}\\\\\n${e([education.degree, education.field].filter(Boolean).join(', '))}`
    ).join('\n\\vspace{4pt}\n')}` : '',
    profile.certifications.length ? `\\section{Certifications}\n${profile.certifications.map((certification) =>
      `${e(certification.name)}${certification.issuer ? ` --- ${e(certification.issuer)}` : ''}${certification.date ? ` \\hfill ${e(certification.date)}` : ''}\\\\`
    ).join('\n')}` : '',
  ].filter(Boolean);
  return String.raw`\documentclass[10pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage{lmodern}
\usepackage[margin=0.65in]{geometry}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{titlesec}
\ifdefined\pdfgentounicode
  \input{glyphtounicode}
  \pdfgentounicode=1
\fi
\pagestyle{empty}
\setlength{\parindent}{0pt}
\setlength{\parskip}{4pt}
\setlist[itemize]{leftmargin=*,nosep,topsep=4pt}
\titleformat{\section}{\large\bfseries}{}{0pt}{}[\titlerule]
\titlespacing*{\section}{0pt}{10pt}{5pt}
\begin{document}
\begin{center}
{\LARGE\bfseries ${e(profile.fullName || 'Your name')}}\\[4pt]
${e(profile.title)}\\[4pt]
{\small ${contacts.join(' $|$ ')}}
\end{center}
${sections.join('\n\n')}
\end{document}
`;
}
