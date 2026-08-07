import type { CriterionScore, Submission } from '../types/entities';
import { formatDateTime } from './format';
import { PDF_FONT_FAMILY, ensurePasificFont } from './pdfFonts';
import { scaleWritingScore } from './scoringScale';

export async function exportScaledWritingResultPdf(input: {
  submission: Submission;
  studentName: string;
  assignmentTitle?: string;
  schoolName?: string;
  locale: string;
  maxPoints: number;
  criterionLabel: (criterion: CriterionScore) => string;
}): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  await ensurePasificFont(doc);

  const font = PDF_FONT_FAMILY;
  const margin = 15;
  const pageWidth = 210;
  const maxPoints = input.maxPoints > 0 ? input.maxPoints : 100;
  const finalScore = scaleWritingScore(input.submission.finalScore ?? input.submission.aiScore, maxPoints);
  const aiScore = scaleWritingScore(input.submission.aiScore, maxPoints);
  let y = 18;

  const ensureSpace = (needed = 18) => {
    if (y + needed > 278) {
      doc.addPage();
      y = 18;
    }
  };

  doc.setFillColor('#0b2545');
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setFont(font, 'bold');
  doc.setFontSize(15);
  doc.setTextColor('#ffffff');
  doc.text('Pasific', margin, 15);

  y = 34;
  doc.setTextColor('#0b2545');
  doc.setFont(font, 'bold');
  doc.setFontSize(14);
  doc.text(input.assignmentTitle ?? input.submission.topicTitle, margin, y);
  y += 6;
  doc.setFont(font, 'normal');
  doc.setFontSize(9);
  doc.setTextColor('#4c5a68');
  doc.text(`${input.studentName}${input.schoolName ? ` — ${input.schoolName}` : ''}`, margin, y);
  y += 6;
  doc.text(`Final score: ${finalScore ?? '—'} / ${maxPoints}${aiScore !== undefined && input.submission.teacherOverrides.length > 0 ? `    AI suggestion: ${aiScore} / ${maxPoints}` : ''}`, margin, y);
  y += 5;
  doc.text(`Submitted: ${input.submission.submittedAt ? formatDateTime(input.submission.submittedAt, input.locale) : '—'}    Word count: ${input.submission.wordCount}`, margin, y);
  y += 9;

  doc.setFont(font, 'bold');
  doc.setFontSize(11);
  doc.setTextColor('#0b2545');
  doc.text('Criterion scores', margin, y);
  y += 6;

  for (const criterion of input.submission.criterionScores) {
    ensureSpace(24);
    const score = criterion.teacherScore ?? criterion.aiScore;
    doc.setFont(font, 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor('#101a26');
    doc.text(`${input.criterionLabel(criterion)} — ${score}/${criterion.maxScore} (${criterion.weight}%)`, margin, y);
    y += 5;
    doc.setFont(font, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor('#4c5a68');
    const explanation = doc.splitTextToSize(criterion.explanation || '', 180);
    doc.text(explanation, margin, y);
    y += explanation.length * 4.2 + 3;
    if (criterion.evidenceQuote) {
      ensureSpace(10);
      const quote = doc.splitTextToSize(`“${criterion.evidenceQuote}”`, 176);
      doc.setTextColor('#0b2545');
      doc.text(quote, margin + 3, y);
      y += quote.length * 4.2 + 3;
    }
  }

  if (input.submission.teacherFeedback) {
    ensureSpace(22);
    doc.setFont(font, 'bold');
    doc.setFontSize(11);
    doc.setTextColor('#0b2545');
    doc.text('Teacher feedback', margin, y);
    y += 6;
    doc.setFont(font, 'normal');
    doc.setFontSize(9);
    doc.setTextColor('#101a26');
    const lines = doc.splitTextToSize(input.submission.teacherFeedback, 180);
    doc.text(lines, margin, y);
  }

  doc.save(`pasific-${input.submission.id}-result.pdf`);
}
