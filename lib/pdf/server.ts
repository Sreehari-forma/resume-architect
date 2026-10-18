import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, rgb, degrees, type PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { UserProfile } from '@/types';

const PAGE = { width: 595.28, height: 841.89, margin: 48, bottom: 48 };
const labels = {
  en: { summary: 'Professional summary', experience: 'Experience', education: 'Education', skills: 'Core competencies', projects: 'Selected projects', certifications: 'Certifications', present: 'Present', name: 'Your name', demo: 'Demo preview', page: 'Page' },
  pl: { summary: 'Podsumowanie zawodowe', experience: 'Doświadczenie', education: 'Wykształcenie', skills: 'Kluczowe umiejętności', projects: 'Wybrane projekty', certifications: 'Certyfikaty', present: 'Obecnie', name: 'Imię i nazwisko', demo: 'Podgląd demonstracyjny', page: 'Strona' },
};
let fontBytes: Promise<[Buffer, Buffer]> | undefined;
function fonts() {
  return fontBytes ??= Promise.all([
    readFile(path.join(process.cwd(), 'assets/fonts/NotoSans-Regular.ttf')),
    readFile(path.join(process.cwd(), 'assets/fonts/NotoSans-Bold.ttf')),
  ]);
}

export function wrapPdfText(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    let line = '';
    for (const word of paragraph.trim().split(/\s+/u).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) { line = candidate; continue; }
      if (line) lines.push(line);
      line = '';
      // URLs and other long tokens must wrap rather than run beyond the page.
      for (const character of word) {
        if (line && font.widthOfTextAtSize(line + character, size) > width) { lines.push(line); line = ''; }
        line += character;
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Called by a forced-watermark demo route or an authenticated entitlement route. */
export async function renderResumePdf(profile: UserProfile, locale: 'en' | 'pl', watermark: boolean): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [regularBytes, boldBytes] = await fonts();
  const regular = await pdf.embedFont(regularBytes, { subset: true });
  const bold = await pdf.embedFont(boldBytes, { subset: true });
  const copy = labels[locale];
  pdf.setTitle(`${profile.fullName || copy.name} - CV`);
  pdf.setAuthor(profile.fullName);
  pdf.setCreator('Forma Resume Architect');
  pdf.setSubject(watermark ? copy.demo : 'CV');
  pdf.setLanguage(locale);
  let page = pdf.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - PAGE.margin;
  const contentWidth = PAGE.width - PAGE.margin * 2;
  function ensureSpace(height: number) {
    if (y - height >= PAGE.bottom) return;
    if (pdf.getPageCount() >= 40) throw new Error('This CV is too long to render. Shorten older entries.');
    page = pdf.addPage([PAGE.width, PAGE.height]);
    y = PAGE.height - PAGE.margin;
  }
  function paragraph(value: string, options: { bold?: boolean; size?: number; indent?: number; after?: number; muted?: boolean } = {}) {
    if (!value.trim()) return;
    const font = options.bold ? bold : regular;
    const size = options.size ?? 10;
    const height = size * 1.45;
    const indent = options.indent ?? 0;
    // PDF text is inert; controls are normalized without treating content as markup.
    const clean = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
    for (const line of wrapPdfText(clean, font, size, contentWidth - indent)) {
      ensureSpace(height);
      page.drawText(line, { x: PAGE.margin + indent, y: y - size, size, font,
        color: options.muted ? rgb(.35, .38, .44) : rgb(.09, .12, .17) });
      y -= height;
    }
    y -= options.after ?? 3;
  }
  function section(title: string) {
    ensureSpace(62);
    y -= 12;
    paragraph(title.toLocaleUpperCase(locale), { bold: true, size: 10.5, after: 5 });
    page.drawLine({ start: { x: PAGE.margin, y }, end: { x: PAGE.width - PAGE.margin, y }, thickness: .7, color: rgb(.72, .75, .8) });
    y -= 10;
  }
  function entry(title: string, subtitle: string, dates = '') {
    ensureSpace(50);
    paragraph(title, { bold: true, size: 10.5, after: 1 });
    paragraph([subtitle, dates].filter(Boolean).join(' | '), { size: 9, muted: true, after: 5 });
  }
  function bullets(items: string[]) {
    for (const item of items.filter(item => item.trim())) paragraph(`• ${item}`, { indent: 8, after: 3 });
    y -= 4;
  }
  function dates(start: string, end: string) { return [start, end].filter(Boolean).join(' - '); }

  paragraph(profile.fullName || copy.name, { bold: true, size: 23, after: 2 });
  paragraph(profile.title, { size: 11.5, muted: true, after: 7 });
  paragraph([profile.email, profile.phone, profile.location].filter(Boolean).join(' | '), { size: 9, after: 3 });
  paragraph([profile.linkedin, profile.github, profile.website].filter(Boolean).join(' | '), { size: 8.5, muted: true, after: 4 });
  if (profile.summary.trim()) { section(copy.summary); paragraph(profile.summary); }
  if (profile.experience.length) {
    section(copy.experience);
    for (const job of profile.experience) {
      entry(job.role, [job.company, job.location].filter(Boolean).join(' · '), dates(job.startDate, job.current ? copy.present : job.endDate));
      bullets(job.bullets);
    }
  }
  if (profile.skills.length) { section(copy.skills); paragraph(profile.skills.filter(Boolean).join(' · ')); }
  if (profile.projects.length) {
    section(copy.projects);
    for (const project of profile.projects) {
      entry(project.name, project.technologies.filter(Boolean).join(' · '));
      paragraph(project.description);
      paragraph(project.url, { size: 8.5, muted: true });
      bullets(project.bullets);
    }
  }
  if (profile.education.length) {
    section(copy.education);
    for (const education of profile.education) {
      entry(education.school, [education.degree, education.field].filter(Boolean).join(', '), dates(education.startDate, education.endDate));
    }
  }
  if (profile.certifications.length) {
    section(copy.certifications);
    for (const certificate of profile.certifications) {
      entry(certificate.name, certificate.issuer, certificate.date);
      paragraph(certificate.url, { size: 8.5, muted: true });
    }
  }
  pdf.getPages().forEach((sheet, index) => {
    const footer = `${copy.page} ${index + 1} / ${pdf.getPageCount()}`;
    sheet.drawText(footer, { x: PAGE.width - PAGE.margin - regular.widthOfTextAtSize(footer, 8), y: 24, size: 8, font: regular, color: rgb(.5, .52, .56) });
    if (watermark) {
      const size = 108;
      const angle = 34 * Math.PI / 180;
      const width = bold.widthOfTextAtSize('forma', size);
      const height = bold.heightAtSize(size);
      sheet.drawText('forma', { x: PAGE.width / 2 - (width * Math.cos(angle) - height * Math.sin(angle)) / 2,
        y: PAGE.height / 2 - (width * Math.sin(angle) + height * Math.cos(angle)) / 2,
        size, font: bold, rotate: degrees(34), opacity: .13, color: rgb(.32, .34, .42) });
    }
  });
  return pdf.save();
}
