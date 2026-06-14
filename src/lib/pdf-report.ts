import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { MODALIDADES, METODOS_PAGO, type Listin, type Modalidad } from "@/lib/api";

interface Args {
  periodo: string;
  from: string;
  to: string;
  modalidad: Modalidad | "all";
  items: Listin[];
  total: number;
  porModalidad: { name: string; total: number; count: number }[];
  porPago: { name: string; total: number; count: number }[];
}

const NAVY: [number, number, number] = [30, 58, 95];
const ACCENT: [number, number, number] = [59, 111, 160];

function fmt(n: number) {
  return n.toLocaleString("es-VE", { minimumFractionDigits: 2 });
}

function drawBarChart(
  doc: jsPDF,
  data: { name: string; total: number }[],
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
) {
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.text(title, x, y - 2);

  // chart frame
  doc.setDrawColor(220);
  doc.setFillColor(250, 251, 253);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");

  const pad = 8;
  const innerX = x + pad;
  const innerY = y + pad;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2 - 10; // leave space for labels

  const max = Math.max(...data.map((d) => d.total), 1);
  const barW = innerW / data.length - 4;

  data.forEach((d, i) => {
    const bx = innerX + i * (barW + 4) + 2;
    const bh = (d.total / max) * innerH;
    const by = innerY + innerH - bh;
    doc.setFillColor(...NAVY);
    doc.roundedRect(bx, by, barW, bh, 1, 1, "F");
    doc.setFontSize(7);
    doc.setTextColor(80);
    doc.setFont("helvetica", "normal");
    doc.text(d.name, bx + barW / 2, innerY + innerH + 5, { align: "center", maxWidth: barW + 4 });
    if (d.total > 0) {
      doc.setFontSize(7);
      doc.setTextColor(...NAVY);
      doc.text(fmt(d.total), bx + barW / 2, by - 1, { align: "center" });
    }
  });
}

export async function generateReportPDF(args: Args) {
  const { periodo, from, to, modalidad, items, total, porModalidad, porPago } = args;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Terminal Alí Primera", margin, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Reporte de Recaudación de Listines", margin, 18);
  doc.setFontSize(8);
  doc.text(`Generado: ${new Date().toLocaleString("es-VE")}`, pageW - margin, 12, { align: "right" });

  // Filters block
  let y = 36;
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Filtros aplicados", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60);
  const modLabel = modalidad === "all" ? "Todas" : MODALIDADES.find((m) => m.value === modalidad)?.label;
  doc.text(
    `Período: ${periodo.toUpperCase()}   |   Desde: ${from}   |   Hasta: ${to}   |   Modalidad: ${modLabel}`,
    margin,
    y,
  );

  // KPIs
  y += 8;
  const kpiW = (pageW - margin * 2 - 8) / 3;
  const kpis = [
    { label: "TOTAL RECAUDADO", value: `Bs. ${fmt(total)}` },
    { label: "LISTINES EMITIDOS", value: String(items.length) },
    { label: "PROMEDIO", value: `Bs. ${fmt(items.length ? total / items.length : 0)}` },
  ];
  kpis.forEach((k, i) => {
    const x = margin + i * (kpiW + 4);
    doc.setFillColor(245, 248, 252);
    doc.setDrawColor(220, 230, 240);
    doc.roundedRect(x, y, kpiW, 18, 2, 2, "FD");
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.setFont("helvetica", "bold");
    doc.text(k.label, x + 4, y + 6);
    doc.setFontSize(13);
    doc.setTextColor(...NAVY);
    doc.text(k.value, x + 4, y + 14);
  });

  // Charts
  y += 24;
  const chartW = (pageW - margin * 2 - 6) / 2;
  drawBarChart(doc, porModalidad, margin, y + 4, chartW, 50, "Por modalidad (Bs.)");
  drawBarChart(doc, porPago, margin + chartW + 6, y + 4, chartW, 50, "Por método de pago (Bs.)");

  // Summary tables
  y += 60;
  autoTable(doc, {
    startY: y,
    head: [["Modalidad", "Listines", "Total (Bs.)"]],
    body: porModalidad.map((m) => [m.name, m.count, fmt(m.total)]),
    headStyles: { fillColor: NAVY, textColor: 255 },
    styles: { fontSize: 9 },
    margin: { left: margin, right: pageW / 2 + 2 },
    tableWidth: pageW / 2 - margin - 2,
  });

  autoTable(doc, {
    startY: y,
    head: [["Método de pago", "Listines", "Total (Bs.)"]],
    body: porPago.map((m) => [m.name, m.count, fmt(m.total)]),
    headStyles: { fillColor: ACCENT, textColor: 255 },
    styles: { fontSize: 9 },
    margin: { left: pageW / 2 + 2, right: margin },
    tableWidth: pageW / 2 - margin - 2,
  });

  // Detail table on new page
  doc.addPage();
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 14, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Detalle de listines", margin, 9);

  autoTable(doc, {
    startY: 20,
    head: [["Fecha", "Placa", "Organización", "Propietario", "Modalidad", "Pago", "Monto"]],
    body: items.map((i) => [
      i.fecha ? new Date(i.fecha).toLocaleString("es-VE") : "—",
      i.placa,
      i.organizacion,
      i.propietario,
      MODALIDADES.find((m) => m.value === i.modalidad)?.label || i.modalidad,
      METODOS_PAGO.find((m) => m.value === i.metodoPago)?.label || i.metodoPago,
      fmt(Number(i.monto)),
    ]),
    headStyles: { fillColor: NAVY, textColor: 255 },
    styles: { fontSize: 8, cellPadding: 1.8 },
    columnStyles: { 6: { halign: "right" } },
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      const pageCount = doc.getNumberOfPages();
      const current = doc.getCurrentPageInfo().pageNumber;
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(
        `Página ${current} de ${pageCount}  ·  Terminal Alí Primera`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 6,
        { align: "center" },
      );
    },
  });

  doc.save(`reporte-${periodo}-${from}_a_${to}.pdf`);
}
