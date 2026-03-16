export interface LoadItem {
  id: string;
  name: string;
  watts: number;
  quantity: number;
  hoursPerDay: number;
}

export interface LoadResult {
  items: LoadItem[];
  totalWatts: number;
  dailyKwh: number;
  peakLoad: number;
  surgeLoad: number;
}

const SURGE_FACTOR = 1.25;
const SAFETY_MARGIN = 1.2;

export function calculateLoad(items: LoadItem[]): LoadResult {
  const totalWatts = items.reduce((sum, item) => sum + item.watts * item.quantity, 0);
  const dailyKwh = items.reduce((sum, item) => sum + (item.watts * item.quantity * item.hoursPerDay) / 1000, 0);
  const peakLoad = totalWatts * SAFETY_MARGIN;
  const surgeLoad = totalWatts * SURGE_FACTOR * SAFETY_MARGIN;

  return { items, totalWatts, dailyKwh, peakLoad, surgeLoad };
}
