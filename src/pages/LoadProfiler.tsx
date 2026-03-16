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
          <div className="section-sub">Add appliances to estimate daily energy use</div>
        </div>
      </div>

      {result && (
        <div className="grid-4" style={{ marginBottom: 14 }}>
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
        {/* Appliance Picker */}
        <div className="card">
          <div className="card-header"><div className="card-title"><span className="card-title-dot"/>Appliance Library</div></div>
          <input className="form-input" placeholder="Search appliances..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 10 }}/>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
            {CATEGORIES.map(c => (
              <button key={c} className={`btn btn-sm ${catFilter === c ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCatFilter(c)}>{c}</button>
            ))}
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {filtered.map(a => (
              <div key={a.id} className="appliance-item" onClick={() => addAppliance(a)}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{a.watts}W · {a.defaultHours}h/day</div>
                </div>
                <span style={{ fontSize: 20, color: 'var(--sun)', lineHeight: 1, paddingLeft: 8 }}>+</span>
              </div>
            ))}
          </div>
          <hr className="divider"/>
          <div className="card-title" style={{ marginBottom: 10 }}><span className="card-title-dot"/>Custom Appliance</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="form-input" placeholder="Name" value={customName} onChange={e => setCustomName(e.target.value)}/>
            <input className="form-input" placeholder="Watts" type="number" value={customWatts} onChange={e => setCustomWatts(e.target.value)} style={{ width: 90, flexShrink: 0 }}/>
            <button className="btn btn-secondary" style={{ flexShrink: 0 }} onClick={addCustom}>Add</button>
          </div>
        </div>

        {/* Load List */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><span className="card-title-dot"/>Load List <span style={{ color: 'var(--text3)', fontWeight: 400 }}>({loadItems.length})</span></div>
            {loadItems.length > 0 && <button className="btn btn-sm btn-danger" onClick={() => setLoadItems([])}>Clear</button>}
          </div>
          {loadItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text3)', fontSize: 13 }}>
              Tap appliances from the library to add them.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Appliance</th><th>Qty</th><th>Hrs</th><th>kWh</th><th></th></tr></thead>
                <tbody>
                  {loadItems.map(item => (
                    <tr key={item.id}>
                      <td style={{ color: 'var(--text)' }}>
                        {item.name}
                        <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{item.watts}W</div>
                      </td>
                      <td><input type="number" min={1} value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} className="inline-input"/></td>
                      <td><input type="number" min={0} max={24} step={0.5} value={item.hoursPerDay} onChange={e => updateItem(item.id, 'hoursPerDay', Number(e.target.value))} className="inline-input" style={{ width: 52 }}/></td>
                      <td style={{ fontFamily: 'var(--mono)', color: 'var(--sun)' }}>{((item.watts * item.quantity * item.hoursPerDay) / 1000).toFixed(2)}</td>
                      <td><button className="btn btn-sm btn-danger" onClick={() => removeItem(item.id)}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {result && (
            <>
              <hr className="divider"/>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
