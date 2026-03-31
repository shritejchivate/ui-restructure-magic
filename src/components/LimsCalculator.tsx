import { useState } from "react";

// ─── MODALITY DATA ────────────────────────────────────────────────────────────
const MODALITIES = {
  molecular: {
    name: "Molecular / PCR",
    icon: "🧬",
    desc: "High-complexity, high-value tests",
    revMultiplier: 1.6,
    reagentMultiplier: 1.4,
    errorMultiplier: 0.9,
    colorClass: "text-lims-violet",
    bgClass: "bg-violet-50",
    borderClass: "border-violet-400",
    accentHex: "#7c3aed",
  },
  pathology: {
    name: "Pathology / Anatomic",
    icon: "🔬",
    desc: "Slide-based, interpretation-heavy",
    revMultiplier: 1.3,
    reagentMultiplier: 0.8,
    errorMultiplier: 1.1,
    colorClass: "text-lims-sky",
    bgClass: "bg-sky-50",
    borderClass: "border-sky-400",
    accentHex: "#0369a1",
  },
  clinical: {
    name: "Clinical / General",
    icon: "🏥",
    desc: "High-volume routine testing",
    revMultiplier: 1.0,
    reagentMultiplier: 1.0,
    errorMultiplier: 1.0,
    colorClass: "text-lims-emerald",
    bgClass: "bg-emerald-50",
    borderClass: "border-emerald-400",
    accentHex: "#059669",
  },
};

type ModalityKey = keyof typeof MODALITIES;
type LabSizeKey = "small" | "medium" | "large";
type GoalKey = "A" | "B" | "C";

const PLAN_TIERS: Record<LabSizeKey, Array<{ key: string; name: string; monthly: number; annual: number; onboarding: number; tag: string; desc: string }>> = {
  small: [
    { key: "base_s", name: "BASE", monthly: 400, annual: 4800, onboarding: 0, tag: "Recommended", desc: "Core LIMS for small labs. Up to 2 users." },
    { key: "growth_s", name: "GROWTH", monthly: 800, annual: 9600, onboarding: 3500, tag: "", desc: "Adds integrations & reporting. Up to 6 users." },
    { key: "ent_s", name: "ENTERPRISE", monthly: 1400, annual: 16800, onboarding: 7500, tag: "", desc: "Multi-site ready. Unlimited users." },
  ],
  medium: [
    { key: "base_m", name: "BASE", monthly: 900, annual: 10800, onboarding: 5000, tag: "", desc: "Core workflows for growing labs." },
    { key: "growth_m", name: "GROWTH", monthly: 1800, annual: 21600, onboarding: 9000, tag: "Recommended", desc: "Full analytics, QC & client portal." },
    { key: "ent_m", name: "ENTERPRISE", monthly: 3200, annual: 38400, onboarding: 14000, tag: "", desc: "Enterprise controls, SLA & dedicated CSM." },
  ],
  large: [
    { key: "base_l", name: "BASE", monthly: 2200, annual: 26400, onboarding: 10000, tag: "", desc: "Standardized workflows at scale." },
    { key: "growth_l", name: "GROWTH", monthly: 4200, annual: 50400, onboarding: 16000, tag: "Recommended", desc: "Advanced automation & BI dashboards." },
    { key: "ent_l", name: "ENTERPRISE", monthly: 6800, annual: 81600, onboarding: 22000, tag: "Most Popular", desc: "Full enterprise suite, custom SLAs, dedicated team." },
  ],
};

const BASE_DEFAULTS: Record<LabSizeKey, Record<string, number>> = {
  small: { volume: 5000, revPerTest: 55, ftes: 1.5, salary: 55000, laborPct: 0.65, otHrs: 10, otPct: 0.40, rejectionRate: 0.04, costPerRepeat: 45, errorReductionPct: 0.60, audits: 2, auditHrs: 30, auditSavePct: 0.48, capaCost: 5000, capaReductionPct: 0.50, tatImprovement: 0.20, reagentSpend: 55000, reagentWastePct: 0.12, impl: 10000, migration: 3500, hardware: 3000, training: 3500, maintenance: 5000, itOverhead: 2000, retraining: 1000 },
  medium: { volume: 25000, revPerTest: 80, ftes: 3.5, salary: 62000, laborPct: 0.60, otHrs: 30, otPct: 0.45, rejectionRate: 0.035, costPerRepeat: 60, errorReductionPct: 0.55, audits: 3, auditHrs: 60, auditSavePct: 0.52, capaCost: 12000, capaReductionPct: 0.45, tatImprovement: 0.25, reagentSpend: 175000, reagentWastePct: 0.14, impl: 28000, migration: 15000, hardware: 10000, training: 9000, maintenance: 16000, itOverhead: 5000, retraining: 2500 },
  large: { volume: 100000, revPerTest: 110, ftes: 9, salary: 70000, laborPct: 0.55, otHrs: 90, otPct: 0.50, rejectionRate: 0.025, costPerRepeat: 85, errorReductionPct: 0.50, audits: 4, auditHrs: 120, auditSavePct: 0.57, capaCost: 30000, capaReductionPct: 0.40, tatImprovement: 0.30, reagentSpend: 700000, reagentWastePct: 0.16, impl: 90000, migration: 50000, hardware: 35000, training: 25000, maintenance: 48000, itOverhead: 15000, retraining: 8000 },
};

