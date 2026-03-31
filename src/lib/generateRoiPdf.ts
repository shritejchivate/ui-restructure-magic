import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface RoiData {
  laborSavings: number;
  errorSavings: number;
  complianceSavings: number;
  throughputGain: number;
  reagentSavings: number;
  totalBenefits: number;
  oneTimeCost: number;
  annualOngoing: number;
  netAnnual: number;
  payback: number;
  yr3cum: number;
  yr5cum: number;
  roi3: number;
  roi5: number;
  breakdown: { label: string; value: number; pct: number }[];
}

interface PlanData {
  name: string;
  monthly: number;
  annual: number;
  onboarding: number;
}

interface PdfParams {
  roi: RoiData;
  plan: PlanData;
  labSize: string;
  modality: string;
  goalLabel: string;
  accentColor: string;
  inp: Record<string, number>;
}

const fmt = (n: number) =>
  n < 0
    ? `-$${Math.abs(Math.round(n)).toLocaleString()}`
    : `$${Math.round(n).toLocaleString()}`;

const fmtK = (n: number) => {
  const a = Math.abs(n),
    s = n < 0 ? "-" : "";
  return a >= 1e6
    ? `${s}$${(a / 1e6).toFixed(1)}M`
    : a >= 1000
      ? `${s}$${Math.round(a / 1000)}K`
      : `${s}$${Math.round(a)}`;
};

const fmtMos = (n: number) =>
  !isFinite(n)
    ? "N/A"
    : n < 1
      ? "<1 mo"
      : n > 60
        ? ">5 yrs"
        : `${n.toFixed(1)} months`;

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

