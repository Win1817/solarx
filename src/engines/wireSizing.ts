import cablesData from '../data/cables.json';

export interface WireSegment {
  id: string;
  name: string;
  currentAmps: number;
  lengthMeters: number;
  systemVoltage: number;
  maxVoltageDrop?: number;
}

export interface WireResult {
  segment: WireSegment;
  recommendedAwg: string;
  recommendedMm2: number;
  actualVoltageDrop: number;
  voltageDropPercent: number;
  fuseRating: number;
  withinSpec: boolean;
}

export interface WireSizingResult {
  segments: WireResult[];
}

const FUSE_SIZES = [1, 2, 3, 5, 7.5, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100, 125, 150, 200];

function nextFuseSize(amps: number): number {
  return FUSE_SIZES.find(f => f >= amps * 1.25) ?? amps * 1.25;
}

export function calculateWireSizing(segments: WireSegment[]): WireSizingResult {
  const results: WireResult[] = segments.map(seg => {
    const maxDrop = seg.maxVoltageDrop ?? 0.03;
    const maxDropVolts = seg.systemVoltage * maxDrop;

    // V_drop = I * R_total; R = (resistivity * length * 2) / 1000 [mOhm/m from table]
    // Find cable where drop <= max
    const suitable = cablesData.find(cable => {
      const resistanceOhm = (cable.resistance * seg.lengthMeters * 2) / 1000;
      const drop = seg.currentAmps * resistanceOhm;
      return drop <= maxDropVolts && cable.ampacity12v >= seg.currentAmps;
    });

    const cable = suitable ?? cablesData[cablesData.length - 1];
    const resistanceOhm = (cable.resistance * seg.lengthMeters * 2) / 1000;
    const actualVoltageDrop = seg.currentAmps * resistanceOhm;
    const voltageDropPercent = (actualVoltageDrop / seg.systemVoltage) * 100;

    return {
      segment: seg,
      recommendedAwg: cable.awg,
      recommendedMm2: cable.mm2,
      actualVoltageDrop,
      voltageDropPercent,
      fuseRating: nextFuseSize(seg.currentAmps),
      withinSpec: voltageDropPercent <= maxDrop * 100,
    };
  });

  return { segments: results };
}

export function generateStandardSegments(
  peakLoadWatts: number,
  systemVoltage: number,
  totalPanelKwp: number,
  _batteryAh: number
): WireSegment[] {
  const inverterCurrent = peakLoadWatts / systemVoltage;
  const solarCurrent = (totalPanelKwp * 1000) / systemVoltage;
  // const batteryCurrent = batteryAh * 0.2; // C/5 rate

  return [
    { id: 'pv-mppt', name: 'PV Array → MPPT', currentAmps: solarCurrent, lengthMeters: 10, systemVoltage, maxVoltageDrop: 0.02 },
    { id: 'mppt-battery', name: 'MPPT → Battery', currentAmps: solarCurrent, lengthMeters: 3, systemVoltage, maxVoltageDrop: 0.01 },
    { id: 'battery-inverter', name: 'Battery → Inverter', currentAmps: inverterCurrent, lengthMeters: 2, systemVoltage, maxVoltageDrop: 0.01 },
    { id: 'inverter-load', name: 'Inverter → Load Panel', currentAmps: peakLoadWatts / 220, lengthMeters: 5, systemVoltage: 220, maxVoltageDrop: 0.03 },
  ];
}
