import { useSolarStore } from '../store/solarStore';
import { calculatePanelSizing } from '../engines/panelSizing';
import { calculateBatterySizing } from '../engines/batterySizing';
import { calculateInverterSizing } from '../engines/inverterSizing';
import { calculateWireSizing, generateStandardSegments } from '../engines/wireSizing';
import { calculateRoi } from '../engines/roiCalculator';
import irradianceData from '../data/irradiance.json';
import batteriesData from '../data/batteries.json';

export default function SystemDesigner() {
  const { project, setProject, results, setResults, setActiveTab } = useSolarStore();
  const loadResult = results.load;

  const runCalculations = () => {
    if (!loadResult) return;
    const location = irradianceData.find(l => l.id === project.locationId)!;
    const chemistry = batteriesData.find(b => b.id === project.batteryChemistryId)!;

    const panels = calculatePanelSizing({
      dailyKwh: loadResult.dailyKwh,
      peakSunHours: location.peakSunHours,
      systemVoltage: project.systemVoltage,
      panelWattage: project.panelWattage,
    });

    const batteries = calculateBatterySizing({
      dailyKwh: loadResult.dailyKwh,
      systemVoltage: project.systemVoltage,
      autonomyDays: project.autonomyDays,
      batteryChemistry: chemistry,
      batteryAh: project.batteryAh,
    });

    const inverter = calculateInverterSizing({
      peakLoadWatts: loadResult.peakLoad,
      surgeLoadWatts: loadResult.surgeLoad,
      systemVoltage: project.systemVoltage,
      totalPanelKwp: panels.totalKwp,
      systemType: project.systemType,
    });

    const segments = generateStandardSegments(loadResult.peakLoad, project.systemVoltage, panels.totalKwp, project.batteryAh);
    const wiring = calculateWireSizing(segments);

    const roi = calculateRoi({
      totalSystemCostPhp: project.totalSystemCostPhp,
      dailyKwh: loadResult.dailyKwh,
      electricityRatePhp: project.electricityRatePhp,
      systemType: project.systemType,
    });

    setResults({ panels, batteries, inverter, wiring, roi });
    setActiveTab('results');
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">System Configuration</div>
          <div className="section-sub">Configure your solar system parameters</div>
        </div>
        {!loadResult && (
          <div className="note note-warn" style={{ fontSize: 12 }}>⚠ Complete the Load Profiler first</div>
        )}
      </div>

      {loadResult && (
        <div className="note" style={{ marginBottom: 20 }}>
          Load: <strong style={{ color: 'var(--sun)' }}>{loadResult.dailyKwh.toFixed(2)} kWh/day</strong> · Peak: <strong style={{ color: 'var(--sun)' }}>{loadResult.peakLoad.toFixed(0)} W</strong>
        </div>
      )}

      <div className="grid-2">
        {/* System Type & Location */}
        <div className="card">
          <div className="card-header"><div className="card-title"><span className="card-title-dot" />System Type & Location</div></div>

          <div className="form-row">
            <label className="form-label">System Type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['offgrid', 'ongrid', 'hybrid'] as const).map(type => (
                <button key={type} className={`btn ${project.systemType === type ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }}
                  onClick={() => setProject({ systemType: type })}>
                  {type === 'offgrid' ? '🏕 Off-Grid' : type === 'ongrid' ? '🏙 On-Grid' : '⚡ Hybrid'}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">System Voltage</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {([12, 24, 48] as const).map(v => (
                <button key={v} className={`btn ${project.systemVoltage === v ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }}
                  onClick={() => setProject({ systemVoltage: v })}>
                  {v}V
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
              {project.systemVoltage === 12 && 'Small systems up to ~1.5kW'}
              {project.systemVoltage === 24 && 'Medium systems 1.5–5kW (recommended)'}
              {project.systemVoltage === 48 && 'Large systems 5kW+ (most efficient)'}
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">Location</label>
            <select className="form-select" value={project.locationId} onChange={e => setProject({ locationId: e.target.value })}>
              <optgroup label="Philippines">
                {irradianceData.filter(l => l.region === 'PH').map(l => (
                  <option key={l.id} value={l.id}>{l.name} — {l.peakSunHours} PSH</option>
                ))}
              </optgroup>
              <optgroup label="Southeast Asia">
                {irradianceData.filter(l => l.region === 'SEA').map(l => (
                  <option key={l.id} value={l.id}>{l.name} — {l.peakSunHours} PSH</option>
                ))}
              </optgroup>
              <optgroup label="Global">
                {irradianceData.filter(l => l.region === 'Global').map(l => (
                  <option key={l.id} value={l.id}>{l.name} — {l.peakSunHours} PSH</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="form-row">
            <label className="form-label">Solar Panel Wattage (W per panel)</label>
            <input className="form-input" type="number" value={project.panelWattage} onChange={e => setProject({ panelWattage: Number(e.target.value) })} />
          </div>
        </div>

        {/* Battery Config */}
        <div className="card">
          <div className="card-header"><div className="card-title"><span className="card-title-dot" />Battery Configuration</div></div>

          <div className="form-row">
            <label className="form-label">Battery Chemistry</label>
            <select className="form-select" value={project.batteryChemistryId} onChange={e => setProject({ batteryChemistryId: e.target.value })}>
              {batteriesData.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {(() => {
              const chem = batteriesData.find(b => b.id === project.batteryChemistryId);
              return chem ? <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{chem.notes}</div> : null;
            })()}
          </div>

          <div className="grid-2">
            <div className="form-row">
              <label className="form-label">Battery Capacity (Ah)</label>
              <input className="form-input" type="number" value={project.batteryAh} onChange={e => setProject({ batteryAh: Number(e.target.value) })} />
            </div>
            <div className="form-row">
              <label className="form-label">Autonomy (Days without sun)</label>
              <input className="form-input" type="number" min={1} max={7} value={project.autonomyDays} onChange={e => setProject({ autonomyDays: Number(e.target.value) })} />
            </div>
          </div>
        </div>

        {/* Financial */}
        <div className="card">
          <div className="card-header"><div className="card-title"><span className="card-title-dot" />Financial Parameters</div></div>
          <div className="grid-2">
            <div className="form-row">
              <label className="form-label">Total System Cost (PHP)</label>
              <input className="form-input" type="number" value={project.totalSystemCostPhp} onChange={e => setProject({ totalSystemCostPhp: Number(e.target.value) })} />
            </div>
            <div className="form-row">
              <label className="form-label">Electricity Rate (PHP/kWh)</label>
              <input className="form-input" type="number" step="0.5" value={project.electricityRatePhp} onChange={e => setProject({ electricityRatePhp: Number(e.target.value) })} />
            </div>
          </div>
          <div className="note" style={{ fontSize: 12 }}>
            Philippine average rate: ₱10–14/kWh depending on utility. Meralco average ≈ ₱11.50/kWh.
          </div>
        </div>

        {/* CTA */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 160, gap: 12, background: loadResult ? 'rgba(245,166,35,0.04)' : 'var(--bg2)', borderColor: loadResult ? 'rgba(245,166,35,0.3)' : 'var(--border)' }}>
          {loadResult ? (
            <>
              <div style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center' }}>All parameters ready.<br />Run the full system calculation.</div>
              <button className="btn btn-primary" style={{ fontSize: 15, padding: '12px 32px' }} onClick={runCalculations}>
                ⚡ Calculate System
              </button>
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center' }}>
              Complete Step 01 — Load Profiler<br />before running calculations.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
