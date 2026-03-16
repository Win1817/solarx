import { useSolarStore } from '../store/solarStore';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { exportToPDF } from '../utils/exportPDF';
import irradianceData from '../data/irradiance.json';
import batteriesData from '../data/batteries.json';

export default function Results() {
  const { results, project } = useSolarStore();
  const { load, panels, batteries, inverter, wiring, roi } = results;

  if (!load || !panels || !batteries || !inverter || !wiring || !roi) {
    return (
      <div style={{ textAlign:'center', padding:'80px 20px' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>☀️</div>
        <div style={{ fontSize:17, color:'var(--text2)', marginBottom:8 }}>No results yet</div>
        <div style={{ fontSize:13, color:'var(--text3)' }}>
          Complete the Load Profiler and System Config,<br />then tap Calculate System.
        </div>
      </div>
    );
  }

  const location = irradianceData.find(l => l.id === project.locationId);
  const chemistry = batteriesData.find(b => b.id === project.batteryChemistryId);
  const paybackYear = roi.yearlyProjection.find(y => y.netPosition >= 0)?.year ?? null;

  const handleExport = () => {
    exportToPDF(project, load, panels, batteries, inverter, wiring, roi,
      location?.name ?? project.locationId,
      chemistry?.name ?? project.batteryChemistryId
    );
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">System Results</div>
          <div className="section-sub">{location?.name} · {project.systemType.toUpperCase()} {project.systemVoltage}V</div>
        </div>
        <button className="btn btn-primary" onClick={handleExport}>
          ↓ Export PDF
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid-4" style={{ marginBottom:16 }}>
        <div className="stat-card highlight">
          <div className="stat-label">Daily Load</div>
          <div className="stat-value">{load.dailyKwh.toFixed(2)}<span className="stat-unit">kWh</span></div>
          <div className="stat-sub">{load.totalWatts.toFixed(0)}W total</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Solar Array</div>
          <div className="stat-value">{panels.numberOfPanels}<span className="stat-unit">panels</span></div>
          <div className="stat-sub">{panels.totalKwp.toFixed(2)} kWp</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Battery Bank</div>
          <div className="stat-value">{batteries.numberOfBatteries}<span className="stat-unit">units</span></div>
          <div className="stat-sub">{batteries.totalCapacityKwh.toFixed(1)} kWh</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Inverter</div>
          <div className="stat-value">{inverter.inverter.recommendedInverterKva.toFixed(1)}<span className="stat-unit">kVA</span></div>
          <div className="stat-sub">{project.systemType}</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Panels */}
        <div className="card">
          <div className="card-header"><div className="card-title"><span className="card-title-dot"/>Solar Panel Sizing</div></div>
          <div className="table-wrap">
            <table className="data-table" style={{ minWidth: 0 }}>
              <tbody>
                {[
                  ['Required',`${panels.requiredKwp.toFixed(2)} kWp`,true],
                  ['Panel wattage',`${project.panelWattage} W`],
                  ['Qty',String(panels.numberOfPanels),true],
                  ['Config',`${panels.panelsInSeries}S × ${panels.stringsInParallel}P`],
                  ['Total',`${panels.totalKwp.toFixed(2)} kWp`],
                  ['Est. generation',`${panels.dailyGenerationKwh.toFixed(2)} kWh/day`],
                  ['Peak sun hrs',`${location?.peakSunHours} hrs`],
                ].map(([k,v,hi])=>(
                  <tr key={k as string}><td>{k}</td>
                  <td style={{fontFamily:'var(--mono)',color:hi?'var(--sun)':'var(--text)',fontWeight:hi?600:400,textAlign:'right'}}>{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Batteries */}
        <div className="card">
          <div className="card-header"><div className="card-title"><span className="card-title-dot"/>Battery Bank</div></div>
          <div className="table-wrap">
            <table className="data-table" style={{ minWidth: 0 }}>
              <tbody>
                {[
                  ['Chemistry', chemistry?.name ?? '-'],
                  ['Required',`${batteries.requiredAh.toFixed(0)} Ah`,true],
                  ['Size',`${project.batteryAh}Ah @ ${project.systemVoltage}V`],
                  ['Config',`${batteries.batteriesInSeries}S × ${batteries.batteriesInParallel}P`],
                  ['Total units',String(batteries.numberOfBatteries),true],
                  ['Total',`${batteries.totalCapacityKwh.toFixed(1)} kWh`],
                  ['Usable',`${batteries.usableKwh.toFixed(1)} kWh`],
                  ['Autonomy',`${project.autonomyDays} day(s)`],
                ].map(([k,v,hi])=>(
                  <tr key={k as string}><td>{k}</td>
                  <td style={{fontFamily:'var(--mono)',color:hi?'var(--sun)':'var(--text)',fontWeight:hi?600:400,textAlign:'right'}}>{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inverter */}
        <div className="card">
          <div className="card-header"><div className="card-title"><span className="card-title-dot"/>Inverter & MPPT</div></div>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:10,color:'var(--text3)',fontFamily:'var(--mono)',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:4 }}>Inverter</div>
            <div style={{ fontSize:20,fontWeight:600,color:'var(--text)',marginBottom:3 }}>{inverter.inverter.recommendedInverterKva.toFixed(1)} kVA</div>
            <div style={{ fontSize:12,color:'var(--text2)',marginBottom:8 }}>{inverter.inverter.inverterType}</div>
            {inverter.inverter.notes.map((n,i)=><div key={i} className="note" style={{marginBottom:5,fontSize:11}}>• {n}</div>)}
          </div>
          <hr className="divider"/>
          <div>
            <div style={{ fontSize:10,color:'var(--text3)',fontFamily:'var(--mono)',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:4 }}>MPPT Charge Controller</div>
            <div style={{ fontSize:20,fontWeight:600,color:'var(--text)',marginBottom:3 }}>{inverter.mppt.recommendedMpptAmps} A</div>
            <div style={{ fontSize:12,color:'var(--text2)',marginBottom:8 }}>Voc: {inverter.mppt.openCircuitVoltageVoc}V · Isc: {inverter.mppt.shortCircuitCurrentIsc.toFixed(1)}A</div>
            {inverter.mppt.notes.map((n,i)=><div key={i} className="note" style={{marginBottom:5,fontSize:11}}>• {n}</div>)}
          </div>
        </div>

        {/* Wiring */}
        <div className="card">
          <div className="card-header"><div className="card-title"><span className="card-title-dot"/>Wire Sizing & Protection</div></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Segment</th><th>A</th><th>AWG</th><th>mm²</th><th>Drop</th><th>Fuse</th><th>OK</th></tr></thead>
              <tbody>
                {wiring.segments.map(s=>(
                  <tr key={s.segment.id}>
                    <td style={{color:'var(--text)',maxWidth:80,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.segment.name}</td>
                    <td style={{fontFamily:'var(--mono)'}}>{s.segment.currentAmps.toFixed(1)}</td>
                    <td style={{fontFamily:'var(--mono)',color:'var(--sun)'}}>#{s.recommendedAwg}</td>
                    <td style={{fontFamily:'var(--mono)'}}>{s.recommendedMm2}</td>
                    <td style={{fontFamily:'var(--mono)'}}>{s.voltageDropPercent.toFixed(1)}%</td>
                    <td style={{fontFamily:'var(--mono)'}}>{s.fuseRating}A</td>
                    <td><span className={`tag ${s.withinSpec?'tag-ok':'tag-err'}`}>{s.withinSpec?'✓':'!'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ROI Chart */}
      <div className="card">
        <div className="card-header" style={{ flexWrap:'wrap', gap:12 }}>
          <div className="card-title"><span className="card-title-dot"/>ROI & Payback Analysis</div>
          <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
            {[
              { label:'Annual Savings', val:`₱${roi.annualSavingsPhp.toLocaleString('en-PH',{maximumFractionDigits:0})}`, color:'var(--green)' },
              { label:'Payback', val:`${roi.paybackYears.toFixed(1)} yrs`, color:'var(--sun)' },
              { label:'25-yr ROI', val:`${roi.roi25Years.toFixed(0)}%`, color:'var(--blue)' },
              { label:'CO₂/yr', val:`${(roi.co2SavedKgPerYear/1000).toFixed(1)}t`, color:'var(--teal)' },
            ].map(m=>(
              <div key={m.label} style={{ textAlign:'right' }}>
                <div style={{ fontSize:10,color:'var(--text3)',fontFamily:'var(--mono)',textTransform:'uppercase' }}>{m.label}</div>
                <div style={{ fontSize:16,fontWeight:600,color:m.color }}>{m.val}</div>
              </div>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={roi.yearlyProjection} margin={{ top:8,right:8,bottom:0,left:10 }}>
            <defs>
              <linearGradient id="roiGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F5A623" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#F5A623" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="year" tick={{ fill:'#4a5470',fontSize:10,fontFamily:'monospace' }}/>
            <YAxis tick={{ fill:'#4a5470',fontSize:10,fontFamily:'monospace' }} tickFormatter={v=>`₱${(Number(v)/1000).toFixed(0)}k`} width={52}/>
            <Tooltip contentStyle={{ background:'#13171d',border:'1px solid #2a3040',borderRadius:8,fontFamily:'monospace',fontSize:11 }}
              formatter={(v)=>[`₱${Number(v).toLocaleString('en-PH',{maximumFractionDigits:0})}`,'Net Position']}
              labelFormatter={l=>`Year ${l}`}/>
            <ReferenceLine y={0} stroke="#3a4560" strokeDasharray="4 4"/>
            {paybackYear && <ReferenceLine x={paybackYear} stroke="#F5A623" strokeDasharray="4 4" label={{ value:`Y${paybackYear}`,position:'top',fill:'#F5A623',fontSize:10 }}/>}
            <Area type="monotone" dataKey="netPosition" stroke="#F5A623" strokeWidth={2} fill="url(#roiGrad)" dot={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* BOM */}
      <div className="card">
        <div className="card-header">
          <div className="card-title"><span className="card-title-dot"/>Bill of Materials</div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>#</th><th>Component</th><th>Specification</th><th>Qty</th></tr></thead>
            <tbody>
              {[
                ['01','Solar Panel',`${project.panelWattage}W Monocrystalline`,String(panels.numberOfPanels)],
                ['02','Battery',`${project.batteryAh}Ah ${project.systemVoltage}V ${chemistry?.id.toUpperCase()}`,String(batteries.numberOfBatteries)],
                ['03','Inverter/Charger',`${inverter.inverter.recommendedInverterKva.toFixed(1)}kVA ${inverter.inverter.inverterType}`,'1'],
                ['04','MPPT Controller',`${inverter.mppt.recommendedMpptAmps}A ${project.systemVoltage}V`,'1'],
                ...wiring.segments.map((s,i)=>[`0${5+i}`,`Cable — ${s.segment.name}`,`AWG#${s.recommendedAwg} (${s.recommendedMm2}mm²)`,`${s.segment.lengthMeters}m`]),
                ['-','Panel Mounting','Aluminum rail + L-bracket','1 set'],
                ['-','MC4 Connectors','Male + Female pairs',`${panels.numberOfPanels*2} pairs`],
                ['-','SPD (Surge Protection)','DC + AC side','1 set'],
              ].map(([num,comp,spec,qty])=>(
                <tr key={comp}>
                  <td style={{fontFamily:'var(--mono)',color:'var(--text3)',fontSize:11}}>{num}</td>
                  <td style={{color:'var(--text)',fontWeight:500}}>{comp}</td>
                  <td style={{fontFamily:'var(--mono)',fontSize:11}}>{spec}</td>
                  <td style={{fontFamily:'var(--mono)',color:'var(--sun)',fontWeight:600}}>{qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop:14, display:'flex', justifyContent:'flex-end' }}>
          <button className="btn btn-primary" onClick={handleExport}>↓ Download Full PDF Report</button>
        </div>
      </div>
    </div>
  );
}
