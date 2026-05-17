import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ReportDataset } from '@/types/statistics.types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', { year: 'numeric', month: 'long', day: 'numeric' });
}

async function generateExcel(dataset: ReportDataset): Promise<Blob> {
  const wb = XLSX.utils.book_new();
  const tab = dataset.tab;

  const kpiRows = tab.kpis.map((k) => [k.label, k.value, k.sublabel || '']);
  const kpiSheet = XLSX.utils.aoa_to_sheet([
    [`Reporte - ${dataset.domain}`, '', ''],
    [`Generado: ${formatDate(dataset.generatedAt)}`, '', ''],
    ['', '', ''],
    ['Indicador', 'Valor', 'Detalle'],
    ...kpiRows,
  ]);
  XLSX.utils.book_append_sheet(wb, kpiSheet, 'KPIs');

  if (tab.table) {
    const header = tab.table.columns.map((c) => c.label);
    const rows = tab.table.rows.map((r) => tab.table!.columns.map((c) => r[c.key] ?? ''));
    const dataSheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
    XLSX.utils.book_append_sheet(wb, dataSheet, 'Detalle');
  }

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

async function generatePDF(dataset: ReportDataset): Promise<Blob> {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const tab = dataset.tab;
  const margin = 10;

  doc.setFontSize(24);
  doc.text('Reporte Ejecutivo', margin, 30);
  doc.setFontSize(12);
  doc.text('IGLESIABD', margin, 40);
  doc.setFontSize(10);
  const domainLabel: Record<string, string> = {
    iglesia: 'Iglesia', ministerios: 'Ministerios',
    'eventos-tareas': 'Eventos y Tareas', aula: 'Aula',
  };
  doc.text(`Seccion: ${domainLabel[dataset.domain] || dataset.domain}`, margin, 50);
  if (dataset.churchName) doc.text(`Iglesia: ${dataset.churchName}`, margin, 57);
  doc.text(`Generado: ${formatDate(dataset.generatedAt)}`, margin, 64);

  const startDate = dataset.dateRange.start ? formatDate(dataset.dateRange.start) : 'Inicio';
  const endDate = dataset.dateRange.end ? formatDate(dataset.dateRange.end) : 'Hoy';
  doc.text(`Periodo: ${startDate} - ${endDate}`, margin, 71);

  doc.line(margin, 80, margin + 190, 80);

  let yPos = 90;
  doc.setFontSize(14);
  doc.text('Indicadores Clave', margin, yPos);
  yPos += 10;

  const kpiRows = tab.kpis.map((k) => [k.label, String(k.value), k.sublabel || '']);
  autoTable(doc, {
    startY: yPos,
    head: [['Indicador', 'Valor', 'Detalle']],
    body: kpiRows,
    theme: 'grid',
    headStyles: { fillColor: [26, 127, 168] },
    styles: { fontSize: 9 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  if (tab.table && tab.table.rows.length > 0) {
    const header = tab.table.columns.map((c) => c.label);
    const body = tab.table.rows.map((r) => tab.table!.columns.map((c) => String(r[c.key] ?? '')));
    autoTable(doc, {
      startY: yPos,
      head: [header],
      body,
      theme: 'striped',
      headStyles: { fillColor: [26, 127, 168] },
      styles: { fontSize: 8 },
    });
  }

  return doc.output('blob');
}

export async function downloadReport(dataset: ReportDataset, format: 'xlsx' | 'pdf', filename?: string): Promise<void> {
  const blob = format === 'xlsx' ? await generateExcel(dataset) : await generatePDF(dataset);
  const ext = format === 'xlsx' ? 'xlsx' : 'pdf';
  const name = filename || `estadisticas-${dataset.domain}-${new Date().toISOString().split('T')[0]}.${ext}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export { generateExcel, generatePDF };
