import { useEffect, useState } from "react";
import OsmBuildingPicker from "./OsmBuildingPicker";
import { getPropertyMetrics } from "../lib/propertyMetrics";

const initialDraft = {
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

function SelectField({ label, value, onChange, children }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <select
        value={value}
        onChange={onChange}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft"
      >
        {children}
      </select>
    </label>
  );
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

export default function BriefingAssumptionsPanel({ leadData, loading, onRegenerate }) {
  const [draft, setDraft] = useState(initialDraft);
  const propertyMetrics = getPropertyMetrics(draft);

  useEffect(() => {
    setDraft({ ...initialDraft, ...leadData });
  }, [leadData]);

  async function handleSubmit(event) {
    event.preventDefault();
    await onRegenerate(draft);
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel sm:p-8">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-deep">
          Report assumptions
        </p>
        <h3 className="mt-2 text-xl font-semibold text-slate-900">Edit selections and refresh the report</h3>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <label className="grid gap-2 sm:col-span-2 xl:col-span-3">
          <span className="text-sm font-semibold text-slate-700">Address</span>
          <textarea
            rows="2"
            value={draft.address}
            onChange={(event) => setDraft((current) => ({ ...current, address: event.target.value }))}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft"
            placeholder="14 Lindenstrasse, Berlin, Germany"
          />
        </label>

        <InputField
          label="Postcode *"
          type="text"
          value={draft.postcode}
          onChange={(event) => setDraft((current) => ({ ...current, postcode: event.target.value }))}
          required
        />

        <SelectField
          label="Product interest *"
          value={draft.productInterest}
          onChange={(event) => setDraft((current) => ({ ...current, productInterest: event.target.value }))}
        >
          <option>Solar panels</option>
          <option>Heat pump</option>
          <option>Battery storage</option>
          <option>Full bundle (solar + battery + heat pump)</option>
        </SelectField>

        <SelectField
          label="Household size"
          value={draft.householdSize}
          onChange={(event) => setDraft((current) => ({ ...current, householdSize: event.target.value }))}
        >
          <option value="">Select</option>
          <option>1-2 people</option>
          <option>3-4 people</option>
          <option>5+ people</option>
        </SelectField>

        <InputField
          label="Customer age"
          type="number"
          min="18"
          max="100"
          value={draft.customerAge}
          onChange={(event) => setDraft((current) => ({ ...current, customerAge: event.target.value }))}
        />

        <SelectField
          label="House build year"
          value={draft.houseBuildYear}
          onChange={(event) => setDraft((current) => ({ ...current, houseBuildYear: event.target.value }))}
        >
          <option value="">Select</option>
          <option>Before 1980</option>
          <option>1980-2000</option>
          <option>2000-2015</option>
          <option>After 2015</option>
        </SelectField>

        <SelectField
          label="Existing heating"
          value={draft.existingHeating}
          onChange={(event) => setDraft((current) => ({ ...current, existingHeating: event.target.value }))}
        >
          <option value="">Select</option>
          <option>Gas</option>
          <option>Oil</option>
          <option>District heating</option>
          <option>Heat pump already</option>
        </SelectField>

        <SelectField
          label="Existing assets"
          value={draft.existingAssets}
          onChange={(event) => setDraft((current) => ({ ...current, existingAssets: event.target.value }))}
        >
          <option value="">Select</option>
          <option>None</option>
          <option>Has solar</option>
          <option>Has solar + battery</option>
        </SelectField>

        <InputField
          label="Monthly energy bill in €"
          type="text"
          value={propertyMetrics.electricityMonthlyCost ? String(propertyMetrics.electricityMonthlyCost) : ""}
          readOnly
          disabled
        />

        <SelectField
          label="House type"
          value={draft.houseType}
          onChange={(event) => setDraft((current) => ({ ...current, houseType: event.target.value }))}
        >
          <option value="">Select</option>
          <option>Detached house</option>
          <option>Semi-detached house</option>
          <option>Terraced / row house</option>
          <option>Multi-family house</option>
          <option>Bungalow</option>
        </SelectField>

        <SelectField
          label="Floors"
          value={draft.floors}
          onChange={(event) => setDraft((current) => ({ ...current, floors: event.target.value }))}
        >
          <option value="">Select</option>
          <option>1 floor</option>
          <option>2 floors</option>
          <option>3 floors</option>
          <option>4+ floors</option>
        </SelectField>

        <SelectField
          label="Electricity usage"
          value={draft.electricityUsageTime}
          onChange={(event) => setDraft((current) => ({ ...current, electricityUsageTime: event.target.value }))}
        >
          <option value="">Select</option>
          <option>Mostly morning</option>
          <option>Mostly midday</option>
          <option>Mostly afternoon</option>
          <option>Mostly evening</option>
          <option>Balanced through the day</option>
        </SelectField>

        <div className="sm:col-span-2 xl:col-span-3">
          <OsmBuildingPicker
            value={draft}
            onChange={setDraft}
            compact
            title="Roof area"
            description="Search the address, then draw the roof outline manually on the map."
          />
        </div>

        <div className="sm:col-span-2 xl:col-span-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(29,62,255,0.2)] disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {loading ? "Refreshing report..." : "Apply changes and regenerate"}
          </button>
        </div>
      </form>
    </section>
  );
}
