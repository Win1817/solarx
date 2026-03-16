import jsPDF from 'jspdf';
import type { SolarResults, ProjectConfig } from '../store/solarStore';
import irradianceData from '../data/irradiance.json';
import batteriesData from '../data/batteries.json';

// ── Color palette (print-safe) ──────────────────────────────
const C = {
  black:   [15,  17,  22 ] as [number,number,number],
  dark:    [30,  35,  45 ] as [number,number,number],
  mid:     [80,  90,  110] as [number,number,number],
  muted:   [140, 150, 165] as [number,number,number],
  light:   [220, 225, 235] as [number,number,number],
  white:   [255, 255, 255] as [number,number,number],
  sun:     [220, 140,  20] as [number,number,number],  // amber — readable on white
  sunBg:   [255, 248, 230] as [number,number,number],
  green:   [22,  130,  80] as [number,number,number],
  greenBg: [230, 248, 238] as [number,number,number],
  blue:    [30,  100, 200] as [number,number,number],
  blueBg:  [230, 240, 255] as [number,number,number],
  red:     [180,  40,  40] as [number,number,number],
  redBg:   [255, 235, 235] as [number,number,number],
  border:  [210, 215, 225] as [number,number,number],
  rowAlt:  [248, 249, 252] as [number,number,number],
  headerBg:[30,  40,  60 ] as [number,number,number],
};

const PAGE_W = 210;
const PAGE_H = 297;
const ML = 14; // margin left
const MR = 14; // margin right
const CW = PAGE_W - ML - MR; // content width

function newPage(doc: jsPDF): number {
  doc.addPage();
  doc.setFillColor(C.white[0], C.white[1], C.white[2]);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
  return 18;
}

function guard(doc: jsPDF, y: number, need = 22): number {
  return y + need > PAGE_H - 16 ? newPage(doc) : y;
}

// ── Section heading ───────────────────────────────────────────
function sectionHead(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(C.headerBg[0], C.headerBg[1], C.headerBg[2]);
  doc.rect(ML, y, CW, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(C.white[0], C.white[1], C.white[2]);
  doc.text(title.toUpperCase(), ML + 4, y + 5.5);
  return y + 12;
}

// ── Key/Value row ─────────────────────────────────────────────

// ── Two-column KV grid ────────────────────────────────────────
function kvGrid(doc: jsPDF, items: [string, string, ([number,number,number])?][], startY: number): number {
  let y = startY;
  const half = Math.ceil(items.length / 2);
  for (let i = 0; i < half; i++) {
    y = guard(doc, y, 8);
    const alt = i % 2 === 0;
    if (alt) { doc.setFillColor(C.rowAlt[0], C.rowAlt[1], C.rowAlt[2]); doc.rect(ML, y, CW, 7, 'F'); }

    // Left col
    const [lLabel, lVal, lColor] = items[i];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
    doc.text(lLabel, ML + 4, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(lColor ?? C.dark));
    doc.text(lVal, ML + 4 + 44, y + 5);

    // Right col
    const right = items[i + half];
    if (right) {
      const [rLabel, rVal, rColor] = right;
      const rx = ML + CW / 2 + 4;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
      doc.text(rLabel, rx, y + 5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...(rColor ?? C.dark));
      doc.text(rVal, rx + 44, y + 5);
    }
    y += 7;
  }
  return y + 3;
}

// ── Table ─────────────────────────────────────────────────────
function table(
  doc: jsPDF,
  headers: string[],
  rows: (string | { text: string; color?: [number,number,number]; bold?: boolean })[][][],
  colWidths: number[],
  startY: number
): number {
  let y = startY;

  // Header row
  doc.setFillColor(C.dark[0], C.dark[1], C.dark[2]);
  doc.rect(ML, y, CW, 8, 'F');
  let x = ML;
  headers.forEach((h, i) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(C.light[0], C.light[1], C.light[2]);
    doc.text(h, x + 2, y + 5.5);
    x += colWidths[i];
  });
  y += 8;

  rows.forEach((row, ri) => {
    y = guard(doc, y, 8);
    if (ri % 2 === 0) { doc.setFillColor(C.rowAlt[0], C.rowAlt[1], C.rowAlt[2]); doc.rect(ML, y, CW, 7.5, 'F'); }
    x = ML;
    row.forEach((cell, ci) => {
      const item = Array.isArray(cell) ? cell[0] : cell;
      const text = typeof item === 'string' ? item : item.text;
      const color = typeof item === 'string' ? C.dark : (item.color ?? C.dark);
      const bold = typeof item === 'string' ? false : (item.bold ?? false);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...color);
      doc.text(text, x + 2, y + 5);
      x += colWidths[ci];
    });
    // Bottom border
    doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
    doc.setLineWidth(0.2);
    doc.line(ML, y + 7.5, ML + CW, y + 7.5);
    y += 7.5;
  });

  return y + 4;
}

