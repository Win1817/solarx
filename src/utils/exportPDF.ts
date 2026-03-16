import jsPDF from 'jspdf';
import type { SolarResults, ProjectConfig } from '../store/solarStore';
import irradianceData from '../data/irradiance.json';
import batteriesData from '../data/batteries.json';

// ── Color palette (all RGB tuples) ───────────────────────────
type RGB = [number,number,number];
const W:     RGB = [255,255,255];
const BLK:   RGB = [18, 22, 32];
const DARK:  RGB = [38, 46, 60];
const MID:   RGB = [88, 98,118];
const MUTED: RGB = [148,158,172];
const LITE:  RGB = [218,224,234];
const BORD:  RGB = [208,214,224];
const ROW:   RGB = [247,248,252];
const HDR:   RGB = [26, 36, 56];
const AMBER: RGB = [180,105,  8];
const AMB_B: RGB = [254,247,224];
const GRN:   RGB = [16, 118, 62];
const GRN_B: RGB = [226,247,234];
const BLU:   RGB = [22,  88,182];
const BLU_B: RGB = [226,238,254];
const RED:   RGB = [172, 28, 28];

const PW=210, PH=297, ML=14, CW=182;

// ── Helpers ───────────────────────────────────────────────────
const F = (doc:jsPDF,c:RGB) => doc.setFillColor(c[0],c[1],c[2]);
const S = (doc:jsPDF,c:RGB) => doc.setDrawColor(c[0],c[1],c[2]);
const T = (doc:jsPDF,c:RGB) => doc.setTextColor(c[0],c[1],c[2]);

// Strip any non-latin1 characters so helvetica never garbles
const safe = (s:string) => s.replace(/[^\x00-\xFF]/g, '-');

function guard(doc:jsPDF, y:number, need=22):number {
  if (y+need > PH-16) {
    doc.addPage();
    F(doc,W); doc.rect(0,0,PW,PH,'F');
    return 18;
  }
  return y;
}

function sectionHead(doc:jsPDF, title:string, y:number):number {
  y = guard(doc,y,14);
  F(doc,HDR); doc.rect(ML,y,CW,9,'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(8.5); T(doc,W);
  doc.text(title, ML+4, y+6.2);
  return y+13;
}

function hRule(doc:jsPDF, y:number):number {
  S(doc,BORD); doc.setLineWidth(0.25);
  doc.line(ML,y,ML+CW,y);
  return y+5;
}

// ── Two-column KV grid ────────────────────────────────────────
function kvGrid(doc:jsPDF, rows:[string,string,RGB?][], y:number):number {
  const half = Math.ceil(rows.length/2);
  for (let i=0; i<half; i++) {
    y = guard(doc,y,8);
    if (i%2===0){ F(doc,ROW); doc.rect(ML,y,CW,7.5,'F'); }

    const [ll,lv,lc] = rows[i];
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); T(doc,MUTED);
    doc.text(safe(ll), ML+4, y+5.3);
    doc.setFont('helvetica','bold'); T(doc, lc??DARK);
    doc.text(safe(lv), ML+50, y+5.3);

    const right = rows[i+half];
    if (right) {
      const [rl,rv,rc] = right;
      const rx = ML+CW/2+4;
      doc.setFont('helvetica','normal'); T(doc,MUTED);
      doc.text(safe(rl), rx, y+5.3);
      doc.setFont('helvetica','bold'); T(doc, rc??DARK);
      doc.text(safe(rv), rx+46, y+5.3);
    }
    y+=7.5;
  }
  return y+4;
}

// ── Generic table ─────────────────────────────────────────────
type Cell = string | {t:string; c?:RGB; b?:boolean};
function cv(v:Cell):{t:string;c:RGB;b:boolean} {
  if (typeof v==='string') return {t:v, c:DARK, b:false};
  return {t:v.t, c:v.c??DARK, b:v.b??false};
}

function drawTable(doc:jsPDF, headers:string[], rows:Cell[][], colW:number[], y:number):number {
  y = guard(doc,y,12);
  // Header row
  F(doc,DARK); doc.rect(ML,y,CW,8.5,'F');
  let x=ML;
  headers.forEach((h,i)=>{
    doc.setFont('helvetica','bold'); doc.setFontSize(7.5); T(doc,LITE);
    doc.text(h, x+2, y+5.8);
    x+=colW[i];
  });
  y+=8.5;

  rows.forEach((row,ri)=>{
    const rh=8;
    y=guard(doc,y,rh+2);
    if (ri%2===0){ F(doc,ROW); doc.rect(ML,y,CW,rh,'F'); }
    S(doc,BORD); doc.setLineWidth(0.15);
    doc.line(ML,y+rh,ML+CW,y+rh);
    x=ML;
    row.forEach((v,ci)=>{
      const {t,c,b}=cv(v);
      doc.setFont('helvetica',b?'bold':'normal');
      doc.setFontSize(8); T(doc,c);
      const maxW = colW[ci]-4;
      const safeT = safe(t);
      const fits = doc.getTextWidth(safeT)<=maxW;
      const clipped = fits ? safeT : doc.splitTextToSize(safeT,maxW)[0]+'..';
      doc.text(clipped, x+2, y+5.5);
      x+=colW[ci];
    });
    y+=rh;
  });
  return y+5;
}

