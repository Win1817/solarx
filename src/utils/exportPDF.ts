import jsPDF from 'jspdf';
import type { SolarResults, ProjectConfig } from '../store/solarStore';
import irradianceData from '../data/irradiance.json';
import batteriesData from '../data/batteries.json';

// ── Color palette ─────────────────────────────────────────────
const W = [255,255,255] as const;
const BLK = [20, 24, 32] as const;
const DARK = [40, 48, 62] as const;
const MID = [90, 100, 120] as const;
const MUTED = [150, 158, 175] as const;
const LITE = [220, 225, 235] as const;
const BORD = [210, 215, 225] as const;
const ROW  = [248, 249, 252] as const;
const HDR  = [28,  38,  58 ] as const;

const AMBER   = [185, 110,  10] as const;
const AMBER_B = [255, 248, 228] as const;
const GRN     = [18,  120,  68] as const;
const GRN_B   = [228, 248, 236] as const;
const BLU     = [25,   90, 185] as const;
const BLU_B   = [228, 238, 255] as const;
const RED     = [175,  30,  30] as const;

const PW = 210, PH = 297, ML = 14, CW = 182;

type RGB = readonly [number, number, number];

function fill(doc: jsPDF, c: RGB) { doc.setFillColor(c[0], c[1], c[2]); }
function stroke(doc: jsPDF, c: RGB) { doc.setDrawColor(c[0], c[1], c[2]); }
function ink(doc: jsPDF, c: RGB) { doc.setTextColor(c[0], c[1], c[2]); }

function guard(doc: jsPDF, y: number, need = 20): number {
  if (y + need > PH - 16) {
    doc.addPage();
    fill(doc, W); doc.rect(0, 0, PW, PH, 'F');
    return 18;
  }
  return y;
}

function sectionHead(doc: jsPDF, title: string, y: number): number {
  fill(doc, HDR); doc.rect(ML, y, CW, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  ink(doc, W);
  doc.text(title, ML + 4, y + 6.2);
  return y + 13;
}

function divLine(doc: jsPDF, y: number): number {
  stroke(doc, BORD); doc.setLineWidth(0.3);
  doc.line(ML, y, ML + CW, y);
  return y + 5;
}

// ── Two-column key/value grid ─────────────────────────────────
function kvGrid(doc: jsPDF, rows: [string, string, RGB?][], y: number): number {
  const half = Math.ceil(rows.length / 2);
  for (let i = 0; i < half; i++) {
    y = guard(doc, y, 8);
    if (i % 2 === 0) { fill(doc, ROW); doc.rect(ML, y, CW, 7.5, 'F'); }

    const [ll, lv, lc] = rows[i];
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); ink(doc, MUTED);
    doc.text(ll, ML + 4, y + 5.2);
    doc.setFont('helvetica', 'bold'); ink(doc, lc ?? DARK);
    doc.text(lv, ML + 4 + 46, y + 5.2);

    const right = rows[i + half];
    if (right) {
      const [rl, rv, rc] = right;
      const rx = ML + CW / 2 + 4;
      doc.setFont('helvetica', 'normal'); ink(doc, MUTED);
      doc.text(rl, rx, y + 5.2);
      doc.setFont('helvetica', 'bold'); ink(doc, rc ?? DARK);
      doc.text(rv, rx + 46, y + 5.2);
    }
    y += 7.5;
  }
  return y + 4;
}

// ── Generic table ─────────────────────────────────────────────
type Cell = string | { t: string; c?: RGB; b?: boolean };
function cell(v: Cell): { t: string; c: RGB; b: boolean } {
  if (typeof v === 'string') return { t: v, c: DARK, b: false };
  return { t: v.t, c: v.c ?? DARK, b: v.b ?? false };
}

