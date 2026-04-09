import { useState } from "react";

const defaultForm = {
  postcode: "",
  productInterest: "Solar panels",
  householdSize: "",
  houseBuildYear: "",
  roofDirection: "",
  existingHeating: "",
  existingAssets: "",
  monthlyEnergyBill: "",
  budgetSignal: "",
};

const selectClassName =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand-soft";

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint ? <span className="mt-2 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  );
}

export default function LeadInput({ initialValues = defaultForm, loading, onGenerate }) {
  const [formData, setFormData] = useState({ ...defaultForm, ...initialValues });
  const [showMore, setShowMore] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!formData.postcode.trim()) {
      return;
    }

    onGenerate({
      ...formData,
      postcode: formData.postcode.trim(),
    });
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel sm:p-8">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-deep">
              New lead briefing
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Capture the lead in under a minute.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Cloover turns basic household details into a financing-ready brief for
              solar, heat-pump, battery, and bundle conversations across Germany.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Postcode">
                <input
                  className={selectClassName}
                  type="text"
                  name="postcode"
                  value={formData.postcode}
                  onChange={handleChange}
                  placeholder="e.g. 74238"
                  required
                />
              </Field>

              <Field label="Product interest">
                <select
                  className={selectClassName}
                  name="productInterest"
                  value={formData.productInterest}
                  onChange={handleChange}
                >
                  <option>Solar panels</option>
                  <option>Heat pump</option>
                  <option>Battery storage</option>
                  <option>Full bundle (solar + battery + heat pump)</option>
                </select>
              </Field>
            </div>

            <button
              type="button"
              onClick={() => setShowMore((current) => !current)}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-brand-line hover:bg-brand-soft"
            >
              <span>Add more details</span>
              <span className="text-brand-deep">{showMore ? "Hide" : "Show"}</span>
            </button>

            {showMore ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Household size">
                  <select
                    className={selectClassName}
                    name="householdSize"
                    value={formData.householdSize}
                    onChange={handleChange}
                  >
                    <option value="">Select</option>
                    <option>1-2 people</option>
                    <option>3-4 people</option>
                    <option>5+ people</option>
                  </select>
                </Field>

                <Field label="House build year">
                  <select
                    className={selectClassName}
                    name="houseBuildYear"
                    value={formData.houseBuildYear}
                    onChange={handleChange}
                  >
                    <option value="">Select</option>
                    <option>Before 1980</option>
                    <option>1980-2000</option>
                    <option>2000-2015</option>
                    <option>After 2015</option>
                  </select>
                </Field>

                <Field label="Roof direction">
                  <select
                    className={selectClassName}
                    name="roofDirection"
                    value={formData.roofDirection}
                    onChange={handleChange}
                  >
                    <option value="">Select</option>
                    <option>South-facing</option>
                    <option>East-West</option>
                    <option>Flat roof</option>
                  </select>
                </Field>

                <Field label="Existing heating">
                  <select
                    className={selectClassName}
                    name="existingHeating"
                    value={formData.existingHeating}
                    onChange={handleChange}
                  >
                    <option value="">Select</option>
                    <option>Gas</option>
                    <option>Oil</option>
                    <option>District heating</option>
                    <option>Heat pump already</option>
                  </select>
                </Field>

                <Field label="Existing assets">
                  <select
                    className={selectClassName}
                    name="existingAssets"
                    value={formData.existingAssets}
                    onChange={handleChange}
                  >
                    <option value="">Select</option>
                    <option>None</option>
                    <option>Has solar</option>
                    <option>Has solar + battery</option>
                  </select>
                </Field>

                <Field label="Monthly energy bill in €">
                  <input
                    className={selectClassName}
                    type="number"
                    min="0"
                    name="monthlyEnergyBill"
                    value={formData.monthlyEnergyBill}
                    onChange={handleChange}
                    placeholder="180"
                  />
                </Field>

                <Field label="Budget signal">
                  <select
                    className={selectClassName}
                    name="budgetSignal"
                    value={formData.budgetSignal}
                    onChange={handleChange}
                  >
                    <option value="">Select</option>
                    <option>Ready to pay cash</option>
                    <option>Open to financing</option>
                    <option>Tight budget</option>
                  </select>
                </Field>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading || !formData.postcode.trim()}
              className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-brand px-5 py-4 text-base font-semibold text-white transition hover:bg-brand-deep disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {loading ? <Spinner /> : null}
              <span>{loading ? "Generating briefing..." : "Generate briefing →"}</span>
            </button>
          </form>
        </div>

        <aside className="rounded-[28px] border border-brand-line bg-slate-900 p-6 text-white shadow-panel sm:p-8">
          <div className="flex h-full flex-col justify-between">
            <div>
              <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
                In the field
              </div>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight">
                Built for the 15 minutes before a homeowner meeting.
              </h3>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                Reps can move from a postcode and product signal to a structured sales
                document with realistic offer tiers, financing paths, and urgency
                talking points tuned to the German market.
              </p>
            </div>

            <div className="mt-8 grid gap-4">
              {[
                "Localized market context and subsidy signals",
                "Starter, Recommended, and Full Independence tiering",
                "Objection-ready scripts for financing, timing, and trust",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-100"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
