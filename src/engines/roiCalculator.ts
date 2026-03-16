export interface RoiInput {
  totalSystemCostPhp: number;
  dailyKwh: number;
  electricityRatePhp: number;
  systemDegradationPercent?: number;
  maintenanceCostPerYearPhp?: number;
  systemType: 'offgrid' | 'ongrid' | 'hybrid';
}

export interface RoiResult {
  annualSavingsPhp: number;
  paybackYears: number;
  roi25Years: number;
  co2SavedKgPerYear: number;
  yearlyProjection: { year: number; cumulativeSavings: number; netPosition: number }[];
}

const CO2_KG_PER_KWH = 0.6; // Philippine grid average

export function calculateRoi(input: RoiInput): RoiResult {
  const degradation = input.systemDegradationPercent ?? 0.5;
  const maintenance = input.maintenanceCostPerYearPhp ?? 2000;
  const annualKwh = input.dailyKwh * 365;
  const annualSavingsPhp = annualKwh * input.electricityRatePhp - maintenance;
  const paybackYears = input.totalSystemCostPhp / annualSavingsPhp;
  const co2SavedKgPerYear = annualKwh * CO2_KG_PER_KWH;

  let cumulative = 0;
  const yearlyProjection = Array.from({ length: 25 }, (_, i) => {
    const year = i + 1;
    const degradedSavings = annualSavingsPhp * Math.pow(1 - degradation / 100, year);
    cumulative += degradedSavings;
    return { year, cumulativeSavings: cumulative, netPosition: cumulative - input.totalSystemCostPhp };
  });

  const roi25Years = ((cumulative - input.totalSystemCostPhp) / input.totalSystemCostPhp) * 100;

  return { annualSavingsPhp, paybackYears, roi25Years, co2SavedKgPerYear, yearlyProjection };
}