function drawTable(
  doc: jsPDF,
  headers: string[],
  rows: Cell[][],
  colW: number[],
  y: number
): number {
  // Header
  y = guard(doc, y, 10);
  fill(doc, DARK); doc.rect(ML, y, CW, 8.5, 'F');
  let x = ML;
  headers.forEach((h, i) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); ink(doc, LITE);
    doc.text(h, x + 2, y + 6);
    x += colW[i];
  });
  y += 8.5;

  rows.forEach((row, ri) => {
    const rh = 8;
    y = guard(doc, y, rh + 2);
    if (ri % 2 === 0) { fill(doc, ROW); doc.rect(ML, y, CW, rh, 'F'); }
    stroke(doc, BORD); doc.setLineWidth(0.15);
    doc.line(ML, y + rh, ML + CW, y + rh);

    x = ML;
    row.forEach((v, ci) => {
      const { t, c, b } = cell(v);
      doc.setFont('helvetica', b ? 'bold' : 'normal');
      doc.setFontSize(8);
      ink(doc, c);
      // Clip text to column width
      const maxW = colW[ci] - 4;
      const str = doc.getTextWidth(t) > maxW
        ? doc.splitTextToSize(t, maxW)[0] + (doc.splitTextToSize(t, maxW).length > 1 ? '..' : '')
        : t;
      doc.text(str, x + 2, y + 5.5);
      x += colW[ci];
    });
    y += rh;
  });
  return y + 5;
}

function addFooters(doc: jsPDF, name: string) {
  const n = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    doc.setPage(p);
    stroke(doc, BORD); doc.setLineWidth(0.3);
    doc.line(ML, PH - 12, ML + CW, PH - 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); ink(doc, MUTED);
    doc.text('SolarX — Solar Electrical Install Companion  |  ' + name, ML, PH - 7);
    doc.text('Page ' + p + ' of ' + n, ML + CW, PH - 7, { align: 'right' });
  }
}