export function generateRoiPdf({
  roi,
  plan,
  labSize,
  modality,
  goalLabel,
  accentColor,
  inp,
}: PdfParams) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentW = pageW - margin * 2;
  const accent = hexToRgb(accentColor);
  let y = 0;

  // ── Header bar ──────────────────────────────────────────────────────
  doc.setFillColor(...accent);
  doc.rect(0, 0, pageW, 38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("LIMS PLATFORM", margin, 14);

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("ROI Summary Report", margin, 26);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), pageW - margin, 14, { align: "right" });
  doc.text(`Goal: ${goalLabel}`, pageW - margin, 22, { align: "right" });

  y = 48;

  // ── Lab Profile ─────────────────────────────────────────────────────
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("LAB PROFILE", margin, y);
  y += 6;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  const profileData = [
    ["Lab Size", labSize.charAt(0).toUpperCase() + labSize.slice(1)],
    ["Testing Modality", modality],
    ["Annual Test Volume", inp.volume.toLocaleString()],
    ["Revenue per Test", fmt(inp.revPerTest)],
    ["FTEs", String(inp.ftes)],
    ["Avg Salary", fmt(inp.salary)],
    ["Annual Reagent Spend", fmt(inp.reagentSpend)],
  ];

  doc.setFontSize(9);
  const colW = contentW / 2;
  profileData.forEach((row, i) => {
    const col = i % 2;
    const xBase = margin + col * colW;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(row[0], xBase, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(row[1], xBase + colW - 4, y, { align: "right" });
    if (col === 1 || i === profileData.length - 1) y += 6;
  });

  y += 6;

  // ── Key Metrics ─────────────────────────────────────────────────────
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("KEY METRICS", margin, y);
  y += 6;
  doc.line(margin, y, pageW - margin, y);
  y += 4;

  const metrics = [
    { label: "Payback Period", value: fmtMos(roi.payback) },
    { label: "3-Year ROI", value: `${(roi.roi3 * 100).toFixed(0)}%` },
    { label: "Annual Net Benefit", value: fmt(roi.netAnnual) },
    { label: "5-Year Net Benefit", value: fmtK(roi.yr5cum) },
  ];

  const metricW = contentW / 4;
  metrics.forEach((m, i) => {
    const x = margin + i * metricW;
    // Box
    doc.setFillColor(i === 0 ? accent[0] : 248, i === 0 ? accent[1] : 250, i === 0 ? accent[2] : 252);
    doc.roundedRect(x, y, metricW - 3, 20, 2, 2, "F");

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(i === 0 ? 255 : 30, i === 0 ? 255 : 41, i === 0 ? 255 : 59);
    doc.text(m.value, x + (metricW - 3) / 2, y + 10, { align: "center" });

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(i === 0 ? 220 : 148, i === 0 ? 220 : 163, i === 0 ? 230 : 184);
    doc.text(m.label, x + (metricW - 3) / 2, y + 16, { align: "center" });
  });

  y += 28;

  // ── Benefit Breakdown Table ─────────────────────────────────────────
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("ANNUAL BENEFIT BREAKDOWN", margin, y);
  y += 3;

  const breakdownColors: [number, number, number][] = [
    [99, 102, 241],
    [14, 165, 233],
    [16, 185, 129],
    [245, 158, 11],
    [239, 68, 68],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Category", "Annual Value", "% of Total"]],
    body: roi.breakdown.map((b, i) => [
      { content: b.label, styles: { textColor: breakdownColors[i] } },
      fmt(b.value),
      `${(b.pct * 100).toFixed(1)}%`,
    ]),
    foot: [["Total Annual Benefits", fmt(roi.totalBenefits), "100%"]],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [241, 245, 249], textColor: [100, 116, 139], fontStyle: "bold", fontSize: 8 },
    footStyles: { fillColor: accent, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 251, 252] },
    columnStyles: {
      0: { cellWidth: contentW * 0.5 },
      1: { halign: "right" },
      2: { halign: "right" },
    },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // ── Plan & Investment ───────────────────────────────────────────────
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("PLAN & INVESTMENT", margin, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Item", "Amount"]],
    body: [
      ["Selected Plan", plan.name],
      ["Monthly License", `$${plan.monthly.toLocaleString()}/mo`],
      ["Annual License", `$${plan.annual.toLocaleString()}/yr`],
      ["Onboarding Fee", fmt(plan.onboarding)],
      ["One-Time Investment (Total)", fmt(roi.oneTimeCost)],
      ["Annual Ongoing Costs", fmt(roi.annualOngoing)],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [241, 245, 249], textColor: [100, 116, 139], fontStyle: "bold", fontSize: 8 },
    columnStyles: {
      0: { cellWidth: contentW * 0.6 },
      1: { halign: "right", fontStyle: "bold" },
    },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // ── 5-Year Cash Flow ────────────────────────────────────────────────
  if (y > 230) {
    doc.addPage();
    y = 20;
  }

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("5-YEAR CASH FLOW PROJECTION", margin, y);
  y += 3;

  const cfRows = [
    ["One-time investment", fmtK(-roi.oneTimeCost), "—", "—", "—", "—", "—"],
    ["Annual ongoing", "—", fmtK(-roi.annualOngoing), fmtK(-roi.annualOngoing), fmtK(-roi.annualOngoing), fmtK(-roi.annualOngoing), fmtK(-roi.annualOngoing)],
    ["Gross benefits", "—", fmtK(roi.totalBenefits * 0.6), fmtK(roi.totalBenefits * 0.8), fmtK(roi.totalBenefits), fmtK(roi.totalBenefits), fmtK(roi.totalBenefits)],
    ["Net cash flow", fmtK(-roi.oneTimeCost), fmtK(roi.totalBenefits * 0.6 - roi.annualOngoing), fmtK(roi.totalBenefits * 0.8 - roi.annualOngoing), fmtK(roi.netAnnual), fmtK(roi.netAnnual), fmtK(roi.netAnnual)],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["", "Yr 0", "Yr 1", "Yr 2", "Yr 3", "Yr 4", "Yr 5"]],
    body: cfRows,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [241, 245, 249], textColor: [100, 116, 139], fontStyle: "bold", fontSize: 7, halign: "right" },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold", cellWidth: contentW * 0.28 },
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index === 3) {
        data.cell.styles.fillColor = accent;
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // ── Footer note ─────────────────────────────────────────────────────
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Sources: CAP Q-Probes, CLMA, CLSI EP23, BLS 2024, CMS. Estimates for planning purposes only. Actual ROI depends on implementation quality, staff adoption, and workflow complexity.",
    margin,
    y,
    { maxWidth: contentW }
  );

  // ── Save ────────────────────────────────────────────────────────────
  doc.save(`LIMS_ROI_Report_${labSize}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
