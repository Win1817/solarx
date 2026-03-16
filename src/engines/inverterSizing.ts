export type SystemType = 'offgrid' | 'ongrid' | 'hybrid';

export interface InverterSizingInput {
  peakLoadWatts: number;
  surgeLoadWatts: number;
  systemVoltage: 12 | 24 | 48;
  totalPanelKwp: number;
  systemType: SystemType;
}

export interface InverterResult {
  recommendedInverterKva: number;
  inverterType: string;
  notes: string[];
}

export interface MpptResult {
  recommendedMpptAmps: number;
  shortCircuitCurrentIsc: number;
  openCircuitVoltageVoc: number;
  notes: string[];
}

export interface InverterSizingResult {
  inverter: InverterResult;
  mppt: MpptResult;
}

export function calculateInverterSizing(input: InverterSizingInput): InverterSizingResult {
  const { peakLoadWatts, surgeLoadWatts, systemVoltage, totalPanelKwp, systemType } = input;

  // Inverter: size to surge, round up to nearest standard size
  const standardSizes = [1000, 1500, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000, 20000];
  const minInverterW = surgeLoadWatts;
  const inverterW = standardSizes.find(s => s >= minInverterW) ?? minInverterW;
  const inverterKva = inverterW / 1000;

  const inverterTypeMap: Record<SystemType, string> = {
    offgrid: 'Pure Sine Wave Off-Grid Inverter/Charger',
    ongrid: 'Grid-Tie Inverter (with Anti-islanding)',
    hybrid: 'Hybrid Inverter (Grid-Tie + Battery)',
  };

  const inverterNotes: string[] = [
    `Min inverter size based on surge load: ${(minInverterW / 1000).toFixed(1)} kVA`,
    systemType === 'ongrid' ? 'Must have grid-sync and anti-islanding protection' : '',
    systemType === 'hybrid' ? 'Ensure inverter supports both battery and grid input' : '',
  ].filter(Boolean);

  // MPPT: Isc = Parray / Voc_array, size to 125% of Isc
  const panelVoc = 37; // typical 60-cell panel Voc
  const panelIsc = 9.5; // typical
  const panelsInSeries = Math.ceil(systemVoltage / 30);
  const stringsInParallel = Math.ceil((totalPanelKwp * 1000) / (panelsInSeries * (input.totalPanelKwp > 0 ? 300 : 300)));
  const arrayIsc = panelIsc * stringsInParallel;
  const arrayVoc = panelVoc * panelsInSeries;
  const recommendedMpptAmps = Math.ceil(arrayIsc * 1.25 / 5) * 5;

  const mpptNotes: string[] = [
    `Array Voc: ~${arrayVoc}V — ensure MPPT max input voltage is higher`,
    `MPPT rated at 125% of array Isc for safety`,
    peakLoadWatts > 3000 ? 'Consider dual MPPT inputs for large arrays' : '',
  ].filter(Boolean);

  return {
    inverter: {
      recommendedInverterKva: inverterKva,
      inverterType: inverterTypeMap[systemType],
      notes: inverterNotes,
    },
    mppt: {
      recommendedMpptAmps: recommendedMpptAmps,
      shortCircuitCurrentIsc: arrayIsc,
      openCircuitVoltageVoc: arrayVoc,
      notes: mpptNotes,
    },
  };
}