function buildDefaults(size: LabSizeKey, modality: ModalityKey) {
  const base = { ...BASE_DEFAULTS[size] };
  const m = MODALITIES[modality];
  return {
    ...base,
    revPerTest: Math.round(base.revPerTest * m.revMultiplier),
    reagentSpend: Math.round(base.reagentSpend * m.reagentMultiplier),
    rejectionRate: Math.round(base.rejectionRate * m.errorMultiplier * 1000) / 1000,
  };
}

function getRecommendedPlan(size: LabSizeKey, goal: GoalKey) {
  const tiers = PLAN_TIERS[size];
  if (goal === "A") return tiers[0].key;
  if (goal === "B") return tiers[1].key;
  return tiers[2].key;
}

function getPlanByKey(size: LabSizeKey, key: string) {
  return PLAN_TIERS[size].find(p => p.key === key) || PLAN_TIERS[size][0];
}

// ─── CALC ENGINE ──────────────────────────────────────────────────────────────
function calcROI(inp: Record<string, number>) {
  const hourlyRate = inp.salary / 2080;
  const baseLaborCost = inp.ftes * inp.salary;
  const baseLaborSavings = baseLaborCost * inp.laborPct;
  const otSavings = inp.otHrs * 12 * hourlyRate * 1.5 * inp.otPct;
  const laborSavings = baseLaborSavings + otSavings;
  const errorSavings = inp.volume * inp.rejectionRate * inp.costPerRepeat * inp.errorReductionPct;
  const complianceSavings = (inp.audits * inp.auditHrs * inp.auditSavePct * hourlyRate) + (inp.capaCost * inp.capaReductionPct);
  const throughputGain = inp.volume * inp.tatImprovement * 0.5 * inp.revPerTest;
  const reagentSavings = inp.reagentSpend * inp.reagentWastePct;
  const totalBenefits = laborSavings + errorSavings + complianceSavings + throughputGain + reagentSavings;
  const oneTimeCost = inp.onboarding + inp.impl + inp.migration + inp.hardware + inp.training;
  const annualOngoing = inp.licenseYr1 + inp.maintenance + inp.itOverhead + inp.retraining;
  const netAnnual = totalBenefits - annualOngoing;
  const payback = netAnnual > 0 ? (oneTimeCost / netAnnual) * 12 : Infinity;
  const totalCost3 = oneTimeCost + annualOngoing * 3;
  const totalBenefit3 = totalBenefits * 0.60 + totalBenefits * 0.80 + totalBenefits;
  const totalCost5 = oneTimeCost + annualOngoing * 5;
  const totalBenefit5 = totalBenefit3 + totalBenefits * 2;
  const roi3 = totalCost3 > 0 ? (totalBenefit3 - totalCost3) / totalCost3 : 0;
  const roi5 = totalCost5 > 0 ? (totalBenefit5 - totalCost5) / totalCost5 : 0;
  const yr3cum = -oneTimeCost + totalBenefits * 0.60 - annualOngoing + totalBenefits * 0.80 - annualOngoing + totalBenefits - annualOngoing;
  const yr5cum = yr3cum + (totalBenefits - annualOngoing) * 2;

  return {
    laborSavings, errorSavings, complianceSavings, throughputGain, reagentSavings,
    totalBenefits, oneTimeCost, annualOngoing, netAnnual, payback, yr3cum, yr5cum, roi3, roi5,
    breakdown: [
      { label: "Labor Savings", value: laborSavings, pct: laborSavings / totalBenefits },
      { label: "Error Reduction", value: errorSavings, pct: errorSavings / totalBenefits },
      { label: "Compliance", value: complianceSavings, pct: complianceSavings / totalBenefits },
      { label: "Throughput Revenue", value: throughputGain, pct: throughputGain / totalBenefits },
      { label: "Reagent Savings", value: reagentSavings, pct: reagentSavings / totalBenefits },
    ],
  };
}

// ─── FORMATTERS ───────────────────────────────────────────────────────────────
const fmt = (n: number) => n < 0 ? `-$${Math.abs(Math.round(n)).toLocaleString()}` : `$${Math.round(n).toLocaleString()}`;
const fmtK = (n: number) => { const a = Math.abs(n), s = n < 0 ? "-" : ""; return a >= 1e6 ? `${s}$${(a / 1e6).toFixed(1)}M` : a >= 1000 ? `${s}$${Math.round(a / 1000)}K` : `${s}$${Math.round(a)}`; };
const fmtPct = (n: number) => `${(n * 100).toFixed(0)}%`;
const fmtMos = (n: number) => !isFinite(n) ? "N/A" : n < 1 ? "<1 mo" : n > 60 ? ">5 yrs" : `${n.toFixed(1)} mos`;

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function InputField({ label, value, onChange, prefix, suffix, min, max, step = 1, note, readOnly }: {
  label: string; value: number; onChange: (v: number) => void; prefix?: string; suffix?: string;
  min?: number; max?: number; step?: number; note?: string; readOnly?: boolean;
}) {
  return (
    <div className="mb-3.5">
      <div className="flex justify-between items-baseline mb-1">
        <label className="lims-label">{label}</label>
        {note && <span className="text-[10px] text-lims-muted-text italic">{note}</span>}
      </div>
      <div className={`lims-input-wrapper ${readOnly ? 'opacity-60' : ''}`}>
        {prefix && <span className="lims-input-prefix">{prefix}</span>}
        <input
          type="number" value={value} min={min} max={max} step={step} readOnly={readOnly}
          onChange={e => !readOnly && onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 border-none bg-transparent py-2 px-3 text-sm font-medium text-foreground outline-none w-full"
          style={{ cursor: readOnly ? "default" : "auto" }}
        />
        {suffix && <span className="px-2.5 text-xs text-lims-muted-text">{suffix}</span>}
      </div>
    </div>
  );
}

function SliderInput({ label, value, onChange, min, max, step = 0.01, format = fmtPct, note, accentColor = "#6366f1" }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number;
  step?: number; format?: (n: number) => string; note?: string; accentColor?: string;
}) {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-baseline mb-1.5">
        <label className="lims-label">{label}</label>
        <span className="text-sm font-extrabold" style={{ color: accentColor }}>{format(value)}</span>
      </div>
      {note && <p className="text-[10px] text-lims-muted-text italic mb-1.5">{note}</p>}
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full cursor-pointer"
        style={{ accentColor }}
      />
      <div className="flex justify-between text-[10px] text-lims-muted-text mt-0.5">
        <span>{format(min)}</span><span>{format(max)}</span>
      </div>
    </div>
  );
}