// ══════════════════════════════════════════════════════════════
export function exportPDF(project: ProjectConfig, results: SolarResults) {
  const { load, panels, batteries, inverter, wiring, roi } = results;
  if (!load || !panels || !batteries || !inverter || !wiring || !roi) return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  fill(doc, W); doc.rect(0, 0, PW, PH, 'F');

  const loc  = irradianceData.find(l => l.id === project.locationId);
  const chem = batteriesData.find(b => b.id === project.batteryChemistryId);
  const now  = new Date();
  const date = now.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  const ref  = 'SX-' + now.getFullYear() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0') + '-' + (Math.floor(Math.random()*9000)+1000);

  let y = 0;

  // ── HEADER BAR ───────────────────────────────────────────────
  fill(doc, HDR); doc.rect(0, 0, PW, 40, 'F');

  // Sun icon — pure geometric, no special chars
  fill(doc, AMBER); doc.circle(ML + 10, 20, 7, 'F');
  stroke(doc, W); doc.setLineWidth(1.5);
  const cx = ML + 10, cy = 20;
  [[cx,cy-10,cx,cy-14],[cx,cy+10,cx,cy+14],[cx-10,cy,cx-14,cy],[cx+10,cy,cx+14,cy]].forEach(([x1,y1,x2,y2])=>doc.line(x1,y1,x2,y2));
  doc.setLineWidth(1);
  [[cx-7,cy-7,cx-5,cy-5],[cx+7,cy+7,cx+5,cy+5],[cx+7,cy-7,cx+5,cy-5],[cx-7,cy+7,cx-5,cy+5]].forEach(([x1,y1,x2,y2])=>doc.line(x1,y1,x2,y2));

  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); ink(doc, W);
  doc.text('SolarX', ML + 24, 17);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); ink(doc, LITE);
  doc.text('Solar Electrical Install Companion', ML + 24, 24);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); ink(doc, AMBER);
  doc.text('SYSTEM QUOTATION', ML + CW, 14, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); ink(doc, LITE);
  doc.text('Ref: ' + ref, ML + CW, 21, { align: 'right' });
  doc.text('Date: ' + date, ML + CW, 28, { align: 'right' });

  y = 48;

  // ── PROJECT INFO BOX ─────────────────────────────────────────
  stroke(doc, BORD); doc.setLineWidth(0.4);
  doc.roundedRect(ML, y, CW, 30, 2, 2, 'S');

  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); ink(doc, BLK);
  doc.text(project.name, ML + 6, y + 10);

  // Badges (text-only, no special char)
  const typeLabel = project.systemType.toUpperCase() + ' SYSTEM';
  const voltLabel = project.systemVoltage + 'V';
  const badgeColor: Record<string, RGB> = { offgrid: GRN, ongrid: BLU, hybrid: AMBER };
  const badgeBg: Record<string, RGB>    = { offgrid: GRN_B, ongrid: BLU_B, hybrid: AMBER_B };
  const bc = badgeColor[project.systemType] ?? AMBER;
  const bb = badgeBg[project.systemType] ?? AMBER_B;

  let bx = ML + 6;
  const drawBadge = (label: string, bg: RGB, fg: RGB) => {
    const bw = doc.getTextWidth(label) + 8;
    fill(doc, bg); stroke(doc, fg); doc.setLineWidth(0.3);
    doc.roundedRect(bx, y + 15, bw, 6.5, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); ink(doc, fg);
    doc.text(label, bx + 4, y + 20);
    bx += bw + 4;
  };
  drawBadge(typeLabel, bb, bc);
  drawBadge(voltLabel, BLU_B, BLU);

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); ink(doc, MUTED);
  doc.text('Location: ' + (loc?.name ?? project.locationId) + '   Peak Sun Hours: ' + (loc?.peakSunHours ?? '-') + ' hrs/day', ML + 6, y + 27);

  y += 36;

  // ── STAT CARDS ───────────────────────────────────────────────
  const cards = [
    { label: 'DAILY LOAD',   val: load.dailyKwh.toFixed(2),               unit: 'kWh/day',  accent: AMBER },
    { label: 'SOLAR ARRAY',  val: String(panels.numberOfPanels),           unit: panels.totalKwp.toFixed(2)+' kWp total', accent: BLU },
    { label: 'BATTERY BANK', val: String(batteries.numberOfBatteries),     unit: batteries.totalCapacityKwh.toFixed(1)+' kWh total', accent: GRN },
    { label: 'INVERTER',     val: inverter.inverter.recommendedInverterKva.toFixed(1), unit: 'kVA', accent: DARK },
  ];
  const cw4 = CW / 4;
  cards.forEach((card, i) => {
    const cx2 = ML + i * cw4;
    fill(doc, ROW); stroke(doc, BORD); doc.setLineWidth(0.3);
    doc.roundedRect(cx2, y, cw4 - 2, 24, 2, 2, 'FD');
    fill(doc, card.accent); doc.roundedRect(cx2, y, cw4 - 2, 3, 1, 1, 'F');
    doc.rect(cx2, y + 1.5, cw4 - 2, 1.5, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); ink(doc, MUTED);
    doc.text(card.label, cx2 + 4, y + 9);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); ink(doc, card.accent);
    doc.text(card.val, cx2 + 4, y + 18);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); ink(doc, MUTED);
    doc.text(card.unit, cx2 + 4, y + 22.5);
  });
  y += 30;

  // ── 01 SOLAR PANELS ──────────────────────────────────────────
  y = guard(doc, y, 70);
  y = sectionHead(doc, '01   SOLAR PANEL SYSTEM', y);
  y = kvGrid(doc, [
    ['Required Capacity',   panels.requiredKwp.toFixed(2) + ' kWp'],
    ['Number of Panels',    panels.numberOfPanels + ' panels', BLU],
    ['Panel Wattage',       project.panelWattage + ' W each'],
    ['Array Configuration', panels.panelsInSeries + 'S x ' + panels.stringsInParallel + 'P'],
    ['Total Array Size',    panels.totalKwp.toFixed(2) + ' kWp'],
    ['Est. Daily Generation', panels.dailyGenerationKwh.toFixed(2) + ' kWh/day', GRN],
    ['Peak Sun Hours',      (loc?.peakSunHours ?? '-') + ' hrs/day'],
    ['System Loss Factor',  '20%'],
  ], y);

  // ── 02 BATTERY BANK ──────────────────────────────────────────
  y = guard(doc, y, 70);
  y = sectionHead(doc, '02   BATTERY BANK', y);
  const dod = batteriesData.find(b => b.id === project.batteryChemistryId)?.maxDoD ?? 0.8;
  y = kvGrid(doc, [
    ['Chemistry',           chem?.name ?? project.batteryChemistryId],
    ['Battery Size',        project.batteryAh + ' Ah @ ' + project.systemVoltage + 'V'],
    ['Configuration',       batteries.batteriesInSeries + 'S x ' + batteries.batteriesInParallel + 'P'],
    ['Total Units',         batteries.numberOfBatteries + ' batteries', BLU],
    ['Total Capacity',      batteries.totalCapacityKwh.toFixed(1) + ' kWh'],
    ['Usable Capacity',     batteries.usableKwh.toFixed(1) + ' kWh', GRN],
    ['Depth of Discharge',  (dod * 100).toFixed(0) + '%'],
    ['Autonomy',            project.autonomyDays + ' day(s)'],
  ], y);

  // ── 03 INVERTER & MPPT ───────────────────────────────────────
  y = guard(doc, y, 60);
  y = sectionHead(doc, '03   INVERTER & CHARGE CONTROLLER', y);
  y = kvGrid(doc, [
    ['Inverter Rating',         inverter.inverter.recommendedInverterKva.toFixed(1) + ' kVA', BLU],
    ['Inverter Type',           inverter.inverter.inverterType],
    ['MPPT Rating',             inverter.mppt.recommendedMpptAmps + ' A'],
    ['Array Voc',               inverter.mppt.openCircuitVoltageVoc + ' V'],
    ['Array Isc',               inverter.mppt.shortCircuitCurrentIsc.toFixed(1) + ' A'],
    ['System Voltage',          project.systemVoltage + ' VDC'],
  ], y);

  // Notes (ASCII safe)
  const allNotes = [...inverter.inverter.notes, ...inverter.mppt.notes].filter(Boolean);
  if (allNotes.length > 0) {
    y = guard(doc, y, allNotes.length * 7 + 8);
    fill(doc, AMBER_B); stroke(doc, AMBER); doc.setLineWidth(0.3);
    doc.roundedRect(ML, y, CW, allNotes.length * 7 + 6, 1.5, 1.5, 'FD');
    allNotes.forEach((n, i) => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); ink(doc, AMBER);
      doc.text('NOTE: ' + n, ML + 4, y + 6 + i * 7);
    });
    y += allNotes.length * 7 + 10;
  }

  // ── 04 WIRE SIZING ───────────────────────────────────────────
  y = guard(doc, y, 60);
  y = sectionHead(doc, '04   WIRE SIZING & PROTECTION', y);
  const wireRows: Cell[][] = wiring.segments.map(s => [
    { t: s.segment.name,                    c: DARK,  b: false },
    { t: s.segment.currentAmps.toFixed(1) + ' A',    c: DARK },
    { t: '#' + s.recommendedAwg,            c: BLU,   b: true  },
    { t: s.recommendedMm2 + ' mm2',         c: DARK },
    { t: s.voltageDropPercent.toFixed(2) + '%', c: s.withinSpec ? GRN : RED },
    { t: s.fuseRating + ' A',               c: DARK },
    { t: s.withinSpec ? 'OK' : 'OVER',      c: s.withinSpec ? GRN : RED, b: true },
  ]);
  y = drawTable(doc,
    ['Segment', 'Current', 'AWG', 'Size', 'V-Drop', 'Fuse', 'Status'],
    wireRows,
    [54, 22, 18, 20, 20, 18, 18],
    y
  );

  // ── 05 BILL OF MATERIALS ─────────────────────────────────────
  y = guard(doc, y, 80);
  y = sectionHead(doc, '05   BILL OF MATERIALS', y);
  const bomRows: Cell[][] = [
    [{ t:'01',c:MUTED }, { t:'Solar Panel',c:DARK,b:true }, { t:project.panelWattage+'W Monocrystalline PERC',c:MID }, { t:panels.numberOfPanels+' pcs',c:BLU,b:true }],
    [{ t:'02',c:MUTED }, { t:'Battery',c:DARK,b:true }, { t:project.batteryAh+'Ah '+project.systemVoltage+'V '+(chem?.id.toUpperCase()??''),c:MID }, { t:batteries.numberOfBatteries+' pcs',c:BLU,b:true }],
    [{ t:'03',c:MUTED }, { t:'Inverter / Charger',c:DARK,b:true }, { t:inverter.inverter.recommendedInverterKva.toFixed(1)+'kVA '+project.systemType+' type',c:MID }, { t:'1 pc',c:BLU,b:true }],
    [{ t:'04',c:MUTED }, { t:'MPPT Controller',c:DARK,b:true }, { t:inverter.mppt.recommendedMpptAmps+'A, '+project.systemVoltage+'VDC input',c:MID }, { t:'1 pc',c:BLU,b:true }],
    ...wiring.segments.map((s, i): Cell[] => [
      { t: '0'+(5+i), c: MUTED },
      { t: 'DC Cable - '+s.segment.name, c: DARK, b: true },
      { t: 'AWG #'+s.recommendedAwg+' ('+s.recommendedMm2+' mm2), '+s.segment.lengthMeters+'m run', c: MID },
      { t: s.segment.lengthMeters+' m', c: BLU, b: true },
    ]),
    [{ t:'--',c:MUTED }, { t:'Panel Mounting',c:DARK,b:true }, { t:'Aluminum rail + L-bracket, galvanized hardware',c:MID }, { t:'1 set',c:BLU,b:true }],
    [{ t:'--',c:MUTED }, { t:'MC4 Connectors',c:DARK,b:true }, { t:'UV-resistant, male + female pairs',c:MID }, { t:panels.numberOfPanels*2+' pairs',c:BLU,b:true }],
    [{ t:'--',c:MUTED }, { t:'DC Circuit Breaker',c:DARK,b:true }, { t:'String protection, rated 1.25x Isc',c:MID }, { t:panels.stringsInParallel+' pcs',c:BLU,b:true }],
    [{ t:'--',c:MUTED }, { t:'AC Circuit Breaker',c:DARK,b:true }, { t:'Main output panel protection',c:MID }, { t:'1 pc',c:BLU,b:true }],
    [{ t:'--',c:MUTED }, { t:'Battery Fuse / BMS',c:DARK,b:true }, { t:'Per battery bank, sized to bank current',c:MID }, { t:'1 set',c:BLU,b:true }],
  ];
  y = drawTable(doc,
    ['#', 'Component', 'Specification', 'Qty'],
    bomRows,
    [12, 52, 98, 20],
    y
  );

  // ── 06 FINANCIAL ANALYSIS ────────────────────────────────────
  y = guard(doc, y, 80);
  y = sectionHead(doc, '06   FINANCIAL ANALYSIS & ROI', y);

  // Summary box
  const finItems: [string, string, RGB?][] = [
    ['Total System Cost',   'PHP ' + project.totalSystemCostPhp.toLocaleString('en-PH'), DARK],
    ['Electricity Rate',    'PHP ' + project.electricityRatePhp + ' / kWh'],
    ['Annual Savings',      'PHP ' + roi.annualSavingsPhp.toLocaleString('en-PH', { maximumFractionDigits: 0 }), GRN],
    ['Payback Period',      roi.paybackYears.toFixed(1) + ' years', AMBER],
    ['25-Year ROI',         roi.roi25Years.toFixed(0) + '%', BLU],
    ['CO2 Saved / Year',    (roi.co2SavedKgPerYear / 1000).toFixed(2) + ' tonnes'],
  ];
  y = kvGrid(doc, finItems, y);

  // Projection table
  y = guard(doc, y, 14);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); ink(doc, MID);
  doc.text('10-Year Savings Projection', ML, y + 5);
  y += 9;

  const pbYear = roi.yearlyProjection.find(r => r.netPosition >= 0)?.year;
  const projRows: Cell[][] = roi.yearlyProjection.slice(0, 10).map(r => {
    const isBreak = r.year === pbYear;
    return [
      { t: 'Year ' + r.year, c: DARK },
      { t: 'PHP ' + Math.round(r.cumulativeSavings).toLocaleString('en-PH'), c: DARK },
      { t: (r.netPosition >= 0 ? '+' : '') + 'PHP ' + Math.round(r.netPosition).toLocaleString('en-PH'), c: r.netPosition >= 0 ? GRN : RED, b: true },
      { t: isBreak ? 'BREAKEVEN' : r.netPosition >= 0 ? 'Profitable' : 'In recovery', c: isBreak ? AMBER : r.netPosition >= 0 ? GRN : MUTED, b: isBreak },
    ];
  });
  y = drawTable(doc,
    ['Year', 'Cumulative Savings', 'Net Position', 'Status'],
    projRows,
    [22, 68, 62, 30],
    y
  );

  // ── NOTES & DISCLAIMERS ──────────────────────────────────────
  y = guard(doc, y, 55);
  y = divLine(doc, y);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); ink(doc, MID);
  doc.text('Notes & Disclaimers', ML, y + 1);
  y += 8;
  const disclaimers = [
    'All calculations are based on provided load data and standard solar irradiance values.',
    'Panel output assumes 20% system losses (wiring, inverter, temperature derating, soiling).',
    'Battery sizing includes selected depth-of-discharge (DoD) and round-trip efficiency factor.',
    'Wire sizing follows NEC guidelines with voltage drop within 3% DC and 2% for critical runs.',
    'Actual system costs, component availability and pricing may vary. For design guidance only.',
    'Location: ' + (loc?.name ?? '') + '  |  Generated by SolarX on ' + date,
  ];
  disclaimers.forEach(d => {
    y = guard(doc, y, 7);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); ink(doc, MUTED);
    doc.text('- ' + d, ML, y);
    y += 6;
  });

  addFooters(doc, project.name);

  doc.save(project.name.replace(/\s+/g,'_') + '_SolarX_Quotation_' + ref + '.pdf');
}
