import { useSolarStore } from './store/solarStore';
import LoadProfiler from './pages/LoadProfiler';
import SystemDesigner from './pages/SystemDesigner';
import Results from './pages/Results';
import './App.css';

const TABS = [
  { id: 'load', label: 'Load', fullLabel: 'Load Profiler', step: '01' },
  { id: 'system', label: 'System', fullLabel: 'System Config', step: '02' },
  { id: 'results', label: 'Results', fullLabel: 'Results & Report', step: '03' },
];

export default function App() {
  const { activeTab, setActiveTab, project, setProject } = useSolarStore();
  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-icon-wrap">
              <svg width="26" height="26" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="32" r="10" fill="#F5A623"/>
                <line x1="32" y1="6" x2="32" y2="14" stroke="#F5A623" strokeWidth="4" strokeLinecap="round"/>
                <line x1="32" y1="50" x2="32" y2="58" stroke="#F5A623" strokeWidth="4" strokeLinecap="round"/>
                <line x1="6" y1="32" x2="14" y2="32" stroke="#F5A623" strokeWidth="4" strokeLinecap="round"/>
                <line x1="50" y1="32" x2="58" y2="32" stroke="#F5A623" strokeWidth="4" strokeLinecap="round"/>
                <line x1="13.5" y1="13.5" x2="19.5" y2="19.5" stroke="#F5A623" strokeWidth="3" strokeLinecap="round"/>
                <line x1="44.5" y1="44.5" x2="50.5" y2="50.5" stroke="#F5A623" strokeWidth="3" strokeLinecap="round"/>
                <line x1="50.5" y1="13.5" x2="44.5" y2="19.5" stroke="#F5A623" strokeWidth="3" strokeLinecap="round"/>
                <line x1="19.5" y1="44.5" x2="13.5" y2="50.5" stroke="#F5A623" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div className="brand-name">SolarX</div>
              <div className="brand-tag">Solar Electrical Install Companion</div>
            </div>
          </div>
          <div className="project-meta">
            <input
              className="project-name-input"
              value={project.name}
              onChange={e => setProject({ name: e.target.value })}
              placeholder="Project name..."
            />
            <span className={`system-badge badge-${project.systemType}`}>{project.systemType.toUpperCase()}</span>
          </div>
        </div>
        <nav className="tab-nav">
          {TABS.map(tab => (
            <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              <span className="tab-step">{tab.step}</span>
              <span className="tab-full">{tab.fullLabel}</span>
              <span className="tab-short">{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>
      <main className="main-content">
        {activeTab === 'load' && <LoadProfiler />}
        {activeTab === 'system' && <SystemDesigner />}
        {activeTab === 'results' && <Results />}
      </main>
    </div>
  );
}