// ─── MODALITY SELECTOR ────────────────────────────────────────────────────────
function ModalitySelector({ modality, setModality }: { modality: ModalityKey; setModality: (m: ModalityKey) => void }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {(Object.entries(MODALITIES) as [ModalityKey, typeof MODALITIES[ModalityKey]][]).map(([key, m]) => {
        const active = modality === key;
        return (
          <button
            key={key}
            onClick={() => setModality(key)}
            data-active={active}
            className={`lims-selector-card ${active ? m.bgClass + ' ' + m.borderClass : 'border-border bg-card'}`}
          >
            {active && <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: m.accentHex }} />}
            <div className="text-2xl mb-2">{m.icon}</div>
            <div className={`text-[13px] font-extrabold mb-0.5 ${active ? m.colorClass : 'text-foreground'}`}>{m.name}</div>
            <div className="text-[11px] text-muted-foreground leading-snug">{m.desc}</div>
            {active && (
              <div className="mt-2.5 inline-flex items-center gap-1 rounded-md px-2 py-0.5" style={{ background: m.accentHex }}>
                <span className="text-[10px] font-bold text-primary-foreground">SELECTED</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── LAB SIZE SELECTOR ────────────────────────────────────────────────────────
function LabSizeSelector({ labSize, setLabSize, accentColor }: { labSize: LabSizeKey; setLabSize: (s: LabSizeKey) => void; accentColor: string }) {
  const sizes: { key: LabSizeKey; label: string; sub: string; icon: string; detail: string }[] = [
    { key: "small", label: "Small Lab", sub: "1–2 FTE", icon: "🏠", detail: "< 10,000 tests/yr" },
    { key: "medium", label: "Medium Lab", sub: "3–6 FTE", icon: "🏢", detail: "10k–50k tests/yr" },
    { key: "large", label: "Large Lab", sub: "7–15 FTE", icon: "🏭", detail: "50k+ tests/yr" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {sizes.map(s => {
        const active = labSize === s.key;
        return (
          <button
            key={s.key}
            onClick={() => setLabSize(s.key)}
            data-active={active}
            className={`lims-selector-card ${active ? 'bg-muted' : 'bg-card'}`}
            style={{ borderColor: active ? accentColor : undefined }}
          >
            {active && <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: accentColor }} />}
            <div className="flex justify-between items-start">
              <div className="text-3xl">{s.icon}</div>
              {active && <div className="w-2 h-2 rounded-full mt-1" style={{ background: accentColor }} />}
            </div>
            <div className="text-[15px] font-extrabold mt-2.5 mb-0.5" style={{ color: active ? accentColor : undefined }}>{s.label}</div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">{s.sub}</div>
            <div className="text-[11px] text-lims-muted-text">{s.detail}</div>
          </button>
        );
      })}
    </div>
  );
}

// ─── PLAN SELECTOR ────────────────────────────────────────────────────────────
function PlanSelector({ labSize, planKey, setPlanKey, accentColor, goal }: {
  labSize: LabSizeKey; planKey: string; setPlanKey: (k: string) => void; accentColor: string; goal: GoalKey;
}) {
  const tiers = PLAN_TIERS[labSize];
  const recommended = getRecommendedPlan(labSize, goal);

  return (
    <div className="grid grid-cols-3 gap-3">
      {tiers.map((p) => {
        const active = planKey === p.key;
        const isRec = p.key === recommended;
        return (
          <button
            key={p.key}
            onClick={() => setPlanKey(p.key)}
            data-active={active}
            className={`lims-selector-card ${active ? 'bg-muted' : 'bg-card'}`}
            style={{ borderColor: active ? accentColor : isRec ? accentColor + "55" : undefined }}
          >
            {active && <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: accentColor }} />}
            {isRec && !active && (
              <div className="absolute top-2.5 right-2.5 bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5 text-[9px] font-extrabold text-amber-800 uppercase">
                Auto-match
              </div>
            )}
            {active && (
              <div className="absolute top-2.5 right-2.5 rounded-md px-2 py-0.5 text-[9px] font-extrabold text-primary-foreground uppercase" style={{ background: accentColor }}>
                Selected
              </div>
            )}
            <div className="text-xs font-black tracking-wider mb-1" style={{ color: active ? accentColor : undefined }}>{p.name}</div>
            <div className="text-[22px] font-extrabold mb-0.5" style={{ color: active ? accentColor : undefined }}>
              ${p.monthly.toLocaleString()}<span className="text-xs font-medium text-muted-foreground">/mo</span>
            </div>
            <div className="text-[11px] text-muted-foreground mb-2 leading-snug">{p.desc}</div>
            <div className="text-[10px] text-lims-muted-text">${p.annual.toLocaleString()}/yr + ${p.onboarding.toLocaleString()} onboarding</div>
          </button>
        );
      })}
    </div>
  );
}

// ─── RESULTS PANEL ────────────────────────────────────────────────────────────
function ResultsPanel({ roi, planObj, accentColor = "#6366f1" }: {
  roi: ReturnType<typeof calcROI>; planObj: ReturnType<typeof getPlanByKey>; accentColor?: string;
}) {
  const colors = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444"];
  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        {[
          { label: "Payback Period", value: fmtMos(roi.payback), icon: "⏱" },
          { label: "5-Year Net Benefit", value: fmtK(roi.yr5cum), icon: "📈" },
          { label: "3-Year ROI", value: `${(roi.roi3 * 100).toFixed(0)}%`, icon: "💹" },
          { label: "Annual Net Benefit", value: fmtK(roi.netAnnual), icon: "💰" },
        ].map((m, i) => (
          <div
            key={i}
            className={`lims-metric-card ${i === 0 ? 'border-transparent' : 'bg-muted/50 border-border'}`}
            style={i === 0 ? { background: accentColor, borderColor: 'transparent' } : undefined}
          >
            <div className="text-lg mb-1">{m.icon}</div>
            <div className={`text-xl font-extrabold leading-none ${i === 0 ? 'text-primary-foreground' : 'text-foreground'}`}>{m.value}</div>
            <div className={`text-[11px] mt-1 font-medium ${i === 0 ? 'text-primary-foreground/75' : 'text-muted-foreground'}`}>{m.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-5">
        <p className="lims-label mb-2">Annual Benefit Breakdown</p>
        <div className="lims-breakdown-bar mb-2.5">
          {roi.breakdown.map((b, i) => (
            <div key={i} style={{ width: `${b.pct * 100}%`, background: colors[i], transition: "width 0.5s" }} title={b.label} />
          ))}
        </div>
        {roi.breakdown.map((b, i) => (
          <div key={i} className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: colors[i] }} />
              <span className="text-[11px] text-muted-foreground font-medium">{b.label}</span>
            </div>
            <span className="text-[11px] font-bold text-foreground">{fmtK(b.value)}<span className="text-muted-foreground font-normal">/yr</span></span>
          </div>
        ))}
      </div>

      {planObj && (
        <div className="bg-emerald-50 border-[1.5px] border-emerald-200 rounded-xl p-3.5">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[11px] font-extrabold text-emerald-600 tracking-wide">{planObj.name} PLAN</span>
            <span className="text-sm font-extrabold text-emerald-700">${planObj.monthly.toLocaleString()}/mo</span>
          </div>
          {roi.netAnnual > 0 && (
            <div className="text-[11px] text-emerald-700 font-semibold">
              ✓ Net benefit exceeds plan cost by <strong>{fmtK(roi.netAnnual - planObj.annual)}/yr</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── LOGIC BOX ────────────────────────────────────────────────────────────────
const LOGIC_ITEMS = [
  { title: "Labor Savings", formula: "(FTEs × Salary × % Base Labor Reduction) + (OT hrs/mo × 12 × Hourly Rate × 1.5 × % OT Reduction)", assumption: "Hourly rate = salary ÷ 2,080. Base labor and OT computed separately to prevent double-counting." },
  { title: "Error Reduction", formula: "Volume × Rejection Rate × Cost/Repeat × % Error Reduction", assumption: "Only direct repeat-test cost. Excludes liability. CAP Q-Probes avg: 2–6% rejection rate." },
  { title: "Compliance Savings", formula: "(Audits × Hrs/Audit × % Saved × Hourly Rate) + (CAPA Cost × % CAPA Reduction)", assumption: "CLSI EP23. Does not include revenue loss from failed inspections." },
  { title: "Throughput Revenue", formula: "Volume × TAT Improvement % × 50% Capture Rate × Rev/Test", assumption: "50% capture = conservative. CLMA avg: 15–35% TAT improvement." },
  { title: "Reagent Savings", formula: "Reagent Spend × % Waste Reduction", assumption: "Via lot tracking, expiry alerts, automated ordering. Avg: 8–20%." },
  { title: "Adoption Ramp", formula: "Yr 1 = 60%  |  Yr 2 = 80%  |  Yr 3–5 = 100%", assumption: "Accounts for training curve, workflow re-engineering, and stabilization." },
  { title: "Payback Period", formula: "One-Time Cost ÷ Net Annual Benefit × 12", assumption: "Net annual = gross benefits − all annual recurring costs (incl. license)." },
  { title: "ROI %", formula: "(Total Benefits − Total Costs) ÷ Total Costs × 100", assumption: "Total costs = one-time + annual recurring × years." },
];

function LogicBox() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-[1.5px] border-dashed border-indigo-200 rounded-xl overflow-hidden mt-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full bg-indigo-50 border-none cursor-pointer py-3 px-4 flex justify-between items-center"
      >
        <span className="lims-label text-primary">📐 Calculation Logic & Assumptions</span>
        <span className="text-sm text-primary">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="p-4 bg-indigo-50/30">
          {LOGIC_ITEMS.map((item, i) => (
            <div key={i} className={`${i < LOGIC_ITEMS.length - 1 ? 'mb-3 pb-3 border-b border-indigo-100' : ''}`}>
              <div className="text-xs font-bold text-primary mb-1">{item.title}</div>
              <div className="text-[11px] text-foreground font-mono bg-indigo-50 px-2 py-1 rounded-md mb-1 leading-relaxed">{item.formula}</div>
              <div className="text-[10px] text-lims-muted-text italic">Assumption: {item.assumption}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CALCULATOR LAYOUT ────────────────────────────────────────────────────────
function CalculatorLayout({ goal, accentColor, showThroughput, showCompliance, showAllTabs }: {
  goal: GoalKey; accentColor: string; showThroughput: boolean; showCompliance: boolean; showAllTabs: boolean;
}) {
  const [labSize, setLabSizeRaw] = useState<LabSizeKey>("small");
  const [modality, setModalityRaw] = useState<ModalityKey>("clinical");
  const [planKey, setPlanKeyRaw] = useState(getRecommendedPlan("small", goal));
  const [inp, setInp] = useState<Record<string, number>>(() => {
    const d = buildDefaults("small", "clinical");
    const plan = getPlanByKey("small", getRecommendedPlan("small", goal));
    return { ...d, licenseYr1: plan.annual, onboarding: plan.onboarding };
  });
  const [activeTab, setActiveTab] = useState("errors");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const setLabSize = (s: LabSizeKey) => {
    setLabSizeRaw(s);
    const newKey = getRecommendedPlan(s, goal);
    setPlanKeyRaw(newKey);
    const plan = getPlanByKey(s, newKey);
    const d = buildDefaults(s, modality);
    setInp({ ...d, licenseYr1: plan.annual, onboarding: plan.onboarding });
  };

  const setModality = (m: ModalityKey) => {
    setModalityRaw(m);
    const d = buildDefaults(labSize, m);
    const plan = getPlanByKey(labSize, planKey);
    setInp({ ...d, licenseYr1: plan.annual, onboarding: plan.onboarding });
  };

  const setPlanKey = (k: string) => {
    setPlanKeyRaw(k);
    const plan = getPlanByKey(labSize, k);
    setInp(p => ({ ...p, licenseYr1: plan.annual, onboarding: plan.onboarding }));
  };

  const set = (k: string) => (v: number) => setInp(p => ({ ...p, [k]: v }));

  const roi = calcROI(inp);
  const planObj = getPlanByKey(labSize, planKey);
  const mod = MODALITIES[modality];

  const tabs = [
    { id: "errors", label: "Errors", icon: "🧪" },
    ...(showCompliance ? [{ id: "compliance", label: "Compliance", icon: "📋" }] : []),
    ...(showThroughput ? [{ id: "throughput", label: "Throughput", icon: "📈" }] : []),
    ...(showAllTabs ? [{ id: "investment", label: "Investment", icon: "💼" }] : []),
  ];

  return (
    <div>
      {/* STEP 1: Lab Profile */}
      <div className="lims-card mb-4">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="lims-step-badge" style={{ background: accentColor }}>1</div>
          <div>
            <div className="lims-section-title">Lab Profile</div>
            <div className="lims-section-subtitle">Select your lab's size and testing modality</div>
          </div>
        </div>

        <div className="mb-5">
          <div className="lims-label mb-2.5">Lab Size</div>
          <LabSizeSelector labSize={labSize} setLabSize={setLabSize} accentColor={accentColor} />
        </div>

        <div>
          <div className="lims-label mb-2.5">Testing Modality</div>
          <ModalitySelector modality={modality} setModality={setModality} />
        </div>

        <div className="lims-stat-grid">
          {[
            { label: "Annual Volume", value: inp.volume.toLocaleString(), suffix: "tests" },
            { label: "Revenue/Test", value: `$${inp.revPerTest}`, suffix: "" },
            { label: "FTEs", value: inp.ftes, suffix: "staff" },
            { label: "Reagent Spend", value: fmtK(inp.reagentSpend), suffix: "/yr" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-base font-extrabold" style={{ color: accentColor }}>
                {stat.value}<span className="text-[11px] text-muted-foreground font-medium"> {stat.suffix}</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* STEP 2: Plan Selection */}
      <div className="lims-card mb-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="lims-step-badge" style={{ background: accentColor }}>2</div>
            <div>
              <div className="lims-section-title">Select Your Plan</div>
              <div className="lims-section-subtitle">Pricing auto-matched to your lab size · change anytime</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            <span className="text-[11px] text-amber-800">✨</span>
            <span className="text-[11px] font-bold text-amber-800">Auto-recommended for {labSize} lab</span>
          </div>
        </div>
        <PlanSelector labSize={labSize} planKey={planKey} setPlanKey={setPlanKey} accentColor={accentColor} goal={goal} />
      </div>

      {/* STEP 3: Inputs + Results side by side */}
      <div className="grid grid-cols-[1fr_360px] gap-4">
        <div>
          {/* Core inputs */}
          <div className="lims-card mb-4">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="lims-step-badge" style={{ background: accentColor }}>3</div>
              <div>
                <div className="lims-section-title">Key Inputs</div>
                <div className="lims-section-subtitle">Industry benchmarks pre-filled · override with your data</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <InputField label="Annual Test Volume" value={inp.volume} onChange={set("volume")} suffix="tests/yr" min={1000} step={500} />
              <InputField label="Avg Revenue / Test" value={inp.revPerTest} onChange={set("revPerTest")} prefix="$" min={10} step={5} note={`${mod.name} default`} />
              <InputField label="Number of FTEs" value={inp.ftes} onChange={set("ftes")} suffix="staff" min={0.5} step={0.5} />
              <InputField label="Avg FTE Salary" value={inp.salary} onChange={set("salary")} prefix="$" min={30000} step={1000} note="Fully-loaded" />
              <InputField label="Annual Revenue" value={Math.round(inp.volume * inp.revPerTest)} onChange={() => {}} prefix="$" readOnly note="Auto-calc" />
              <InputField label="Annual Reagent Spend" value={inp.reagentSpend} onChange={set("reagentSpend")} prefix="$" step={5000} />
            </div>

            <SliderInput label="Base Labor Time Reduction" value={inp.laborPct} onChange={set("laborPct")} min={0.3} max={0.8} note="CAP/CLMA: 50–65% post-LIMS. Applied to base salary only." accentColor={accentColor} />
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Monthly OT Hours" value={inp.otHrs} onChange={set("otHrs")} suffix="hrs/mo" min={0} />
              <InputField label="OT Reduction %" value={Math.round(inp.otPct * 100)} onChange={v => set("otPct")(v / 100)} suffix="%" min={10} max={70} note="Avg 35–55%" />
            </div>
          </div>

          {/* Advanced accordion */}
          <div className="lims-card !p-0 overflow-hidden mb-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`w-full border-none cursor-pointer py-4 px-6 flex justify-between items-center ${showAdvanced ? 'bg-muted/50' : 'bg-card'}`}
            >
              <div className="flex items-center gap-2.5">
                <div className="lims-step-badge" style={{ background: showAdvanced ? accentColor : 'hsl(var(--muted))' }}>
                  <span style={{ color: showAdvanced ? '#fff' : 'hsl(var(--lims-muted-text))' }}>4</span>
                </div>
                <div className="text-left">
                  <div className="lims-section-title">Advanced Details</div>
                  <div className="lims-section-subtitle">Fine-tune error rates, compliance, throughput & investment costs</div>
                </div>
              </div>
              <div
                className="rounded-lg px-3 py-1.5 text-[11px] font-bold"
                style={{ background: showAdvanced ? accentColor : 'hsl(var(--muted))', color: showAdvanced ? '#fff' : 'hsl(var(--lims-label))' }}
              >
                {showAdvanced ? "▲ Collapse" : "▼ Expand"}
              </div>
            </button>
            {showAdvanced && (
              <div className="border-t border-border">
                <div className="flex border-b border-border overflow-x-auto">
                  {tabs.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className="py-2.5 px-4 border-none cursor-pointer whitespace-nowrap text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors"
                      style={{
                        background: activeTab === t.id ? 'hsl(var(--muted))' : 'transparent',
                        borderBottomColor: activeTab === t.id ? accentColor : 'transparent',
                        color: activeTab === t.id ? accentColor : 'hsl(var(--lims-label))',
                      }}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
                <div className="p-6">
                  {activeTab === "errors" && (
                    <div>
                      <p className="mb-4 text-[11px] text-muted-foreground italic">Verify with your LIS/QC system data</p>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <InputField label="Rejection Rate" value={Math.round(inp.rejectionRate * 1000) / 10} onChange={v => set("rejectionRate")(v / 100)} suffix="%" min={0.5} max={15} step={0.1} note="CAP avg 2–6%" />
                        <InputField label="Cost per Repeat" value={inp.costPerRepeat} onChange={set("costPerRepeat")} prefix="$" min={10} note="Reagent + FTE" />
                        <InputField label="Error Reduction %" value={Math.round(inp.errorReductionPct * 100)} onChange={v => set("errorReductionPct")(v / 100)} suffix="%" min={30} max={90} note="Avg 45–65%" />
                      </div>
                      <div className="p-3.5 bg-red-50 rounded-xl border border-red-200">
                        <div className="text-[10px] font-bold text-destructive mb-1 uppercase">Annual Error Cost (Pre-LIMS)</div>
                        <div className="text-lg font-extrabold text-red-900">{fmt(inp.volume * inp.rejectionRate * inp.costPerRepeat)}</div>
                        <div className="text-[11px] text-destructive mt-0.5">Savings potential: <strong>{fmt(roi.errorSavings)}/yr</strong></div>
                      </div>
                    </div>
                  )}
                  {activeTab === "compliance" && (
                    <div>
                      <p className="mb-4 text-[11px] text-muted-foreground italic">CLIA/CAP inspection defaults pre-filled</p>
                      <div className="grid grid-cols-2 gap-3">
                        <InputField label="Audits per Year" value={inp.audits} onChange={set("audits")} suffix="audits" min={1} max={10} note="CLIA, CAP, DOH" />
                        <InputField label="Hours per Audit" value={inp.auditHrs} onChange={set("auditHrs")} suffix="hrs" min={5} max={200} note="Avg 20–160 hrs" />
                        <InputField label="Audit Time Saved %" value={Math.round(inp.auditSavePct * 100)} onChange={v => set("auditSavePct")(v / 100)} suffix="%" min={20} max={75} note="LIMS avg 40–65%" />
                        <InputField label="Annual CAPA Costs" value={inp.capaCost} onChange={set("capaCost")} prefix="$" min={0} step={500} note="Corrective actions" />
                      </div>
                      <SliderInput label="CAPA Reduction %" value={inp.capaReductionPct} onChange={set("capaReductionPct")} min={0.2} max={0.7} note="Industry avg 35–60%" accentColor={accentColor} />
                    </div>
                  )}
                  {activeTab === "throughput" && (
                    <div>
                      <p className="mb-4 text-[11px] text-muted-foreground italic">CLMA LIMS Impact Study benchmarks</p>
                      <SliderInput label="TAT Improvement %" value={inp.tatImprovement} onChange={set("tatImprovement")} min={0.05} max={0.50} note="CLMA avg 15–35%. 50% capture rate applied." accentColor={accentColor} />
                      <SliderInput label="Reagent Waste Reduction %" value={inp.reagentWastePct} onChange={set("reagentWastePct")} min={0.05} max={0.25} note="Avg 8–20% via lot tracking & expiry alerts." accentColor={accentColor} />
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                          <div className="text-[10px] font-bold text-emerald-600 uppercase">Throughput Revenue</div>
                          <div className="text-xl font-extrabold text-emerald-900 mt-1">{fmtK(roi.throughputGain)}<span className="text-[11px]">/yr</span></div>
                        </div>
                        <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200">
                          <div className="text-[10px] font-bold text-blue-600 uppercase">Reagent Savings</div>
                          <div className="text-xl font-extrabold text-blue-900 mt-1">{fmtK(roi.reagentSavings)}<span className="text-[11px]">/yr</span></div>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === "investment" && (
                    <div>
                      <p className="mb-3 text-[11px] text-muted-foreground italic">Pre-filled from plan · adjust to match your quote</p>
                      <h4 className="lims-label mb-2.5">Annual Recurring</h4>
                      <div className="grid grid-cols-2 gap-2.5 mb-4">
                        <InputField label="Annual License Fee" value={inp.licenseYr1} onChange={set("licenseYr1")} prefix="$" step={1000} note="Every year" />
                        <InputField label="Maintenance" value={inp.maintenance} onChange={set("maintenance")} prefix="$" step={500} />
                        <InputField label="IT Overhead" value={inp.itOverhead} onChange={set("itOverhead")} prefix="$" step={500} />
                        <InputField label="Retraining" value={inp.retraining} onChange={set("retraining")} prefix="$" step={250} />
                      </div>
                      <h4 className="lims-label mb-2.5">One-Time Implementation</h4>
                      <div className="grid grid-cols-2 gap-2.5">
                        <InputField label="Onboarding" value={inp.onboarding} onChange={set("onboarding")} prefix="$" step={500} />
                        <InputField label="Implementation" value={inp.impl} onChange={set("impl")} prefix="$" step={1000} />
                        <InputField label="Data Migration" value={inp.migration} onChange={set("migration")} prefix="$" step={1000} />
                        <InputField label="Hardware / IT" value={inp.hardware} onChange={set("hardware")} prefix="$" step={500} />
                        <InputField label="Training" value={inp.training} onChange={set("training")} prefix="$" step={500} />
                      </div>
                      <div className="mt-3.5 p-3 bg-muted/50 rounded-xl flex justify-between">
                        <div><span className="text-[11px] text-muted-foreground">One-Time Total:</span> <strong className="text-foreground">{fmt(roi.oneTimeCost)}</strong></div>
                        <div><span className="text-[11px] text-muted-foreground">Annual Ongoing:</span> <strong className="text-foreground">{fmt(roi.annualOngoing)}</strong></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 5-Year Cash Flow */}
          {showAllTabs && (
            <div className="lims-card">
              <h3 className="lims-label mb-4">📅 5-Year Cash Flow</h3>
              <div className="overflow-x-auto">
                <table className="lims-cashflow-table">
                  <thead>
                    <tr className="bg-muted/50">
                      {["", "Yr 0", "Yr 1", "Yr 2", "Yr 3", "Yr 4", "Yr 5"].map((h, i) => (
                        <td key={i} className={`font-bold text-muted-foreground border-b-2 border-border ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</td>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "One-time investment", vals: [-roi.oneTimeCost, 0, 0, 0, 0, 0] },
                      { label: "Annual ongoing costs", vals: [0, -roi.annualOngoing, -roi.annualOngoing, -roi.annualOngoing, -roi.annualOngoing, -roi.annualOngoing] },
                      { label: "Gross benefits (ramp)", vals: [0, roi.totalBenefits * 0.6, roi.totalBenefits * 0.8, roi.totalBenefits, roi.totalBenefits, roi.totalBenefits] },
                      { label: "Net cash flow", vals: [-roi.oneTimeCost, roi.totalBenefits * 0.6 - roi.annualOngoing, roi.totalBenefits * 0.8 - roi.annualOngoing, roi.netAnnual, roi.netAnnual, roi.netAnnual], bold: true },
                    ].map((row, i) => (
                      <tr key={i} className={`border-b border-border ${row.bold ? 'bg-muted/30' : ''}`}>
                        <td className={`text-muted-foreground ${row.bold ? 'font-bold' : ''}`}>{row.label}</td>
                        {row.vals.map((v, j) => (
                          <td key={j} className={`text-right ${row.bold ? 'font-bold' : 'font-medium'}`}
                            style={{ color: v < 0 ? '#dc2626' : v > 0 ? '#16a34a' : undefined }}>
                            {v === 0 ? "—" : fmtK(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2.5 text-[10px] text-muted-foreground italic">
                Yr 1 = 60%, Yr 2 = 80%, Yr 3–5 = 100% of full benefits. Annual ongoing includes license every year.
              </p>
            </div>
          )}

          <LogicBox />
        </div>

        {/* Sticky results panel */}
        <div className="self-start sticky top-4">
          <div className="lims-card mb-4">
            <h3 className="lims-label mb-4">📊 Your ROI Results</h3>
            <ResultsPanel roi={roi} planObj={planObj} accentColor={accentColor} />
          </div>
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="m-0 text-[11px] text-amber-800 leading-relaxed">
              <strong>Sources:</strong> CAP Q-Probes, CLMA, CLSI EP23, BLS 2024, CMS. Estimates for planning only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function LimsCalculator() {
  const [goal, setGoal] = useState<GoalKey>("A");

  const goals = [
    {
      id: "A" as GoalKey,
      icon: "⚡",
      label: "Base",
      sub: "Efficiency & Savings",
      desc: "Reduce labor time, cut error costs, streamline compliance",
      color: "#4338ca",
      bg: "linear-gradient(135deg, #312e81 0%, #4338ca 60%, #6366f1 100%)",
    },
    {
      id: "B" as GoalKey,
      icon: "📈",
      label: "Growth",
      sub: "Revenue & Throughput",
      desc: "Increase test volume, improve TAT, grow top-line revenue",
      color: "#059669",
      bg: "linear-gradient(135deg, #064e3b 0%, #059669 60%, #34d399 100%)",
    },
    {
      id: "C" as GoalKey,
      icon: "🏆",
      label: "Enterprise",
      sub: "Full ROI Model",
      desc: "All five benefit categories — boardroom-ready business case",
      color: "#7c3aed",
      bg: "linear-gradient(135deg, #1e1b4b 0%, #7e22ce 60%, #a855f7 100%)",
    },
  ];

  const active = goals.find(g => g.id === goal)!;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero header */}
      <div className="pt-9 px-7 text-primary-foreground" style={{ background: active.bg }}>
        <div className="max-w-[1060px] mx-auto">
          <div className="text-center mb-8">
            <div className="text-[11px] font-bold tracking-[0.14em] uppercase text-primary-foreground/50 mb-2">LIMS Platform</div>
            <h1 className="m-0 mb-2.5 text-4xl font-black tracking-tight text-primary-foreground">ROI Calculator</h1>
            <p className="m-0 text-primary-foreground/70 text-[15px]">Choose your goal — we'll auto-match the right plan and inputs</p>
          </div>

          {/* Goal selector */}
          <div className="grid grid-cols-3 gap-3 pb-0">
            {goals.map(g => {
              const isActive = goal === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  data-active={isActive}
                  className="lims-goal-tab"
                >
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                      style={{ background: isActive ? g.color : "rgba(255,255,255,0.2)" }}
                    >
                      {g.icon}
                    </div>
                    <div>
                      <div
                        className="text-[11px] font-extrabold uppercase tracking-wider"
                        style={{ color: isActive ? g.color : "rgba(255,255,255,0.5)" }}
                      >
                        Goal
                      </div>
                      <div
                        className="text-[17px] font-black"
                        style={{ color: isActive ? "hsl(var(--foreground))" : "#fff" }}
                      >
                        {g.label}
                      </div>
                    </div>
                    {isActive && <div className="ml-auto w-2 h-2 rounded-full" style={{ background: g.color }} />}
                  </div>
                  <div
                    className="text-xs leading-relaxed"
                    style={{ color: isActive ? "hsl(var(--lims-sublabel))" : "rgba(255,255,255,0.65)" }}
                  >
                    {g.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-[1060px] mx-auto py-6 px-7 pb-10">
        {goal === "A" && <CalculatorLayout goal="A" accentColor="#4338ca" showThroughput={false} showCompliance={true} showAllTabs={false} />}
        {goal === "B" && <CalculatorLayout goal="B" accentColor="#059669" showThroughput={true} showCompliance={false} showAllTabs={false} />}
        {goal === "C" && <CalculatorLayout goal="C" accentColor="#7c3aed" showThroughput={true} showCompliance={true} showAllTabs={true} />}
      </div>

      {/* Footer */}
      <div className="max-w-[1060px] mx-auto mb-8 px-7">
        <div className="lims-footer">
          <p>
            Benchmarks from CAP Q-Probes, CLMA, CLSI EP23, BLS, and CMS. Results are estimates for planning purposes only.
            Actual ROI depends on implementation quality, staff adoption, and workflow complexity.
          </p>
        </div>
      </div>
    </div>
  );
}
