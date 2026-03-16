# ◈ SolarX — Solar Electrical Install Companion

**Live App:** [thesolarx.vercel.app](https://thesolarx.vercel.app)

SolarX is a professional-grade solar system design and calculation tool built for electricians, engineers, and DIY installers. It acts as your on-device electrical engineering companion — calculating, sizing, and recommending every component of a solar installation with no internet connection required after load.

---

## Features

### System Modes
| Mode | Description |
|------|-------------|
| **Off-Grid** | Fully autonomous — sized for complete independence from the utility grid |
| **On-Grid** | Grid-tied with net metering support and anti-islanding protection |
| **Hybrid** | Best of both — battery backup with grid connection for maximum reliability |

### Step 01 — Load Profiler
- Built-in appliance library with 25+ common household and commercial loads
- Filter by category: Lighting, Cooling, Kitchen, Electronics, Tools, Utilities
- Custom appliance entry (name + wattage)
- Per-appliance quantity and hours-per-day controls
- Live totals: daily kWh, total watts, peak load, surge load (with 1.25× surge factor and 1.2× safety margin)

### Step 02 — System Configuration
- **System voltage:** 12V / 24V / 48V with guidance on appropriate use cases
- **Location database:** 18 locations including all major Philippine cities + Southeast Asia + global cities with real Peak Sun Hour (PSH) data
- **Panel sizing:** Enter your panel wattage — automatic series/parallel string calculation
- **Battery chemistry:** LiFePO4, AGM, Gel, Flooded Lead Acid — with real DoD, efficiency, cycle life data
- **Autonomy days:** How many sunless days the battery bank must cover
- **Financial inputs:** System cost and electricity rate for ROI calculation

### Step 03 — Results & Report
#### Solar Panel Sizing
- Required kWp based on daily load, PSH, and 80% system efficiency factor
- Number of panels, series/parallel string configuration
- Estimated daily generation

#### Battery Bank Sizing
- Required Ah based on autonomy days, depth of discharge, and chemistry efficiency
- Series/parallel battery configuration
- Total and usable kWh capacity

#### Inverter & Charge Controller
- Recommended inverter kVA based on surge load
- Inverter type recommendation by system mode (Pure Sine Wave / Grid-Tie / Hybrid)
- MPPT charge controller amperage based on 125% of array Isc
- Array Voc and Isc calculations

#### Wire Sizing
- 4 standard circuit segments: PV→MPPT, MPPT→Battery, Battery→Inverter, Inverter→Load
- AWG and mm² recommendations per segment
- Voltage drop calculation (%) with pass/fail against NEC 3% standard
- Fuse/breaker rating at 125% of current

#### ROI & Payback Analysis
- Annual savings in PHP
- Payback period in years
- 25-year cumulative ROI percentage
- CO₂ savings in tonnes/year (based on Philippine grid average: 0.6 kg/kWh)
- Interactive area chart showing net position over 25 years
- 0.5% annual panel degradation factored in

#### Bill of Materials
- Complete component list with specifications and quantities
- Includes panels, batteries, inverter, MPPT, cables, MC4 connectors, mounting structure

---

## Tech Stack

```
Frontend       React 18 + TypeScript + Vite
State          Zustand (with localStorage persistence)
Charts         Recharts
Styling        Pure CSS (no UI framework)
Fonts          Space Grotesk + JetBrains Mono
Export         jsPDF + PapaParse
```

**Zero backend. Zero database. Zero API calls.**
All calculations run entirely in the browser using pure deterministic TypeScript engines.

---

## Project Structure

```
solarx/
├── src/
│   ├── engines/                  ← Pure calculation logic (no UI deps)
│   │   ├── loadCalculator.ts     Daily kWh, peak & surge load
│   │   ├── panelSizing.ts        kWp, panel count, string config
│   │   ├── batterySizing.ts      Ah, bank config, usable kWh
│   │   ├── inverterSizing.ts     kVA sizing, MPPT amps
│   │   ├── wireSizing.ts         AWG, voltage drop, fuse ratings
│   │   └── roiCalculator.ts      Payback, ROI, CO₂ savings
│   ├── data/                     ← Static JSON reference tables
│   │   ├── irradiance.json       18 locations with Peak Sun Hours
│   │   ├── appliances.json       25 appliances with watts & default hours
│   │   ├── batteries.json        4 chemistries with DoD, efficiency, cycle life
│   │   └── cables.json           AWG 18 → 4/0 with ampacity & resistance
│   ├── store/
│   │   └── solarStore.ts         Zustand store — persisted to localStorage
│   └── pages/
│       ├── LoadProfiler.tsx
│       ├── SystemDesigner.tsx
│       └── Results.tsx
```

---

## Calculation Reference

### Load Calculator
```
Daily kWh = Σ (watts × quantity × hours_per_day) / 1000
Peak Load = Total Watts × 1.2 (safety margin)
Surge Load = Total Watts × 1.25 × 1.2
```

### Panel Sizing
```
Required kWp = Daily kWh / (Peak Sun Hours × 0.80)
Panels = ceil(Required kWp × 1000 / Panel Wattage)
Panels in Series = ceil(System Voltage / Panel Vmp [~30V])
Strings in Parallel = ceil(Total Panels / Panels in Series)
```

### Battery Sizing
```
Total Energy Needed = (Daily kWh × Autonomy Days) / Battery Efficiency
Required Ah = (Total Energy Needed × 1000 / System Voltage) / Max DoD
Batteries in Series = ceil(System Voltage / Battery Nominal Voltage)
Batteries in Parallel = ceil(Required Ah / Battery Ah Rating)
```

### Wire Sizing
```
Voltage Drop = Current (A) × Wire Resistance (Ω/m) × 2 × Length (m)
Drop % = Voltage Drop / System Voltage × 100
Max allowed: 2% for DC runs, 3% for AC runs (NEC standard)
Fuse Rating = Next standard size above (Current × 1.25)
```

### ROI
```
Annual Savings = (Daily kWh × 365 × Rate PHP) - Annual Maintenance
Payback Years = Total System Cost / Annual Savings
CO₂ Saved = Daily kWh × 365 × 0.6 kg/kWh
```

---

## Location Data (Peak Sun Hours)

| Location | PSH |
|----------|-----|
| Palawan, PH | 5.6 |
| Zamboanga, PH | 5.5 |
| Davao, PH | 5.4 |
| Cagayan de Oro, PH | 5.3 |
| Cebu, PH | 5.2 |
| Iloilo, PH | 5.1 |
| Manila, PH | 4.9 |
| Baguio, PH | 4.5 |
| Dubai, UAE | 6.1 |
| Cape Town, ZA | 5.8 |
| Los Angeles, USA | 5.6 |

---

## Roadmap

- [ ] PDF report export
- [ ] Sun path & tilt angle optimizer
- [ ] Shade loss calculator
- [ ] Multiple saved projects
- [ ] CSV / BOM export
- [ ] AI assistant layer (Claude API) for natural language queries
- [ ] NEC / PEC code compliance checker
- [ ] 3-phase system support
- [ ] Generator sizing for hybrid systems

---

## Local Development

```bash
git clone https://github.com/Win1817/solarx.git
cd solarx
npm install
npm run dev
```

Build for production:
```bash
npm run build
```

---

## License

MIT — free to use, modify, and distribute.

---

Built with ◈ by [win1817](https://github.com/Win1817)
