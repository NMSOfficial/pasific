import type { jsPDF } from 'jspdf';
import type { CriterionScore, Submission } from '../types/entities';
import { formatDateTime } from './format';
import { PDF_FONT_FAMILY, ensurePasificFont } from './pdfFonts';

const PAGE_MARGIN = 15;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const NAVY = '#0b2545';
const MUTED = '#4c5a68';
const BORDER = '#dbe2e9';
const FONT = PDF_FONT_FAMILY;

async function createPdfDoc(title: string): Promise<jsPDF> {
  // Loaded on demand so jsPDF (and its html2canvas/DOMPurify deps) never bloats the main bundle.
  const { jsPDF: JsPdf } = await import('jspdf');
  const doc = new JsPdf({ unit: 'mm', format: 'a4' });
  doc.setProperties({ title: `Pasific — ${title}` });
  await ensurePasificFont(doc);
  return doc;
}

function drawHeader(doc: jsPDF, title: string, subtitle: string) {
  doc.setFillColor(NAVY);
  doc.rect(0, 0, PAGE_WIDTH, 24, 'F');
  doc.setTextColor('#ffffff');
  doc.setFont(FONT, 'bold');
  doc.setFontSize(16);
  doc.text('Pasific', PAGE_MARGIN, 15);
  doc.setFont(FONT, 'normal');
  doc.setFontSize(9);
  doc.text('Developed by Ethosoft', PAGE_WIDTH - PAGE_MARGIN, 15, { align: 'right' });

  doc.setTextColor(NAVY);
  doc.setFont(FONT, 'bold');
  doc.setFontSize(14);
  doc.text(title, PAGE_MARGIN, 35);
  doc.setFont(FONT, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(MUTED);
  doc.text(subtitle, PAGE_MARGIN, 41);
  doc.setDrawColor(BORDER);
  doc.line(PAGE_MARGIN, 45, PAGE_WIDTH - PAGE_MARGIN, 45);
  return 52;
}

function drawFooter(doc: jsPDF, generatedAtLabel: string) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(BORDER);
    doc.line(PAGE_MARGIN, 285, PAGE_WIDTH - PAGE_MARGIN, 285);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(MUTED);
    doc.text(generatedAtLabel, PAGE_MARGIN, 291);
    doc.text(`${i} / ${pageCount}`, PAGE_WIDTH - PAGE_MARGIN, 291, { align: 'right' });
  }
}

