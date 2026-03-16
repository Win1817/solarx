import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LoadItem, LoadResult } from '../engines/loadCalculator';
import type { PanelSizingResult } from '../engines/panelSizing';
import type { BatterySizingResult } from '../engines/batterySizing';
import type { InverterSizingResult } from '../engines/inverterSizing';
import type { WireSizingResult } from '../engines/wireSizing';
import type { RoiResult } from '../engines/roiCalculator';

export type SystemType = 'offgrid' | 'ongrid' | 'hybrid';
export type SystemVoltage = 12 | 24 | 48;

export interface ProjectConfig {
  name: string;
  systemType: SystemType;
  systemVoltage: SystemVoltage;
  locationId: string;
  panelWattage: number;
  batteryChemistryId: string;
  batteryAh: number;
  autonomyDays: number;
  electricityRatePhp: number;
  totalSystemCostPhp: number;
}

export interface SolarResults {
  load: LoadResult | null;
  panels: PanelSizingResult | null;
  batteries: BatterySizingResult | null;
  inverter: InverterSizingResult | null;
  wiring: WireSizingResult | null;
  roi: RoiResult | null;
}

interface SolarStore {
  project: ProjectConfig;
  loadItems: LoadItem[];
  results: SolarResults;
  activeTab: string;
  setProject: (updates: Partial<ProjectConfig>) => void;
  setLoadItems: (items: LoadItem[]) => void;
  setResults: (results: Partial<SolarResults>) => void;
  setActiveTab: (tab: string) => void;
  resetProject: () => void;
}

const defaultProject: ProjectConfig = {
  name: 'My Solar Project',
  systemType: 'hybrid',
  systemVoltage: 24,
  locationId: 'ph-cebu',
  panelWattage: 400,
  batteryChemistryId: 'lifepo4',
  batteryAh: 100,
  autonomyDays: 1,
  electricityRatePhp: 12,
  totalSystemCostPhp: 150000,
};

export const useSolarStore = create<SolarStore>()(
  persist(
    (set) => ({
      project: defaultProject,
      loadItems: [],
      results: { load: null, panels: null, batteries: null, inverter: null, wiring: null, roi: null },
      activeTab: 'load',
      setProject: (updates) => set(s => ({ project: { ...s.project, ...updates } })),
      setLoadItems: (items) => set({ loadItems: items }),
      setResults: (results) => set(s => ({ results: { ...s.results, ...results } })),
      setActiveTab: (tab) => set({ activeTab: tab }),
      resetProject: () => set({ project: defaultProject, loadItems: [], results: { load: null, panels: null, batteries: null, inverter: null, wiring: null, roi: null } }),
    }),
    { name: 'solarx-storage' }
  )
);
