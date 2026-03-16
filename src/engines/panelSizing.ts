export interface PanelSizingInput {
  dailyKwh: number;
  peakSunHours: number;
  systemVoltage: 12 | 24 | 48;
  panelWattage: number;
  systemLossFactor?: number;
}

export interface PanelSizingResult {
  requiredKwp: number;
  numberOfPanels: number;
  totalKwp: number;
  stringsInParallel: number;
  panelsInSeries: number;
  dailyGenerationKwh: number;
  systemVoltage: number;
}

export function calculatePanelSizing(input: PanelSizingInput): PanelSizingResult {
  const lossFactor = input.systemLossFactor ?? 0.80;
  const requiredKwp = input.dailyKwh / (input.peakSunHours * lossFactor);
  const numberOfPanels = Math.ceil((requiredKwp * 1000) / input.panelWattage);

  // Typical panel Vmp ~30V for 60-cell panels
  const panelVmp = 30;
  const panelsInSeries = Math.ceil(input.systemVoltage / panelVmp);
  const stringsInParallel = Math.ceil(numberOfPanels / panelsInSeries);
  const actualPanels = panelsInSeries * stringsInParallel;
  const totalKwp = (actualPanels * input.panelWattage) / 1000;
  const dailyGenerationKwh = totalKwp * input.peakSunHours * lossFactor;

  return {
    requiredKwp,
    numberOfPanels: actualPanels,
    totalKwp,
    stringsInParallel,
    panelsInSeries,
    dailyGenerationKwh,
    systemVoltage: input.systemVoltage,
  };
}
