const HOUSE_TYPE_OPTIONS = [
  "Detached house",
  "Semi-detached house",
  "Terraced / row house",
  "Multi-family house",
  "Bungalow",
];

const ROOF_TYPE_OPTIONS = [
  "Flat roof",
  "Slightly pitched roof",
  "Steep pitch roof",
];

const FLOOR_OPTIONS = ["1 floor", "2 floors", "3 floors", "4+ floors"];
const PERSON_OPTIONS = ["1-2 people", "3-4 people", "5+ people"];
const ELECTRICITY_USAGE_OPTIONS = [
  "Mostly morning",
  "Mostly midday",
  "Mostly afternoon",
  "Mostly evening",
  "Balanced through the day",
];

const FIELD_CONFIG = [
  { key: "houseType", title: "House type", options: HOUSE_TYPE_OPTIONS },
  { key: "roofType", title: "Roof type", options: ROOF_TYPE_OPTIONS },
  { key: "floors", title: "Floors", options: FLOOR_OPTIONS },
  { key: "householdSize", title: "Household size", options: PERSON_OPTIONS },
  { key: "electricityUsageTime", title: "Electricity usage", options: ELECTRICITY_USAGE_OPTIONS },
];

export default function PropertyIntakePanel({ value, onChange }) {
  function updateField(key, nextValue) {
    onChange({
      ...value,
      [key]: nextValue,
    });
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,252,0.92))] p-6 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-deep">
            Property intake
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Frontend questionnaire</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          Compact mode
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {FIELD_CONFIG.map((field) => {
          const storedValue = value[field.key] || "";

          return (
            <label key={field.key} className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">{field.title}</span>
              <select
                value={storedValue}
                onChange={(event) => updateField(field.key, event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft"
              >
                <option value="">Select</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>

      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Summary</p>
        <div className="mt-3 grid gap-1 text-sm text-slate-600">
          <div>House type: {value.houseType || "Not set"}</div>
          <div>Roof type: {value.roofType || "Not set"}</div>
          <div>Floors: {value.floors || "Not set"}</div>
          <div>Household size: {value.householdSize || "Not set"}</div>
          <div>Electricity usage: {value.electricityUsageTime || "Not set"}</div>
        </div>
      </div>
    </section>
  );
}
