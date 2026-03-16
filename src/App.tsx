import { useSolarStore } from './store/solarStore';
import LoadProfiler from './pages/LoadProfiler';
import SystemDesigner from './pages/SystemDesigner';
import Results from './pages/Results';
import './App.css';

const TABS = [
  { id: 'load', label: 'Load Profiler', step: '01' },
  { id: 'system', label: 'System Config', step: '02' },
  { id: 'results', label: 'Results & Report', step: '03' },
];

export default function App() {
  const { activeTab, setActiveTab, project, setProject } = useSolarStore();
  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-icon-wrap">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="5" fill="#F5A623"/>
                <line x1="14" y1="2" x2="14" y2="6" stroke="#F5A623" strokeWidth="2" strokeLinecap="round"/>
                <line x1="14" y1="22" x2="14" y2="26" stroke="#F5A623" strokeWidth="2" strokeLinecap="round"/>
                <line x1="2" y1="14" x2="6" y2="14" stroke="#F5A623" strokeWidth="2" strokeLinecap="round"/>
                <line x1="22" y1="14" x2="26" y2="14" stroke="#F5A623" strokeWidth="2" strokeLinecap="round"/>
                <line x1="5.5" y1="5.5" x2="8.5" y2="8.5" stroke="#F5A623" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="19.5" y1="19.5" x2="22.5" y2="22.5" stroke="#F5A623" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="22.5" y1="5.5" x2="19.5" y2="8.5" stroke="#F5A623" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="8.5" y1="19.5" x2="5.5" y2="22.5" stroke="#F5A623" strokeWidth="1.5" strokeLinecap="round"/>
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
              <span>{tab.label}</span>
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
