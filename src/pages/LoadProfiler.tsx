import { useState } from 'react';
import { useSolarStore } from '../store/solarStore';
import { calculateLoad, type LoadItem } from '../engines/loadCalculator';
import appliancesData from '../data/appliances.json';

const CATEGORIES = ['All', ...Array.from(new Set(appliancesData.map(a => a.category)))];

export default function LoadProfiler() {
  const { loadItems, setLoadItems, setResults, setActiveTab } = useSolarStore();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [customName, setCustomName] = useState('');
  const [customWatts, setCustomWatts] = useState('');

  const filtered = appliancesData.filter(a =>
    (catFilter === 'All' || a.category === catFilter) &&
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const addAppliance = (a: typeof appliancesData[0]) => {
    const existing = loadItems.find(i => i.id === a.id);
    if (existing) {
      setLoadItems(loadItems.map(i => i.id === a.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setLoadItems([...loadItems, { id: a.id, name: a.name, watts: a.watts, quantity: 1, hoursPerDay: a.defaultHours }]);
    }
  };

  const addCustom = () => {
    if (!customName || !customWatts) return;
    const id = `custom-${Date.now()}`;
    setLoadItems([...loadItems, { id, name: customName, watts: Number(customWatts), quantity: 1, hoursPerDay: 4 }]);
    setCustomName(''); setCustomWatts('');
  };

  const updateItem = (id: string, field: keyof LoadItem, value: number | string) => {
    setLoadItems(loadItems.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const removeItem = (id: string) => setLoadItems(loadItems.filter(i => i.id !== id));

  const calculate = () => {
    const result = calculateLoad(loadItems);
    setResults({ load: result });
    setActiveTab('system');
  };

  const result = loadItems.length > 0 ? calculateLoad(loadItems) : null;

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Load Profiler</div>
          <div className="section-sub">Add all appliances to estimate your daily energy consumption</div>
        </div>
      </div>

      {result && (
        <div className="grid-4" style={{ marginBottom: 20 }}>
          <div className="stat-card highlight">
            <div className="stat-label">Daily Energy</div>
            <div className="stat-value">{result.dailyKwh.toFixed(2)}<span className="stat-unit">kWh</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Load</div>
            <div className="stat-value">{result.totalWatts.toFixed(0)}<span className="stat-unit">W</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Peak Load</div>
            <div className="stat-value">{result.peakLoad.toFixed(0)}<span className="stat-unit">W</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Surge Load</div>
            <div className="stat-value">{result.surgeLoad.toFixed(0)}<span className="stat-unit">W</span></div>
          </div>
        </div>
      )}

      <div className="grid-2">
        {/* Appliance picker */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><span className="card-title-dot" />Appliance Library</div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input className="form-input" placeholder="Search appliances..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {CATEGORIES.map(c => (
              <button key={c} className={`btn btn-sm ${catFilter === c ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCatFilter(c)}>{c}</button>
            ))}
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {filtered.map(a => (
              <div key={a.id} onClick={() => addAppliance(a)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, background: 'var(--bg3)', border: '1px solid var(--border)', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--sun)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{a.watts}W · {a.defaultHours}h/day</div>
                </div>
                <span style={{ fontSize: 18, color: 'var(--sun)', lineHeight: 1 }}>+</span>
              </div>
            ))}
          </div>

          <hr className="divider" />
          <div className="card-title" style={{ marginBottom: 10 }}><span className="card-title-dot" />Custom Appliance</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" placeholder="Name" value={customName} onChange={e => setCustomName(e.target.value)} />
            <input className="form-input" placeholder="Watts" type="number" value={customWatts} onChange={e => setCustomWatts(e.target.value)} style={{ width: 100 }} />
            <button className="btn btn-secondary" onClick={addCustom}>Add</button>
          </div>
        </div>

        {/* Load list */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><span className="card-title-dot" />Your Load List <span style={{ color: 'var(--text3)', fontWeight: 400 }}>({loadItems.length} items)</span></div>
            {loadItems.length > 0 && <button className="btn btn-sm btn-danger" onClick={() => setLoadItems([])}>Clear All</button>}
          </div>
          {loadItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)', fontSize: 13 }}>
              No appliances added yet.<br />Click items from the library to add them.
            </div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Appliance</th><th>Qty</th><th>Hrs/Day</th><th>kWh/Day</th><th></th></tr></thead>
              <tbody>
                {loadItems.map(item => (
                  <tr key={item.id}>
                    <td style={{ color: 'var(--text)' }}>{item.name}<div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{item.watts}W each</div></td>
                    <td>
                      <input type="number" min={1} value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                        style={{ width: 52, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 6, padding: '4px 6px', fontFamily: 'var(--mono)', fontSize: 13, textAlign: 'center' }} />
                    </td>
                    <td>
                      <input type="number" min={0} max={24} step={0.5} value={item.hoursPerDay} onChange={e => updateItem(item.id, 'hoursPerDay', Number(e.target.value))}
                        style={{ width: 60, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 6, padding: '4px 6px', fontFamily: 'var(--mono)', fontSize: 13, textAlign: 'center' }} />
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', color: 'var(--sun)' }}>{((item.watts * item.quantity * item.hoursPerDay) / 1000).toFixed(3)}</td>
                    <td><button className="btn btn-sm btn-danger" onClick={() => removeItem(item.id)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {result && (
            <>
              <hr className="divider" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                  Total: <span style={{ color: 'var(--sun)', fontFamily: 'var(--mono)', fontWeight: 600 }}>{result.dailyKwh.toFixed(2)} kWh/day</span>
                </div>
                <button className="btn btn-primary" onClick={calculate}>Next: System Config →</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