// ── Stat card ─────────────────────────────────────────────────
function statCard(doc:jsPDF, label:string, value:string, sub:string, accent:RGB, x:number, y:number, w:number) {
  F(doc,ROW); S(doc,BORD); doc.setLineWidth(0.3);
  doc.roundedRect(x,y,w-2,26,2,2,'FD');
  // accent top strip
  F(doc,accent); doc.rect(x,y,w-2,3,'F');
  doc.setFont('helvetica','normal'); doc.setFontSize(7); T(doc,MUTED);
  doc.text(label, x+4, y+10);
  doc.setFont('helvetica','bold'); doc.setFontSize(16); T(doc,accent);
  doc.text(safe(value), x+4, y+20);
  doc.setFont('helvetica','normal'); doc.setFontSize(7); T(doc,MUTED);
  doc.text(safe(sub), x+4, y+25);
}

// ── Badge ──────────────────────────────────────────────────────
function badge(doc:jsPDF, text:string, x:number, y:number, bg:RGB, fg:RGB):number {
  const w = doc.getTextWidth(safe(text))+8;
  F(doc,bg); S(doc,fg); doc.setLineWidth(0.3);
  doc.roundedRect(x,y-4.5,w,6.5,1.5,1.5,'FD');
  doc.setFont('helvetica','bold'); doc.setFontSize(7); T(doc,fg);
  doc.text(safe(text), x+4, y+0.3);
  return x+w+4;
}

// ── Footers ───────────────────────────────────────────────────
function addFooters(doc:jsPDF, name:string) {
  const n=(doc as any).internal.getNumberOfPages();
  for (let p=1;p<=n;p++) {
    doc.setPage(p);
    S(doc,BORD); doc.setLineWidth(0.3);
    doc.line(ML,PH-12,ML+CW,PH-12);
    doc.setFont('helvetica','normal'); doc.setFontSize(7); T(doc,MUTED);
    doc.text('SolarX  |  Solar Electrical Install Companion  |  '+safe(name), ML, PH-6.5);
    doc.text('Page '+p+' of '+n, ML+CW, PH-6.5, {align:'right'});
  }
}