function sectionLabel(doc: jsPDF, text: string, y: number): number {
  doc.setFont(FONT, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(NAVY);
  doc.text(text, PAGE_MARGIN, y);
  return y + 6;
}

function bodyText(doc: jsPDF, text: string, y: number, opts?: { maxWidth?: number }): number {
  doc.setFont(FONT, 'normal');
  doc.setFontSize(10);
  doc.setTextColor('#101a26');
  const lines = doc.splitTextToSize(text, opts?.maxWidth ?? CONTENT_WIDTH);
  doc.text(lines, PAGE_MARGIN, y);
  return y + lines.length * 5 + 3;
}

function ensureSpace(doc: jsPDF, y: number, needed = 20): number {
  if (y + needed > 275) {
    doc.addPage();
    return 20;
  }
  return y;
}

export interface SubmissionPdfContext {
  submission: Submission;
  studentName: string;
  schoolName?: string;
  assignmentTitle?: string;
  locale: string;
  criterionLabel: (crit: CriterionScore) => string;
}

export async function exportSubmissionResultPdf(ctx: SubmissionPdfContext) {
  const { submission, studentName, schoolName, assignmentTitle, locale, criterionLabel } = ctx;
  const doc = await createPdfDoc('Writing Result');
  let y = drawHeader(doc, assignmentTitle ?? submission.topicTitle, `${studentName}${schoolName ? ' — ' + schoolName : ''}`);

  y = sectionLabel(doc, 'Summary', y);
  const submittedLabel = submission.submittedAt ? formatDateTime(submission.submittedAt, locale) : '—';
  y = bodyText(doc, `Submitted: ${submittedLabel}    Word count: ${submission.wordCount}    Final score: ${submission.finalScore ?? '—'} / 100`, y);

  y = ensureSpace(doc, y);
  y = sectionLabel(doc, 'Criterion scores', y + 2);
  for (const c of submission.criterionScores) {
    y = ensureSpace(doc, y, 24);
    const score = c.teacherScore ?? c.aiScore;
    doc.setFont(FONT, 'bold');
    doc.setFontSize(10);
    doc.setTextColor('#101a26');
    doc.text(`${criterionLabel(c)} — ${score}/${c.maxScore} (${c.weight}%)`, PAGE_MARGIN, y);
    y += 5;
    y = bodyText(doc, c.explanation, y);
  }

  if (submission.teacherFeedback) {
    y = ensureSpace(doc, y, 24);
    y = sectionLabel(doc, 'Teacher feedback', y + 2);
    y = bodyText(doc, submission.teacherFeedback, y);
  }

  drawFooter(doc, `Generated ${formatDateTime(new Date().toISOString(), locale)}`);
  doc.save(`pasific-${submission.id}-result.pdf`);
}

export interface ClassReportContext {
  className: string;
  schoolName?: string;
  assignmentTitle: string;
  locale: string;
  rows: { studentName: string; status: string; score?: number }[];
  averageScore?: number;
}

export async function exportClassReportPdf(ctx: ClassReportContext) {
  const doc = await createPdfDoc('Class Report');
  let y = drawHeader(doc, ctx.assignmentTitle, `${ctx.className}${ctx.schoolName ? ' — ' + ctx.schoolName : ''}`);

  y = sectionLabel(doc, 'Summary', y);
  y = bodyText(doc, `Average score: ${ctx.averageScore ?? '—'} / 100    Students: ${ctx.rows.length}`, y);

  y = ensureSpace(doc, y);
  y = sectionLabel(doc, 'Students', y + 2);
  for (const row of ctx.rows) {
    y = ensureSpace(doc, y, 8);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(10);
    doc.setTextColor('#101a26');
    doc.text(`${row.studentName}`, PAGE_MARGIN, y);
    doc.text(`${row.status}`, PAGE_MARGIN + 90, y);
    doc.text(row.score !== undefined ? `${row.score}/100` : '—', PAGE_WIDTH - PAGE_MARGIN, y, { align: 'right' });
    y += 6;
  }

  drawFooter(doc, `Generated ${formatDateTime(new Date().toISOString(), ctx.locale)}`);
  doc.save(`pasific-class-report-${Date.now()}.pdf`);
}

export interface ActivationSheetContext {
  schoolName: string;
  className: string;
  locale: string;
  codes: { code: string; expiresAt: string }[];
}

export async function exportActivationCodesPdf(ctx: ActivationSheetContext) {
  const doc = await createPdfDoc('Activation Codes');
  let y = drawHeader(doc, 'Student Activation Codes', `${ctx.schoolName} — ${ctx.className}`);

  y = sectionLabel(doc, `${ctx.codes.length} codes`, y);
  for (const c of ctx.codes) {
    y = ensureSpace(doc, y, 10);
    doc.setFont(FONT, 'bold');
    doc.setFontSize(12);
    doc.setTextColor('#101a26');
    doc.text(c.code, PAGE_MARGIN, y);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(MUTED);
    doc.text(`expires ${formatDateTime(c.expiresAt, ctx.locale)}`, PAGE_WIDTH - PAGE_MARGIN, y, { align: 'right' });
    y += 9;
  }

  drawFooter(doc, `Generated ${formatDateTime(new Date().toISOString(), ctx.locale)}`);
  doc.save(`pasific-activation-codes-${Date.now()}.pdf`);
}

export interface PortfolioPdfContext {
  studentName: string;
  schoolName?: string;
  locale: string;
  totalCompleted: number;
  writingTypeCount: number;
  scoreTrend: { label: string; score: number }[];
  topErrorCategories: { label: string; count: number }[];
}

export async function exportPortfolioPdf(ctx: PortfolioPdfContext) {
  const doc = await createPdfDoc('Portfolio Summary');
  let y = drawHeader(doc, 'Portfolio Summary', `${ctx.studentName}${ctx.schoolName ? ' — ' + ctx.schoolName : ''}`);

  y = sectionLabel(doc, 'Overview', y);
  y = bodyText(doc, `Completed writings: ${ctx.totalCompleted}    Writing types practised: ${ctx.writingTypeCount}`, y);

  if (ctx.scoreTrend.length > 0) {
    y = ensureSpace(doc, y);
    y = sectionLabel(doc, 'Score trend', y + 2);
    y = bodyText(doc, ctx.scoreTrend.map((p) => `${p.label}: ${p.score}`).join('    '), y);
  }

  if (ctx.topErrorCategories.length > 0) {
    y = ensureSpace(doc, y);
    y = sectionLabel(doc, 'Most frequent error categories', y + 2);
    for (const e of ctx.topErrorCategories) {
      y = ensureSpace(doc, y, 8);
      doc.setFont(FONT, 'normal');
      doc.setFontSize(10);
      doc.setTextColor('#101a26');
      doc.text(`${e.label} — ${e.count}`, PAGE_MARGIN, y);
      y += 6;
    }
  }

  drawFooter(doc, `Generated ${formatDateTime(new Date().toISOString(), ctx.locale)}`);
  doc.save(`pasific-portfolio-${Date.now()}.pdf`);
}

export interface ClassProgressPdfContext {
  className: string;
  schoolName?: string;
  locale: string;
  criterionAverages: { label: string; score: number; maxScore: number }[];
  commonErrors: { label: string; count: number }[];
  students: { name: string; recentScore?: number }[];
}

export async function exportClassProgressPdf(ctx: ClassProgressPdfContext) {
  const doc = await createPdfDoc('Class Progress Report');
  let y = drawHeader(doc, 'Class Progress Report', `${ctx.className}${ctx.schoolName ? ' — ' + ctx.schoolName : ''}`);

  y = sectionLabel(doc, 'Class criterion averages', y);
  for (const c of ctx.criterionAverages) {
    y = ensureSpace(doc, y, 8);
    y = bodyText(doc, `${c.label}: ${c.score}/${c.maxScore}`, y, { maxWidth: CONTENT_WIDTH });
  }

  if (ctx.commonErrors.length > 0) {
    y = ensureSpace(doc, y);
    y = sectionLabel(doc, 'Common error categories', y + 2);
    y = bodyText(doc, ctx.commonErrors.map((e) => `${e.label} (${e.count})`).join('    '), y);
  }

  y = ensureSpace(doc, y);
  y = sectionLabel(doc, 'Students', y + 2);
  for (const s of ctx.students) {
    y = ensureSpace(doc, y, 8);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(10);
    doc.setTextColor('#101a26');
    doc.text(s.name, PAGE_MARGIN, y);
    doc.text(s.recentScore !== undefined ? `${s.recentScore}/100` : '—', PAGE_WIDTH - PAGE_MARGIN, y, { align: 'right' });
    y += 6;
  }

  drawFooter(doc, `Generated ${formatDateTime(new Date().toISOString(), ctx.locale)}`);
  doc.save(`pasific-class-progress-${Date.now()}.pdf`);
}

export interface SchoolUsagePdfContext {
  locale: string;
  schools: { name: string; city: string; teacherCount: number; studentCount: number; activeAssignmentCount: number; status: string }[];
}

export async function exportSchoolUsagePdf(ctx: SchoolUsagePdfContext) {
  const doc = await createPdfDoc('School Usage Summary');
  let y = drawHeader(doc, 'School Usage Summary', `${ctx.schools.length} schools`);

  for (const school of ctx.schools) {
    y = ensureSpace(doc, y, 10);
    doc.setFont(FONT, 'bold');
    doc.setFontSize(10);
    doc.setTextColor('#101a26');
    doc.text(`${school.name} (${school.city})`, PAGE_MARGIN, y);
    doc.setFont(FONT, 'normal');
    doc.setTextColor(MUTED);
    doc.text(`${school.status} · ${school.teacherCount} teachers · ${school.studentCount} students · ${school.activeAssignmentCount} active`, PAGE_MARGIN, y + 5);
    y += 12;
  }

  drawFooter(doc, `Generated ${formatDateTime(new Date().toISOString(), ctx.locale)}`);
  doc.save(`pasific-school-usage-${Date.now()}.pdf`);
}

export interface ScoringReviewPdfContext {
  locale: string;
  aiModelVersion: string;
  rubricVersion: string;
  overrideStats: { label: string; count: number; avgDelta: string }[];
}

export async function exportScoringReviewSummaryPdf(ctx: ScoringReviewPdfContext) {
  const doc = await createPdfDoc('Scoring Review Summary');
  let y = drawHeader(doc, 'Scoring Review Summary', `Rubric ${ctx.rubricVersion} · Model ${ctx.aiModelVersion}`);

  y = sectionLabel(doc, 'Teacher override statistics', y);
  for (const s of ctx.overrideStats) {
    y = ensureSpace(doc, y, 8);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(10);
    doc.setTextColor('#101a26');
    doc.text(s.label, PAGE_MARGIN, y);
    doc.text(`${s.count} overrides, avg ${s.avgDelta} pts`, PAGE_WIDTH - PAGE_MARGIN, y, { align: 'right' });
    y += 6;
  }

  drawFooter(doc, `Generated ${formatDateTime(new Date().toISOString(), ctx.locale)}`);
  doc.save(`pasific-scoring-review-${Date.now()}.pdf`);
}
