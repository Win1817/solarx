export interface BatterySizingInput {
  dailyKwh: number;
  systemVoltage: 12 | 24 | 48;
  autonomyDays: number;
  batteryChemistry: {
    maxDoD: number;
    efficiency: number;
    nominalVoltage: number;
  };
  batteryAh: number;
}

export interface BatterySizingResult {
  requiredAh: number;
  numberOfBatteries: number;
  batteriesInSeries: number;
  batteriesInParallel: number;
  totalCapacityAh: number;
  totalCapacityKwh: number;
  usableKwh: number;
}

export function calculateBatterySizing(input: BatterySizingInput): BatterySizingResult {
  const { dailyKwh, systemVoltage, autonomyDays, batteryChemistry, batteryAh } = input;
  const totalEnergyNeeded = (dailyKwh * autonomyDays) / batteryChemistry.efficiency;
  const totalAhNeeded = (totalEnergyNeeded * 1000) / systemVoltage;
  const requiredAh = totalAhNeeded / batteryChemistry.maxDoD;

  const batteriesInSeries = Math.ceil(systemVoltage / batteryChemistry.nominalVoltage);
  const batteriesInParallel = Math.ceil(requiredAh / batteryAh);
  const numberOfBatteries = batteriesInSeries * batteriesInParallel;
  const totalCapacityAh = batteriesInParallel * batteryAh;
  const totalCapacityKwh = (totalCapacityAh * systemVoltage) / 1000;
  const usableKwh = totalCapacityKwh * batteryChemistry.maxDoD * batteryChemistry.efficiency;

  return {
    requiredAh,
    numberOfBatteries,
    batteriesInSeries,
    batteriesInParallel,
    totalCapacityAh,
    totalCapacityKwh,
    usableKwh,
  };
}