// ── Divider line ──────────────────────────────────────────────
function divider(doc: jsPDF, y: number): number {
  doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
  doc.setLineWidth(0.3);
  doc.line(ML, y, ML + CW, y);
  return y + 5;
}

// ── Badge pill ────────────────────────────────────────────────
function badge(doc: jsPDF, text: string, x: number, y: number, bg: [number,number,number], fg: [number,number,number]) {
  const w = doc.getTextWidth(text) + 6;
  doc.setFillColor(...bg);
  doc.roundedRect(x, y - 4, w, 6, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...fg);
  doc.text(text, x + 3, y + 0.2);
}

// ── Footer ────────────────────────────────────────────────────
function addFooters(doc: jsPDF, projectName: string) {
  const total = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
    doc.setLineWidth(0.3);
    doc.line(ML, PAGE_H - 12, ML + CW, PAGE_H - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
    doc.text(`SolarX — Solar Electrical Install Companion  ·  ${projectName}`, ML, PAGE_H - 7);
    doc.text(`Page ${p} of ${total}`, ML + CW, PAGE_H - 7, { align: 'right' });
  }
}

// ══════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════
export function exportPDF(project: ProjectConfig, results: SolarResults) {
  const { load, panels, batteries, inverter, wiring, roi } = results;
  if (!load || !panels || !batteries || !inverter || !wiring || !roi) return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFillColor(C.white[0], C.white[1], C.white[2]);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  const location = irradianceData.find(l => l.id === project.locationId);
  const chemistry = batteriesData.find(b => b.id === project.batteryChemistryId);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  const refNo = `SX-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*9000)+1000}`;

  let y = 0;

  // ── COVER HEADER ─────────────────────────────────────────────
  // Top color bar
  doc.setFillColor(C.headerBg[0], C.headerBg[1], C.headerBg[2]);
  doc.rect(0, 0, PAGE_W, 38, 'F');

  // Sun logo
  doc.setFillColor(C.sun[0], C.sun[1], C.sun[2]);
  doc.circle(ML + 10, 19, 7, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.2);
  [[19,10,19,13],[19,25,19,28],[10,19,13,19],[25,19,28,19]].forEach(([x1,y1,x2,y2]) => doc.line(x1+ML,y1,x2+ML,y2));
  doc.setLineWidth(0.8);
  [[12.5,12.5,14.5,14.5],[23.5,23.5,25.5,25.5],[25.5,12.5,23.5,14.5],[14.5,23.5,12.5,25.5]].forEach(([x1,y1,x2,y2]) => doc.line(x1+ML,y1,x2+ML,y2));

  // Brand name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(C.white[0], C.white[1], C.white[2]);
  doc.text('SolarX', ML + 24, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(180, 195, 220);
  doc.text('Solar Electrical Install Companion', ML + 24, 23);

  // Doc type badge top right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(C.sun[0], C.sun[1], C.sun[2]);
  doc.text('SYSTEM QUOTATION', ML + CW, 14, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 195, 220);
  doc.text(`Ref: ${refNo}`, ML + CW, 21, { align: 'right' });
  doc.text(`Date: ${dateStr}`, ML + CW, 27, { align: 'right' });

  y = 46;

  // ── PROJECT INFO BOX ─────────────────────────────────────────
  doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(ML, y, CW, 28, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(C.black[0], C.black[1], C.black[2]);
  doc.text(project.name, ML + 6, y + 9);

  // System type badge
  const typeColors: Record<string, [[number,number,number],[number,number,number]]> = {
    offgrid: [C.greenBg, C.green],
    ongrid:  [C.blueBg,  C.blue],
    hybrid:  [C.sunBg,   C.sun],
  };
  const [tbg, tfg] = typeColors[project.systemType] ?? [C.sunBg, C.sun];
  badge(doc, project.systemType.toUpperCase(), ML + 6, y + 18, tbg, tfg);
  badge(doc, `${project.systemVoltage}V SYSTEM`, ML + 6 + doc.getTextWidth(project.systemType.toUpperCase()) + 14, y + 18, C.blueBg, C.blue);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
  doc.text(`Location: ${location?.name || project.locationId}  ·  Peak Sun Hours: ${location?.peakSunHours} hrs/day`, ML + 6, y + 24);

  y += 34;

  // ── SUMMARY STATS CARDS ───────────────────────────────────────
  const cards = [
    { label: 'Daily Load',    value: `${load.dailyKwh.toFixed(2)}`, unit: 'kWh/day',  color: C.sun },
    { label: 'Solar Array',   value: `${panels.numberOfPanels}`,    unit: `panels · ${panels.totalKwp.toFixed(2)} kWp`, color: C.blue },
    { label: 'Battery Bank',  value: `${batteries.numberOfBatteries}`, unit: `units · ${batteries.totalCapacityKwh.toFixed(1)} kWh`, color: C.green },
    { label: 'Inverter',      value: `${inverter.inverter.recommendedInverterKva.toFixed(1)}`, unit: 'kVA', color: C.dark },
  ];
  const cardW = CW / 4;
  cards.forEach((card, i) => {
    const cx = ML + i * cardW;
    doc.setFillColor(C.rowAlt[0], C.rowAlt[1], C.rowAlt[2]);
    doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, y, cardW - 2, 22, 2, 2, 'FD');
    // Accent top bar
    doc.setFillColor(...card.color);
    doc.roundedRect(cx, y, cardW - 2, 2.5, 1, 1, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
    doc.text(card.label.toUpperCase(), cx + 4, y + 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...card.color);
    doc.text(card.value, cx + 4, y + 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
    doc.text(card.unit, cx + 4, y + 20.5);
  });
  y += 27;

  // ── SOLAR PANELS ─────────────────────────────────────────────
  y = guard(doc, y, 60);
  y = sectionHead(doc, '01  Solar Panel System', y);
  y = kvGrid(doc, [
    ['Required Capacity', `${panels.requiredKwp.toFixed(2)} kWp`],
    ['Number of Panels',  `${panels.numberOfPanels} panels`, C.blue],
    ['Panel Wattage',     `${project.panelWattage} W each`],
    ['Array Configuration', `${panels.panelsInSeries}S × ${panels.stringsInParallel}P`],
    ['Total Array Size',  `${panels.totalKwp.toFixed(2)} kWp`],
    ['Est. Daily Generation', `${panels.dailyGenerationKwh.toFixed(2)} kWh/day`, C.green],
    ['Peak Sun Hours',    `${location?.peakSunHours} hrs/day`],
    ['System Loss Factor','20%'],
  ], y);

  // ── BATTERY BANK ─────────────────────────────────────────────
  y = guard(doc, y, 60);
  y = sectionHead(doc, '02  Battery Bank', y);
  y = kvGrid(doc, [
    ['Chemistry',         chemistry?.name ?? project.batteryChemistryId],
    ['Battery Size',      `${project.batteryAh} Ah @ ${project.systemVoltage}V`],
    ['Configuration',     `${batteries.batteriesInSeries}S × ${batteries.batteriesInParallel}P`],
    ['Total Units',       `${batteries.numberOfBatteries} batteries`, C.blue],
    ['Total Capacity',    `${batteries.totalCapacityKwh.toFixed(1)} kWh`],
    ['Usable Capacity',   `${batteries.usableKwh.toFixed(1)} kWh`, C.green],
    ['Depth of Discharge',`${(batteriesData.find(b=>b.id===project.batteryChemistryId)?.maxDoD??0.8)*100}%`],
    ['Autonomy',          `${project.autonomyDays} day(s)`],
  ], y);

  // ── INVERTER & MPPT ───────────────────────────────────────────
  y = guard(doc, y, 50);
  y = sectionHead(doc, '03  Inverter & Charge Controller', y);
  y = kvGrid(doc, [
    ['Inverter Rating',   `${inverter.inverter.recommendedInverterKva.toFixed(1)} kVA`, C.blue],
    ['Inverter Type',     inverter.inverter.inverterType],
    ['MPPT Rating',       `${inverter.mppt.recommendedMpptAmps} A`],
    ['Array Open-Circuit Voc', `${inverter.mppt.openCircuitVoltageVoc} V`],
    ['Array Short-Circuit Isc', `${inverter.mppt.shortCircuitCurrentIsc.toFixed(1)} A`],
    ['System Voltage',    `${project.systemVoltage} VDC`],
  ], y);

  // Notes
  if (inverter.inverter.notes.length > 0) {
    doc.setFillColor(C.sunBg[0], C.sunBg[1], C.sunBg[2]);
    doc.setDrawColor(C.sun[0], C.sun[1], C.sun[2]);
    doc.setLineWidth(0.3);
    const noteLines = inverter.inverter.notes.concat(inverter.mppt.notes).filter(Boolean);
    doc.roundedRect(ML, y, CW, noteLines.length * 6 + 4, 1.5, 1.5, 'FD');
    noteLines.forEach((n, i) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(C.sun[0], C.sun[1], C.sun[2]);
      doc.text(`⚠  ${n}`, ML + 4, y + 7 + i * 6);
    });
    y += noteLines.length * 6 + 8;
  }

  // ── WIRE SIZING TABLE ─────────────────────────────────────────
  y = guard(doc, y, 60);
  y = sectionHead(doc, '04  Wire Sizing & Protection', y);
  y = table(doc,
    ['Segment', 'Current (A)', 'AWG', 'mm²', 'V-Drop %', 'Fuse (A)', 'Status'],
    wiring.segments.map(s => [[
      { text: s.segment.name, color: C.dark, bold: false },
      { text: `${s.segment.currentAmps.toFixed(1)} A`, color: C.dark },
      { text: `#${s.recommendedAwg}`, color: C.blue, bold: true },
      { text: `${s.recommendedMm2}`, color: C.dark },
      { text: `${s.voltageDropPercent.toFixed(2)}%`, color: s.withinSpec ? C.green : C.red },
      { text: `${s.fuseRating} A`, color: C.dark },
      { text: s.withinSpec ? '✓ OK' : '✗ OVER', color: s.withinSpec ? C.green : C.red, bold: true },
    ]]),
    [55, 22, 14, 14, 20, 18, 16],
    y
  );

  // ── BILL OF MATERIALS ─────────────────────────────────────────
  y = guard(doc, y, 80);
  y = sectionHead(doc, '05  Bill of Materials', y);

  const bomRows = [
    ['01', 'Solar Panel', `${project.panelWattage}W Monocrystalline`, `${panels.numberOfPanels} pcs`],
    ['02', 'Battery', `${project.batteryAh}Ah ${project.systemVoltage}V ${(chemistry?.id??'').toUpperCase()}`, `${batteries.numberOfBatteries} pcs`],
    ['03', 'Inverter / Charger', `${inverter.inverter.recommendedInverterKva.toFixed(1)} kVA ${project.systemType} type`, '1 pc'],
    ['04', 'MPPT Charge Controller', `${inverter.mppt.recommendedMpptAmps}A, ${project.systemVoltage}VDC input`, '1 pc'],
    ...wiring.segments.map((s, i) => [
      `0${5+i}`, `DC Cable — ${s.segment.name}`, `AWG #${s.recommendedAwg} (${s.recommendedMm2} mm²)`, `${s.segment.lengthMeters} m`,
    ]),
    ['—', 'Panel Mounting Structure', 'Aluminum rail + L-bracket, galvanized', '1 set'],
    ['—', 'MC4 Connectors', 'UV-resistant, male + female pairs', `${panels.numberOfPanels * 2} pairs`],
    ['—', 'DC Circuit Breaker', 'For each string, rated to array Isc × 1.25', `${panels.stringsInParallel} pcs`],
    ['—', 'AC Circuit Breaker', 'Main output protection', '1 pc'],
    ['—', 'Battery Fuse/BMS', 'Per battery bank sizing', '1 set'],
  ];

  y = table(doc,
    ['#', 'Component', 'Specification', 'Qty'],
    bomRows.map(r => [[
      { text: r[0], color: C.muted },
      { text: r[1], color: C.dark, bold: true },
      { text: r[2], color: C.mid },
      { text: r[3], color: C.blue, bold: true },
    ]]),
    [12, 48, 95, 22],
    y
  );

  // ── FINANCIAL & ROI ───────────────────────────────────────────
  y = guard(doc, y, 80);
  y = sectionHead(doc, '06  Financial Analysis & ROI', y);
  y = kvGrid(doc, [
    ['Total System Cost',  `₱ ${project.totalSystemCostPhp.toLocaleString('en-PH')}`, C.dark],
    ['Electricity Rate',   `₱ ${project.electricityRatePhp} / kWh`],
    ['Annual Savings',     `₱ ${roi.annualSavingsPhp.toLocaleString('en-PH',{maximumFractionDigits:0})}`, C.green],
    ['Payback Period',     `${roi.paybackYears.toFixed(1)} years`, C.sun],
    ['25-Year ROI',        `${roi.roi25Years.toFixed(0)}%`, C.blue],
    ['CO₂ Saved / Year',  `${(roi.co2SavedKgPerYear/1000).toFixed(2)} tonnes`],
  ], y);

  // 10-year projection table
  y = guard(doc, y, 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(C.mid[0], C.mid[1], C.mid[2]);
  doc.text('10-Year Savings Projection', ML, y + 5);
  y += 9;

  const paybackYear = roi.yearlyProjection.find(r => r.netPosition >= 0)?.year;
  y = table(doc,
    ['Year', 'Cumulative Savings (₱)', 'Net Position (₱)', 'Status'],
    roi.yearlyProjection.slice(0, 10).map(r => [[
      { text: `Year ${r.year}`, color: C.dark },
      { text: `₱ ${r.cumulativeSavings.toLocaleString('en-PH',{maximumFractionDigits:0})}`, color: C.dark },
      { text: `₱ ${r.netPosition.toLocaleString('en-PH',{maximumFractionDigits:0})}`, color: r.netPosition >= 0 ? C.green : C.red, bold: true },
      { text: r.year === paybackYear ? '★ BREAKEVEN' : r.netPosition >= 0 ? 'Profitable' : 'Recovery', color: r.year === paybackYear ? C.sun : r.netPosition >= 0 ? C.green : C.muted, bold: r.year === paybackYear },
    ]]),
    [20, 65, 65, 30],
    y
  );

  // ── TERMS & NOTES ─────────────────────────────────────────────
  y = guard(doc, y, 40);
  y = divider(doc, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(C.mid[0], C.mid[1], C.mid[2]);
  doc.text('Notes & Disclaimers', ML, y + 1);
  y += 7;
  const notes = [
    '• All calculations are based on provided load data and standard solar irradiance values.',
    '• Panel output assumes 20% system losses (wiring, inverter, temperature, soiling).',
    '• Battery sizing includes selected depth-of-discharge (DoD) and efficiency factor.',
    '• Wire sizing follows NEC guidelines with voltage drop within 3% for DC, 2% for critical runs.',
    '• Actual costs may vary. This document is for design guidance purposes only.',
    `• Designed for: ${location?.name ?? ''} · Generated by SolarX on ${dateStr}`,
  ];
  notes.forEach(n => {
    y = guard(doc, y, 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
    doc.text(n, ML, y);
    y += 6;
  });

  // ── FOOTERS ───────────────────────────────────────────────────
  addFooters(doc, project.name);

  const filename = `${project.name.replace(/\s+/g,'_')}_SolarX_Quotation_${refNo}.pdf`;
  doc.save(filename);
}
