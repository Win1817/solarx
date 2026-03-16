import { useSolarStore } from '../store/solarStore';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import irradianceData from '../data/irradiance.json';
import batteriesData from '../data/batteries.json';

export default function Results() {
  const { results, project } = useSolarStore();
  const { load, panels, batteries, inverter, wiring, roi } = results;

  if (!load || !panels || !batteries || !inverter || !wiring || !roi) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>☀️</div>
        <div style={{ fontSize: 18, color: 'var(--text2)', marginBottom: 8 }}>No results yet</div>
        <div style={{ fontSize: 13, color: 'var(--text3)' }}>Complete the Load Profiler and System Config, then click Calculate System.</div>
      </div>
    );
  }

  const location = irradianceData.find(l => l.id === project.locationId);
  const chemistry = batteriesData.find(b => b.id === project.batteryChemistryId);
  const paybackYear = roi.yearlyProjection.find(y => y.netPosition >= 0)?.year ?? null;

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">System Results</div>
          <div className="section-sub">{project.name} · {location?.name} · {project.systemType.toUpperCase()} {project.systemVoltage}V</div>
        </div>
      </div>

      {/* System Summary */}
      <div className="grid-4" style={{ marginBottom: 16 }}>
        <div className="stat-card highlight">
          <div className="stat-label">Daily Load</div>
          <div className="stat-value">{load.dailyKwh.toFixed(2)}<span className="stat-unit">kWh</span></div>
          <div className="stat-sub">{load.totalWatts.toFixed(0)}W total</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Solar Array</div>
          <div className="stat-value">{panels.numberOfPanels}<span className="stat-unit">panels</span></div>
          <div className="stat-sub">{panels.totalKwp.toFixed(2)} kWp total</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Battery Bank</div>
          <div className="stat-value">{batteries.numberOfBatteries}<span className="stat-unit">units</span></div>
          <div className="stat-sub">{batteries.totalCapacityKwh.toFixed(1)} kWh total</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Inverter Size</div>
          <div className="stat-value">{inverter.inverter.recommendedInverterKva.toFixed(1)}<span className="stat-unit">kVA</span></div>
          <div className="stat-sub">{project.systemType} type</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Panel Details */}
        <div className="card">
          <div className="card-header"><div className="card-title"><span className="card-title-dot" />Solar Panel Sizing</div></div>
          <table className="data-table">
            <tbody>
              <tr><td>Required capacity</td><td style={{ color: 'var(--sun)', fontFamily: 'var(--mono)' }}>{panels.requiredKwp.toFixed(2)} kWp</td></tr>
              <tr><td>Panel wattage</td><td style={{ fontFamily: 'var(--mono)' }}>{project.panelWattage} W</td></tr>
              <tr><td>Number of panels</td><td style={{ color: 'var(--text)', fontFamily: 'var(--mono)', fontWeight: 600 }}>{panels.numberOfPanels}</td></tr>
              <tr><td>Panels in series</td><td style={{ fontFamily: 'var(--mono)' }}>{panels.panelsInSeries}</td></tr>
              <tr><td>Strings in parallel</td><td style={{ fontFamily: 'var(--mono)' }}>{panels.stringsInParallel}</td></tr>
              <tr><td>Total array size</td><td style={{ fontFamily: 'var(--mono)' }}>{panels.totalKwp.toFixed(2)} kWp</td></tr>
              <tr><td>Est. daily generation</td><td style={{ color: 'var(--green)', fontFamily: 'var(--mono)' }}>{panels.dailyGenerationKwh.toFixed(2)} kWh</td></tr>
              <tr><td>Peak sun hours</td><td style={{ fontFamily: 'var(--mono)' }}>{location?.peakSunHours} hrs</td></tr>
            </tbody>
          </table>
        </div>

        {/* Battery Details */}
        <div className="card">
          <div className="card-header"><div className="card-title"><span className="card-title-dot" />Battery Bank Sizing</div></div>
          <table className="data-table">
            <tbody>
              <tr><td>Chemistry</td><td style={{ color: 'var(--text)' }}>{chemistry?.name}</td></tr>
              <tr><td>Required capacity</td><td style={{ fontFamily: 'var(--mono)' }}>{batteries.requiredAh.toFixed(0)} Ah</td></tr>
              <tr><td>Battery size</td><td style={{ fontFamily: 'var(--mono)' }}>{project.batteryAh} Ah @ {project.systemVoltage}V</td></tr>
              <tr><td>Batteries in series</td><td style={{ fontFamily: 'var(--mono)' }}>{batteries.batteriesInSeries}</td></tr>
              <tr><td>Batteries in parallel</td><td style={{ fontFamily: 'var(--mono)' }}>{batteries.batteriesInParallel}</td></tr>
              <tr><td>Total batteries</td><td style={{ color: 'var(--text)', fontFamily: 'var(--mono)', fontWeight: 600 }}>{batteries.numberOfBatteries}</td></tr>
              <tr><td>Total capacity</td><td style={{ fontFamily: 'var(--mono)' }}>{batteries.totalCapacityKwh.toFixed(1)} kWh</td></tr>
              <tr><td>Usable capacity</td><td style={{ color: 'var(--green)', fontFamily: 'var(--mono)' }}>{batteries.usableKwh.toFixed(1)} kWh</td></tr>
              <tr><td>Autonomy</td><td style={{ fontFamily: 'var(--mono)' }}>{project.autonomyDays} day(s)</td></tr>
            </tbody>
          </table>
        </div>

        {/* Inverter & MPPT */}
        <div className="card">
          <div className="card-header"><div className="card-title"><span className="card-title-dot" />Inverter & Charge Controller</div></div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'var(--mono)' }}>Inverter</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{inverter.inverter.recommendedInverterKva.toFixed(1)} kVA</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>{inverter.inverter.inverterType}</div>
            {inverter.inverter.notes.map((n, i) => <div key={i} className="note" style={{ marginBottom: 6, fontSize: 12 }}>• {n}</div>)}
          </div>
          <hr className="divider" />
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'var(--mono)' }}>MPPT Charge Controller</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{inverter.mppt.recommendedMpptAmps} A</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>Voc: {inverter.mppt.openCircuitVoltageVoc}V · Isc: {inverter.mppt.shortCircuitCurrentIsc.toFixed(1)}A</div>
            {inverter.mppt.notes.map((n, i) => <div key={i} className="note" style={{ marginBottom: 6, fontSize: 12 }}>• {n}</div>)}
          </div>
        </div>

        {/* Wiring */}
        <div className="card">
          <div className="card-header"><div className="card-title"><span className="card-title-dot" />Wire Sizing & Protection</div></div>
          <table className="data-table">
            <thead><tr><th>Segment</th><th>Current</th><th>AWG</th><th>mm²</th><th>V-Drop</th><th>Fuse</th><th>Status</th></tr></thead>
            <tbody>
              {wiring.segments.map(s => (
                <tr key={s.segment.id}>
                  <td style={{ color: 'var(--text)' }}>{s.segment.name}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>{s.segment.currentAmps.toFixed(1)}A</td>
                  <td style={{ fontFamily: 'var(--mono)', color: 'var(--sun)' }}>#{s.recommendedAwg}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>{s.recommendedMm2}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>{s.voltageDropPercent.toFixed(2)}%</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>{s.fuseRating}A</td>
                  <td><span className={`tag ${s.withinSpec ? 'tag-ok' : 'tag-err'}`}>{s.withinSpec ? 'OK' : 'OVER'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ROI Chart */}
      <div className="card" style={{ marginTop: 4 }}>
        <div className="card-header">
          <div className="card-title"><span className="card-title-dot" />ROI & Payback Analysis</div>
          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>ANNUAL SAVINGS</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--green)' }}>₱{roi.annualSavingsPhp.toLocaleString('en-PH', { maximumFractionDigits: 0 })}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>PAYBACK</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--sun)' }}>{roi.paybackYears.toFixed(1)} yrs</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>25-YR ROI</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--blue)' }}>{roi.roi25Years.toFixed(0)}%</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>CO₂/YR</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--teal)' }}>{(roi.co2SavedKgPerYear / 1000).toFixed(1)} t</div>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={roi.yearlyProjection} margin={{ top: 8, right: 8, bottom: 0, left: 20 }}>
            <defs>
              <linearGradient id="roiGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F5A623" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#F5A623" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="year" tick={{ fill: '#4a5470', fontSize: 11, fontFamily: 'var(--mono)' }} label={{ value: 'Year', position: 'insideBottomRight', fill: '#4a5470', fontSize: 11 }} />
            <YAxis tick={{ fill: '#4a5470', fontSize: 11, fontFamily: 'var(--mono)' }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ background: '#13171d', border: '1px solid #2a3040', borderRadius: 8, fontFamily: 'var(--mono)', fontSize: 12 }}
              formatter={(v) => [`₱${Number(v).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`, 'Net Position']}
              labelFormatter={l => `Year ${l}`} />
            <ReferenceLine y={0} stroke="#3a4560" strokeDasharray="4 4" />
            {paybackYear && <ReferenceLine x={paybackYear} stroke="#F5A623" strokeDasharray="4 4" label={{ value: `Payback Y${paybackYear}`, position: 'top', fill: '#F5A623', fontSize: 11 }} />}
            <Area type="monotone" dataKey="netPosition" stroke="#F5A623" strokeWidth={2} fill="url(#roiGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bill of Materials */}
      <div className="card">
        <div className="card-header">
          <div className="card-title"><span className="card-title-dot" />Bill of Materials Summary</div>
        </div>
        <table className="data-table">
          <thead><tr><th>#</th><th>Component</th><th>Specification</th><th>Qty</th></tr></thead>
          <tbody>
            <tr><td style={{ fontFamily: 'var(--mono)', color: 'var(--text3)' }}>01</td><td style={{ color: 'var(--text)' }}>Solar Panel</td><td style={{ fontFamily: 'var(--mono)' }}>{project.panelWattage}W, Monocrystalline</td><td style={{ fontFamily: 'var(--mono)', color: 'var(--sun)' }}>{panels.numberOfPanels}</td></tr>
            <tr><td style={{ fontFamily: 'var(--mono)', color: 'var(--text3)' }}>02</td><td style={{ color: 'var(--text)' }}>Battery</td><td style={{ fontFamily: 'var(--mono)' }}>{project.batteryAh}Ah {project.systemVoltage}V {chemistry?.id.toUpperCase()}</td><td style={{ fontFamily: 'var(--mono)', color: 'var(--sun)' }}>{batteries.numberOfBatteries}</td></tr>
            <tr><td style={{ fontFamily: 'var(--mono)', color: 'var(--text3)' }}>03</td><td style={{ color: 'var(--text)' }}>Inverter / Charger</td><td style={{ fontFamily: 'var(--mono)' }}>{inverter.inverter.recommendedInverterKva.toFixed(1)}kVA {inverter.inverter.inverterType}</td><td style={{ fontFamily: 'var(--mono)', color: 'var(--sun)' }}>1</td></tr>
            <tr><td style={{ fontFamily: 'var(--mono)', color: 'var(--text3)' }}>04</td><td style={{ color: 'var(--text)' }}>MPPT Charge Controller</td><td style={{ fontFamily: 'var(--mono)' }}>{inverter.mppt.recommendedMpptAmps}A, {project.systemVoltage}V</td><td style={{ fontFamily: 'var(--mono)', color: 'var(--sun)' }}>1</td></tr>
            {wiring.segments.map((s, i) => (
              <tr key={s.segment.id}>
                <td style={{ fontFamily: 'var(--mono)', color: 'var(--text3)' }}>0{5 + i}</td>
                <td style={{ color: 'var(--text)' }}>DC Cable — {s.segment.name}</td>
                <td style={{ fontFamily: 'var(--mono)' }}>AWG#{s.recommendedAwg} ({s.recommendedMm2}mm²)</td>
                <td style={{ fontFamily: 'var(--mono)', color: 'var(--sun)' }}>{s.segment.lengthMeters}m</td>
              </tr>
            ))}
            <tr><td style={{ fontFamily: 'var(--mono)', color: 'var(--text3)' }}>—</td><td style={{ color: 'var(--text)' }}>Panel Mounting Structure</td><td style={{ fontFamily: 'var(--mono)' }}>Aluminum rail + L-bracket</td><td style={{ fontFamily: 'var(--mono)', color: 'var(--sun)' }}>1 set</td></tr>
            <tr><td style={{ fontFamily: 'var(--mono)', color: 'var(--text3)' }}>—</td><td style={{ color: 'var(--text)' }}>MC4 Connectors</td><td style={{ fontFamily: 'var(--mono)' }}>Male + Female pairs</td><td style={{ fontFamily: 'var(--mono)', color: 'var(--sun)' }}>{panels.numberOfPanels * 2} pairs</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
