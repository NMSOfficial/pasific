import { PDF_FONT_FAMILY, ensurePasificFont } from './pdfFonts';

interface AssignmentReportRow {
  studentName: string;
  username: string;
  status: string;
  score?: number;
  submittedAt: string;
}

export async function exportAssignmentReportPdf(input: {
  assignmentTitle: string;
  schoolName?: string;
  className: string;
  maxScore: number;
  averageScore?: number;
  rows: AssignmentReportRow[];
}): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  await ensurePasificFont(doc);
  const font = PDF_FONT_FAMILY;
  const margin = 15;
  const width = 210;
  let y = 18;

  doc.setFillColor('#0b2545');
  doc.rect(0, 0, width, 24, 'F');
  doc.setFont(font, 'bold');
  doc.setFontSize(15);
  doc.setTextColor('#ffffff');
  doc.text('Pasific', margin, 15);

  y = 34;
  doc.setTextColor('#0b2545');
  doc.setFont(font, 'bold');
  doc.setFontSize(14);
  doc.text(input.assignmentTitle, margin, y);
  y += 6;
  doc.setFont(font, 'normal');
  doc.setFontSize(9);
  doc.setTextColor('#4c5a68');
  doc.text(`${input.className}${input.schoolName ? ` — ${input.schoolName}` : ''}`, margin, y);
  y += 6;
  doc.text(`Puan ölçeği: ${input.maxScore} üzerinden    Ortalama: ${input.averageScore ?? '—'}/${input.maxScore}`, margin, y);
  y += 8;

  const ensureSpace = () => {
    if (y > 275) {
      doc.addPage();
      y = 18;
    }
  };

  doc.setFont(font, 'bold');
  doc.setTextColor('#0b2545');
  doc.text('Öğrenci', margin, y);
  doc.text('Durum', 105, y);
  doc.text('Puan', 190, y, { align: 'right' });
  y += 5;
  doc.setDrawColor('#dbe2e9');
  doc.line(margin, y, width - margin, y);
  y += 6;

  for (const row of input.rows) {
    ensureSpace();
    doc.setFont(font, 'normal');
    doc.setFontSize(9);
    doc.setTextColor('#101a26');
    doc.text(row.studentName || '—', margin, y);
    if (row.username) {
      doc.setFontSize(7.5);
      doc.setTextColor('#667381');
      doc.text(`@${row.username}`, margin, y + 4);
    }
    doc.setFontSize(9);
    doc.setTextColor('#101a26');
    doc.text(row.status, 105, y);
    doc.text(row.score !== undefined ? `${row.score}/${input.maxScore}` : '—', 190, y, { align: 'right' });
    if (row.submittedAt) {
      doc.setFontSize(7.5);
      doc.setTextColor('#667381');
      doc.text(row.submittedAt, 105, y + 4);
    }
    y += 10;
  }

  doc.save(`pasific-${input.assignmentTitle.replace(/[^a-z0-9çğıöşü_-]+/gi, '-')}-report.pdf`);
}