// ══════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ══════════════════════════════════════════════════════════════
export function exportPDF(project:ProjectConfig, results:SolarResults) {
  const {load,panels,batteries,inverter,wiring,roi}=results;
  if (!load||!panels||!batteries||!inverter||!wiring||!roi) return;

  const doc = new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  F(doc,W); doc.rect(0,0,PW,PH,'F');

  const loc  = irradianceData.find(l=>l.id===project.locationId);
  const chem = batteriesData.find(b=>b.id===project.batteryChemistryId);
  const dod  = (chem?.maxDoD??0.8)*100;
  const now  = new Date();
  const date = now.toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'});
  const ref  = 'SX-'+now.getFullYear()+String(now.getMonth()+1).padStart(2,'0')+String(now.getDate()).padStart(2,'0')+'-'+(Math.floor(Math.random()*9000)+1000);

  let y=0;

  // ── HEADER ───────────────────────────────────────────────────
  F(doc,HDR); doc.rect(0,0,PW,42,'F');
  // Sun icon
  F(doc,AMBER); doc.circle(ML+10,21,7,'F');
  S(doc,W); doc.setLineWidth(1.5);
  const cx=ML+10, cy=21;
  [[cx,cy-10,cx,cy-14],[cx,cy+10,cx,cy+14],[cx-10,cy,cx-14,cy],[cx+10,cy,cx+14,cy]].forEach(([x1,y1,x2,y2])=>doc.line(x1,y1,x2,y2));
  doc.setLineWidth(0.9);
  [[cx-7.5,cy-7.5,cx-5,cy-5],[cx+7.5,cy+7.5,cx+5,cy+5],[cx+7.5,cy-7.5,cx+5,cy-5],[cx-7.5,cy+7.5,cx-5,cy+5]].forEach(([x1,y1,x2,y2])=>doc.line(x1,y1,x2,y2));

  doc.setFont('helvetica','bold'); doc.setFontSize(22); T(doc,W);
  doc.text('SolarX', ML+24, 18);
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5); T(doc,LITE);
  doc.text('Solar Electrical Install Companion', ML+24, 25);

  doc.setFont('helvetica','bold'); doc.setFontSize(13); T(doc,AMBER);
  doc.text('SYSTEM QUOTATION', ML+CW, 15, {align:'right'});
  doc.setFont('helvetica','normal'); doc.setFontSize(8); T(doc,LITE);
  doc.text('Ref: '+ref, ML+CW, 22, {align:'right'});
  doc.text('Date: '+date, ML+CW, 29, {align:'right'});

  y=50;

  // ── PROJECT BOX ──────────────────────────────────────────────
  S(doc,BORD); doc.setLineWidth(0.4);
  doc.roundedRect(ML,y,CW,32,2,2,'S');

  doc.setFont('helvetica','bold'); doc.setFontSize(14); T(doc,BLK);
  doc.text(safe(project.name), ML+6, y+10);

  const typeColors: Record<string,{bg:RGB,fg:RGB}> = {
    offgrid:{bg:GRN_B,fg:GRN}, ongrid:{bg:BLU_B,fg:BLU}, hybrid:{bg:AMB_B,fg:AMBER}
  };
  const tc = typeColors[project.systemType]??{bg:AMB_B,fg:AMBER};
  let bx = ML+6;
  bx = badge(doc, project.systemType.toUpperCase()+' SYSTEM', bx, y+20, tc.bg, tc.fg);
  bx = badge(doc, project.systemVoltage+'V', bx, y+20, BLU_B, BLU);

  doc.setFont('helvetica','normal'); doc.setFontSize(8.5); T(doc,MUTED);
  doc.text('Location: '+(loc?.name??project.locationId)+'     Peak Sun Hours: '+(loc?.peakSunHours??'-')+' hrs/day', ML+6, y+28);
  y+=38;

  // ── STAT CARDS ───────────────────────────────────────────────
  const cw4=CW/4;
  statCard(doc,'DAILY LOAD',     load.dailyKwh.toFixed(2),    'kWh/day',                             AMBER, ML+cw4*0, y, cw4);
  statCard(doc,'SOLAR ARRAY',    String(panels.numberOfPanels), panels.totalKwp.toFixed(2)+' kWp',   BLU,   ML+cw4*1, y, cw4);
  statCard(doc,'BATTERY BANK',   String(batteries.numberOfBatteries), batteries.totalCapacityKwh.toFixed(1)+' kWh', GRN, ML+cw4*2, y, cw4);
  statCard(doc,'INVERTER',       inverter.inverter.recommendedInverterKva.toFixed(1), 'kVA',          DARK,  ML+cw4*3, y, cw4);
  y+=32;

  // ── 01 SOLAR PANELS ──────────────────────────────────────────
  y=sectionHead(doc,'01   SOLAR PANEL SYSTEM',y);
  y=kvGrid(doc,[
    ['Required Capacity',    panels.requiredKwp.toFixed(2)+' kWp'],
    ['Number of Panels',     panels.numberOfPanels+' panels',         BLU],
    ['Panel Wattage',        project.panelWattage+' W each'],
    ['Array Configuration',  panels.panelsInSeries+'S x '+panels.stringsInParallel+'P'],
    ['Total Array Size',     panels.totalKwp.toFixed(2)+' kWp'],
    ['Est. Daily Generation',panels.dailyGenerationKwh.toFixed(2)+' kWh/day', GRN],
    ['Peak Sun Hours',       (loc?.peakSunHours??'-')+' hrs/day'],
    ['System Loss Factor',   '20%'],
  ],y);

  // ── 02 BATTERY BANK ──────────────────────────────────────────
  y=guard(doc,y,70);
  y=sectionHead(doc,'02   BATTERY BANK',y);
  y=kvGrid(doc,[
    ['Chemistry',            chem?.name??project.batteryChemistryId],
    ['Battery Size',         project.batteryAh+' Ah @ '+project.systemVoltage+'V'],
    ['Configuration',        batteries.batteriesInSeries+'S x '+batteries.batteriesInParallel+'P'],
    ['Total Units',          batteries.numberOfBatteries+' batteries',  BLU],
    ['Total Capacity',       batteries.totalCapacityKwh.toFixed(1)+' kWh'],
    ['Usable Capacity',      batteries.usableKwh.toFixed(1)+' kWh',     GRN],
    ['Depth of Discharge',   dod.toFixed(0)+'%'],
    ['Autonomy',             project.autonomyDays+' day(s)'],
  ],y);

  // ── 03 INVERTER & MPPT ───────────────────────────────────────
  y=guard(doc,y,60);
  y=sectionHead(doc,'03   INVERTER & CHARGE CONTROLLER',y);
  y=kvGrid(doc,[
    ['Inverter Rating',      inverter.inverter.recommendedInverterKva.toFixed(1)+' kVA', BLU],
    ['Inverter Type',        inverter.inverter.inverterType],
    ['MPPT Rating',          inverter.mppt.recommendedMpptAmps+' A'],
    ['Array Voc',            inverter.mppt.openCircuitVoltageVoc+' V'],
    ['Array Isc',            inverter.mppt.shortCircuitCurrentIsc.toFixed(1)+' A'],
    ['System Voltage',       project.systemVoltage+' VDC'],
  ],y);

  // Notes — guard so they stay on same page as section
  const allNotes=[...inverter.inverter.notes,...inverter.mppt.notes].filter(Boolean);
  if (allNotes.length>0) {
    const boxH=allNotes.length*7+8;
    y=guard(doc,y,boxH+4);
    F(doc,AMB_B); S(doc,AMBER); doc.setLineWidth(0.3);
    doc.roundedRect(ML,y,CW,boxH,1.5,1.5,'FD');
    allNotes.forEach((n,i)=>{
      doc.setFont('helvetica','normal'); doc.setFontSize(7.5); T(doc,AMBER);
      doc.text('NOTE: '+safe(n), ML+4, y+7+i*7);
    });
    y+=boxH+6;
  }

  // ── 04 WIRE SIZING ───────────────────────────────────────────
  y=guard(doc,y,60);
  y=sectionHead(doc,'04   WIRE SIZING & PROTECTION',y);
  const wireRows:Cell[][]=wiring.segments.map(s=>[
    {t:safe(s.segment.name),                           c:DARK,  b:false},
    {t:s.segment.currentAmps.toFixed(1)+' A',          c:DARK},
    {t:'#'+s.recommendedAwg,                           c:BLU,   b:true},
    {t:s.recommendedMm2+' mm2',                        c:DARK},
    {t:s.voltageDropPercent.toFixed(2)+'%',            c:s.withinSpec?GRN:RED},
    {t:s.fuseRating+' A',                              c:DARK},
    {t:s.withinSpec?'OK':'OVER',                       c:s.withinSpec?GRN:RED, b:true},
  ]);
  y=drawTable(doc,
    ['Segment','Current','AWG','Size','V-Drop','Fuse','Status'],
    wireRows,
    [54,22,16,20,20,18,18],y
  );

  // ── 05 BILL OF MATERIALS ─────────────────────────────────────
  y=guard(doc,y,90);
  y=sectionHead(doc,'05   BILL OF MATERIALS',y);
  const bomRows:Cell[][]=[
    [{t:'01',c:MUTED},{t:'Solar Panel',         c:DARK,b:true},{t:project.panelWattage+'W Monocrystalline PERC',                          c:MID},{t:panels.numberOfPanels+' pcs',         c:BLU,b:true}],
    [{t:'02',c:MUTED},{t:'Battery',             c:DARK,b:true},{t:project.batteryAh+'Ah '+project.systemVoltage+'V '+(chem?.id??'').toUpperCase(), c:MID},{t:batteries.numberOfBatteries+' pcs', c:BLU,b:true}],
    [{t:'03',c:MUTED},{t:'Inverter / Charger',  c:DARK,b:true},{t:inverter.inverter.recommendedInverterKva.toFixed(1)+'kVA '+project.systemType, c:MID},{t:'1 pc',                             c:BLU,b:true}],
    [{t:'04',c:MUTED},{t:'MPPT Controller',     c:DARK,b:true},{t:inverter.mppt.recommendedMpptAmps+'A '+project.systemVoltage+'VDC',     c:MID},{t:'1 pc',                             c:BLU,b:true}],
    ...wiring.segments.map((s,i):Cell[]=>[
      {t:'0'+(5+i),c:MUTED},
      {t:'DC Cable - '+safe(s.segment.name),  c:DARK,b:true},
      {t:'AWG #'+s.recommendedAwg+' ('+s.recommendedMm2+' mm2)  '+s.segment.lengthMeters+'m run', c:MID},
      {t:s.segment.lengthMeters+' m',         c:BLU,b:true},
    ]),
    [{t:'--',c:MUTED},{t:'Panel Mounting',      c:DARK,b:true},{t:'Aluminum rail + L-bracket, galvanized',                                c:MID},{t:'1 set',                             c:BLU,b:true}],
    [{t:'--',c:MUTED},{t:'MC4 Connectors',      c:DARK,b:true},{t:'UV-resistant male + female pairs',                                     c:MID},{t:panels.numberOfPanels*2+' pairs',    c:BLU,b:true}],
    [{t:'--',c:MUTED},{t:'DC Circuit Breaker',  c:DARK,b:true},{t:'String protection, rated 1.25x Isc',                                   c:MID},{t:panels.stringsInParallel+' pcs',     c:BLU,b:true}],
    [{t:'--',c:MUTED},{t:'AC Circuit Breaker',  c:DARK,b:true},{t:'Main output panel protection',                                          c:MID},{t:'1 pc',                             c:BLU,b:true}],
    [{t:'--',c:MUTED},{t:'Battery Fuse / BMS',  c:DARK,b:true},{t:'Per battery bank, sized to bank current',                               c:MID},{t:'1 set',                             c:BLU,b:true}],
  ];
  y=drawTable(doc,
    ['#','Component','Specification','Qty'],
    bomRows,
    [12,50,100,20],y
  );

  // ── 06 FINANCIAL ANALYSIS ────────────────────────────────────
  y=guard(doc,y,90);
  y=sectionHead(doc,'06   FINANCIAL ANALYSIS & ROI',y);
  y=kvGrid(doc,[
    ['Total System Cost',  'PHP '+project.totalSystemCostPhp.toLocaleString('en-PH'), DARK],
    ['Electricity Rate',   'PHP '+project.electricityRatePhp+' / kWh'],
    ['Annual Savings',     'PHP '+roi.annualSavingsPhp.toLocaleString('en-PH',{maximumFractionDigits:0}), GRN],
    ['Payback Period',     roi.paybackYears.toFixed(1)+' years',   AMBER],
    ['25-Year ROI',        roi.roi25Years.toFixed(0)+'%',          BLU],
    ['CO2 Saved / Year',   (roi.co2SavedKgPerYear/1000).toFixed(2)+' tonnes'],
  ],y);

  // Projection table
  y=guard(doc,y,16);
  doc.setFont('helvetica','bold'); doc.setFontSize(8.5); T(doc,MID);
  doc.text('10-Year Savings Projection', ML, y+5);
  y+=10;

  const pbYear=roi.yearlyProjection.find(r=>r.netPosition>=0)?.year;
  const projRows:Cell[][]=roi.yearlyProjection.slice(0,10).map(r=>{
    const isBreak=r.year===pbYear;
    return [
      {t:'Year '+r.year,                                                      c:DARK},
      {t:'PHP '+Math.round(r.cumulativeSavings).toLocaleString('en-PH'),      c:DARK},
      {t:(r.netPosition>=0?'+':'')+'PHP '+Math.round(Math.abs(r.netPosition)).toLocaleString('en-PH'), c:r.netPosition>=0?GRN:RED, b:true},
      {t:isBreak?'BREAKEVEN':r.netPosition>=0?'Profitable':'In recovery',     c:isBreak?AMBER:r.netPosition>=0?GRN:MUTED, b:isBreak},
    ];
  });
  y=drawTable(doc,
    ['Year','Cumulative Savings','Net Position','Status'],
    projRows,
    [22,66,62,32],y
  );

  // ── NOTES & DISCLAIMERS ──────────────────────────────────────
  y=guard(doc,y,58);
  y=hRule(doc,y);
  doc.setFont('helvetica','bold'); doc.setFontSize(8.5); T(doc,MID);
  doc.text('Notes & Disclaimers', ML, y+1);
  y+=8;
  [
    'All calculations are based on provided load data and standard solar irradiance values.',
    'Panel output assumes 20% system losses (wiring, inverter, temperature derating, soiling).',
    'Battery sizing includes selected depth-of-discharge (DoD) and round-trip efficiency factor.',
    'Wire sizing follows NEC guidelines with max 3% DC voltage drop, 2% for critical runs.',
    'Actual costs and component availability may vary. This document is for design guidance only.',
    'Location: '+(loc?.name??'')+'  |  Generated by SolarX on '+date,
  ].forEach(d=>{
    y=guard(doc,y,7);
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); T(doc,MUTED);
    doc.text('- '+safe(d), ML, y);
    y+=6;
  });

  addFooters(doc,project.name);
  doc.save(safe(project.name).replace(/\s+/g,'_')+'_SolarX_Quotation_'+ref+'.pdf');
}
