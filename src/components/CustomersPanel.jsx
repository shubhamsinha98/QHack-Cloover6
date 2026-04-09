import { useState } from "react";
import PropertyIntakePanel from "./PropertyIntakePanel";
import OsmBuildingPicker from "./OsmBuildingPicker";

const emptyLead = {
  address: "",
  postcode: "",
  productInterest: "Solar panels",
  householdSize: "",
  customerAge: "",
  houseBuildYear: "",
  existingHeating: "",
  existingAssets: "",
  monthlyEnergyBill: "",
  customerConcerns: "",
  houseType: "",
  roofType: "",
  floors: "",
  electricityUsageTime: "",
  roofSearchQuery: "",
  roofSearchResult: "",
  roofSearchLat: "",
  roofSearchLng: "",
  roofSelectionMode: "manual",
  roofBuildingId: "",
  roofBuildingLabel: "",
  roofPolygon: [],
  roofFootprintAreaM2: "",
  roofSurfaceAreaM2: "",
  usableRoofPct: 75,
  usableRoofAreaM2: "",
};

function generateCustomerCode() {
  const randomPart = crypto.getRandomValues(new Uint32Array(1))[0]
    .toString(36)
    .slice(0, 6)
    .toUpperCase();

  return `CLV-${randomPart}`;
}

function InputField({ label, ...props }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        {...props}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft"
      />
    </label>
  );
}

export default function CustomersPanel({ currentUser, onAddCustomer }) {
  const [form, setForm] = useState(emptyLead);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await onAddCustomer({
        id: `customer-${Date.now()}`,
        customerCode: generateCustomerCode(),
        ...form,
      });
      setForm(emptyLead);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="grid gap-5">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-deep">
          Customer workspace
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          New customer intake
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {currentUser.name}, combine core customer details with the frontend property questionnaire in one compact form, then generate the report directly into the briefing workspace.
        </p>
      </div>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
        <form onSubmit={handleSubmit} className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Customer details</h3>
            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  label="Postcode *"
                  type="text"
                  placeholder="74238"
                  value={form.postcode}
                  onChange={(event) => setForm((current) => ({ ...current, postcode: event.target.value }))}
                  required
                />
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Address</span>
                <textarea
                  rows="3"
                  placeholder="14 Lindenstrasse, Berlin, Germany"
                  value={form.address}
                  onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft"
                  required
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">Product interest *</span>
                  <select
                    value={form.productInterest}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, productInterest: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft"
                    required
                  >
                    <option>Solar panels</option>
                    <option>Heat pump</option>
                    <option>Battery storage</option>
                    <option>Full bundle (solar + battery + heat pump)</option>
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">Household size</span>
                  <select
                    value={form.householdSize}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, householdSize: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft"
                  >
                    <option value="">Select</option>
                    <option>1-2 people</option>
                    <option>3-4 people</option>
                    <option>5+ people</option>
                  </select>
                </label>

                <InputField
                  label="Customer age"
                  type="number"
                  min="18"
                  max="100"
                  placeholder="56"
                  value={form.customerAge}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, customerAge: event.target.value }))
                  }
                />

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">House build year</span>
                  <select
                    value={form.houseBuildYear}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, houseBuildYear: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft"
                  >
                    <option value="">Select</option>
                    <option>Before 1980</option>
                    <option>1980-2000</option>
                    <option>2000-2015</option>
                    <option>After 2015</option>
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">Existing heating</span>
                  <select
                    value={form.existingHeating}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, existingHeating: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft"
                  >
                    <option value="">Select</option>
                    <option>Gas</option>
                    <option>Oil</option>
                    <option>District heating</option>
                    <option>Heat pump already</option>
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">Existing assets</span>
                  <select
                    value={form.existingAssets}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, existingAssets: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft"
                  >
                    <option value="">Select</option>
                    <option>None</option>
                    <option>Has solar</option>
                    <option>Has solar + battery</option>
                  </select>
                </label>

              </div>

            </div>

            <button
              disabled={submitting}
              className="mt-5 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(29,62,255,0.2)] disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {submitting ? "Saving and generating report..." : "Save customer and generate report"}
            </button>
          </div>
          <PropertyIntakePanel value={form} onChange={setForm} />
          <div className="xl:col-span-2">
            <OsmBuildingPicker value={form} onChange={setForm} />
          </div>
        </form>
      </section>
    </section>
  );
}
