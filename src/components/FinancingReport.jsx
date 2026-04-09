import { useEffect, useMemo, useState } from "react";
import { getPropertyMetrics } from "../lib/propertyMetrics";
import { getRecommendedTier } from "../lib/offers";

function formatCurrency(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "€0";
  }

  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function MetricTile({ label, value, note }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-slate-900">{value}</p>
      {note ? <p className="mt-2 text-xs leading-5 text-slate-500">{note}</p> : null}
    </div>
  );
}

function SectionTitle({ eyebrow, title, description, action }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-deep">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function InvoiceLine({ label, value, calculation, strong = false }) {
  return (
    <div className="flex flex-col gap-2 border-t border-slate-200 py-3 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-4">
        <div className={`text-sm ${strong ? "font-semibold text-slate-900" : "text-slate-700"}`}>{label}</div>
        <div className={`text-right text-sm ${strong ? "font-semibold text-slate-900" : "font-medium text-slate-800"}`}>{value}</div>
      </div>
      {calculation ? <div className="text-xs leading-5 text-slate-500">{calculation}</div> : null}
    </div>
  );
}

function NumberInput({ label, value, onChange, suffix, step = "1", min = "0", max }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
          className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none"
        />
        {suffix ? <span className="text-sm text-slate-500">{suffix}</span> : null}
      </div>
    </label>
  );
}

function getYearlyNetSavingsSeries(selectedOffer, financingForTier) {
  if (!selectedOffer || !financingForTier) {
    return [];
  }

  const annualSavings = selectedOffer.annual_savings_eur || 0;
  const netCost = financingForTier.net_cost_after_subsidy || 0;

  return Array.from({ length: 10 }, (_, index) => ({
    year: index + 1,
    netSavings: annualSavings * (index + 1) - netCost,
  }));
}

function YearlySavingsChart({ data }) {
  if (!data.length) {
    return null;
  }

  const values = data.map((item) => item.netSavings);
  const maxAbsValue = Math.max(...values.map((value) => Math.abs(value)), 1);

  return (
    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">10-year net savings view</h4>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Cumulative net savings versus doing nothing from year 1 to year 10.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {data.map((item) => (
          <div key={item.year} className="grid gap-3 lg:grid-cols-[68px_minmax(0,1fr)] lg:items-center">
            <div className="text-sm font-semibold text-slate-700">Year {item.year}</div>
            <div className="flex items-center gap-3">
              <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-white">
                <div
                  className={`absolute left-0 top-0 h-full rounded-full bg-brand ${item.netSavings < 0 ? "opacity-40" : ""}`}
                  style={{ width: `${Math.max((Math.abs(item.netSavings) / maxAbsValue) * 100, 4)}%` }}
                />
              </div>
              <div className="w-28 text-right text-sm font-semibold text-slate-900">{formatCurrency(item.netSavings)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getEquipmentWeight(asset) {
  const lower = String(asset || "").toLowerCase();
  if (lower.includes("heat pump")) return 0.45;
  if (lower.includes("battery")) return 0.25;
  if (lower.includes("solar")) return 0.3;
  return 0.2;
}

function getEquipmentBreakdown(assets, grossCost) {
  if (!assets?.length || typeof grossCost !== "number") {
    return [];
  }

  const weights = assets.map((asset) => ({ asset, weight: getEquipmentWeight(asset) }));
  const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0) || 1;

  return weights.map((item, index) => {
    const raw = (grossCost * item.weight) / totalWeight;
    const amount =
      index === weights.length - 1
        ? grossCost -
          weights.slice(0, -1).reduce((sum, current) => {
            return sum + Math.round((grossCost * current.weight) / totalWeight);
          }, 0)
        : Math.round(raw);

    return { label: item.asset, amount };
  });
}

function calculateMonthlyPayment(principal, annualRatePct, termYears) {
  if (!principal || !termYears) {
    return 0;
  }

  const monthlyRate = annualRatePct / 100 / 12;
  const totalMonths = termYears * 12;

  if (!monthlyRate) {
    return principal / totalMonths;
  }

  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -totalMonths));
}

function calculatePrincipalForTargetPayment(monthlyPayment, annualRatePct, termYears) {
  if (!monthlyPayment || !termYears) {
    return 0;
  }

  const monthlyRate = annualRatePct / 100 / 12;
  const totalMonths = termYears * 12;

  if (!monthlyRate) {
    return monthlyPayment * totalMonths;
  }

  return monthlyPayment * ((1 - Math.pow(1 + monthlyRate, -totalMonths)) / monthlyRate);
}

function findSmallestAffordableTerm(principal, annualRatePct, maxTermYears, targetMonthlyPayment) {
  if (!principal) {
    return 1;
  }

  for (let years = 1; years <= maxTermYears; years += 1) {
    if (calculateMonthlyPayment(principal, annualRatePct, years) <= targetMonthlyPayment) {
      return years;
    }
  }

  return maxTermYears;
}

function getMaxFinanceTerm(customerAge) {
  const age = Number(customerAge);

  if (!age || age < 56) {
    return 25;
  }

  return Math.max(Math.min(25, 80 - age), 1);
}

export default function FinancingReport({ customer, leadData, briefing, onBack }) {
  const [selectedTier, setSelectedTier] = useState("");
  const [paymentMode, setPaymentMode] = useState("upfront");
  const [partialUpfront, setPartialUpfront] = useState("");
  const [partialFinanceAmount, setPartialFinanceAmount] = useState("");
  const [partialInterestRate, setPartialInterestRate] = useState("");
  const [partialTermYearsInput, setPartialTermYearsInput] = useState("");
  const [fullInterestRate, setFullInterestRate] = useState("");
  const [fullTermYearsInput, setFullTermYearsInput] = useState("");
  const [coSignerName, setCoSignerName] = useState("");
  const [coSignerAge, setCoSignerAge] = useState("");
  const [coSignerRelationship, setCoSignerRelationship] = useState("");
  const recommendedTier = useMemo(() => getRecommendedTier(briefing?.offers || []), [briefing]);
  const needsCoSigner = Number(leadData.customerAge) >= 56 && paymentMode !== "upfront";

  useEffect(() => {
    setSelectedTier(recommendedTier);
  }, [recommendedTier]);

  const financingForTier = useMemo(
    () => briefing?.financing?.find((item) => item.offer_tier === selectedTier) || null,
    [briefing, selectedTier],
  );
  const selectedOffer = useMemo(
    () => briefing?.offers?.find((item) => item.tier === selectedTier) || null,
    [briefing, selectedTier],
  );

  const tenYearSavings = useMemo(() => {
    if (!selectedOffer || !financingForTier) {
      return null;
    }

    return selectedOffer.annual_savings_eur * 10 - financingForTier.net_cost_after_subsidy;
  }, [selectedOffer, financingForTier]);

  const netProjectCost = financingForTier?.net_cost_after_subsidy || 0;
  const grossProjectCost = selectedOffer?.upfront_cost_eur || 0;
  const subsidyValue = Math.max(grossProjectCost - netProjectCost, 0);
  const maxFinanceTerm = getMaxFinanceTerm(leadData.customerAge);
  const frontend11Energy = useMemo(() => getPropertyMetrics(leadData), [leadData]);
  const currentMonthlyBill = frontend11Energy.totalMonthlyEnergyCost || 0;
  const targetFullMonthly = Math.max(currentMonthlyBill, 150);
  const targetPartialMonthly = Math.max(Math.round(currentMonthlyBill * 0.7), 100);
  const equipmentBreakdown = useMemo(
    () => getEquipmentBreakdown(selectedOffer?.assets || [], grossProjectCost),
    [selectedOffer, grossProjectCost],
  );
  const yearlySavingsSeries = useMemo(
    () => getYearlyNetSavingsSeries(selectedOffer, financingForTier),
    [selectedOffer, financingForTier],
  );

  useEffect(() => {
    const partialRateDefault = financingForTier?.partial?.rate_pct || 5.9;
    const fullRateDefault =
      financingForTier?.full_finance?.rate_pct || financingForTier?.partial?.rate_pct || 6.9;
    const suggestedFullTerm = findSmallestAffordableTerm(
      netProjectCost,
      fullRateDefault,
      maxFinanceTerm,
      targetFullMonthly,
    );
    const suggestedPartialFinanceAmount = Math.min(
      netProjectCost,
      Math.round(
        calculatePrincipalForTargetPayment(targetPartialMonthly, partialRateDefault, maxFinanceTerm),
      ),
    );
    const suggestedPartialUpfront = Math.max(netProjectCost - suggestedPartialFinanceAmount, 0);
    const suggestedPartialTerm = findSmallestAffordableTerm(
      suggestedPartialFinanceAmount,
      partialRateDefault,
      maxFinanceTerm,
      targetPartialMonthly,
    );

    setPaymentMode("upfront");
    setPartialUpfront(
      String(
        financingForTier?.partial?.upfront ||
          suggestedPartialUpfront ||
          Math.round(netProjectCost * 0.3) ||
          "",
      ),
    );
    setPartialFinanceAmount(
      String(
        financingForTier?.partial?.monthly
          ? Math.max(
              netProjectCost -
                (financingForTier?.partial?.upfront || Math.round(netProjectCost * 0.3) || 0),
              0,
            )
          : suggestedPartialFinanceAmount,
      ),
    );
    setPartialInterestRate(String(partialRateDefault));
    setPartialTermYearsInput(
      String(Math.min(financingForTier?.partial?.term_years || suggestedPartialTerm || 10, maxFinanceTerm)),
    );
    setFullInterestRate(String(fullRateDefault));
    setFullTermYearsInput(
      String(
        Math.min(financingForTier?.full_finance?.term_years || suggestedFullTerm || 12, maxFinanceTerm),
      ),
    );
  }, [financingForTier, maxFinanceTerm, netProjectCost, targetFullMonthly, targetPartialMonthly]);

  const partialTermYears = Math.min(
    Number(partialTermYearsInput) || financingForTier?.partial?.term_years || 10,
    maxFinanceTerm,
  );
  const fullTermYears = Math.min(
    Number(fullTermYearsInput) || financingForTier?.full_finance?.term_years || 12,
    maxFinanceTerm,
  );
  const partialUpfrontValue = Number(partialUpfront) || 0;
  const partialFinanceValue = Number(partialFinanceAmount) || 0;
  const partialRateValue = Number(partialInterestRate) || 0;
  const fullRateValue = Number(fullInterestRate) || 0;
  const fullFinanceValue = netProjectCost;
  const partialMonthlyPayment = calculateMonthlyPayment(partialFinanceValue, partialRateValue, partialTermYears);
  const fullMonthlyPayment = calculateMonthlyPayment(fullFinanceValue, fullRateValue, fullTermYears);
  const partialTotalPayable = partialUpfrontValue + partialMonthlyPayment * partialTermYears * 12;
  const fullTotalPayable = fullMonthlyPayment * fullTermYears * 12;

  return (
    <section className="mx-auto max-w-6xl">
      <SectionTitle
        eyebrow="Financing"
        title={`Finance report for ${customer.customerCode}`}
        description={`Customer ID ${customer.customerCode}. Use this quote builder to walk through payment options for ${leadData.productInterest?.toLowerCase() || "the selected offer"}.`}
        action={
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600"
          >
            ← Back to finance reports
          </button>
        }
      />

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel sm:p-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Customer quote</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Selected tier: <span className="font-semibold text-slate-900">{selectedTier}</span>
            </p>
          </div>
          {tenYearSavings !== null ? (
            <div className="rounded-3xl border border-brand-line bg-brand-soft px-5 py-4 text-sm">
              <span className="font-semibold text-brand-deep">10-year net savings:</span>{" "}
              <span className="font-semibold text-slate-900">{formatCurrency(tenYearSavings)}</span>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {(briefing?.offers || []).map((offer) => (
              <button
                key={offer.tier}
                type="button"
                onClick={() => setSelectedTier(offer.tier)}
                className={`rounded-3xl border p-5 text-left transition ${
                  selectedTier === offer.tier
                    ? "border-brand-line bg-brand-soft"
                    : "border-slate-200 bg-slate-50 hover:border-brand-line"
                }`}
              >
                <div className="text-base font-semibold text-slate-900">{offer.tier}</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">{offer.why}</div>
                <div className="mt-3 text-sm font-medium text-slate-800">{formatCurrency(offer.upfront_cost_eur)}</div>
              </button>
            ))}
          </div>

          {financingForTier ? (
            <>
              <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Equipment breakdown</h4>
                  <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5">
                    {equipmentBreakdown.map((item) => (
                      <InvoiceLine
                        key={item.label}
                        label={item.label}
                        value={formatCurrency(item.amount)}
                        calculation={`Allocated from gross system price ${formatCurrency(grossProjectCost)} based on equipment mix weighting.`}
                      />
                    ))}
                    <InvoiceLine
                      label="Gross system package"
                      value={formatCurrency(grossProjectCost)}
                      calculation={`${selectedOffer?.assets?.join(", ") || "Selected assets"} with installation, controls, and commissioning.`}
                      strong
                    />
                    <InvoiceLine
                      label="Subsidies and support applied"
                      value={formatCurrency(subsidyValue)}
                      calculation={`Gross package ${formatCurrency(grossProjectCost)} minus net quote ${formatCurrency(netProjectCost)}.`}
                    />
                    <InvoiceLine
                      label="Net quoted amount"
                      value={formatCurrency(netProjectCost)}
                      calculation="Customer amount after estimated eligible support."
                      strong
                    />
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Payment choice</h4>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      { id: "upfront", label: "Pay upfront" },
                      { id: "partial", label: "Partial upfront + finance" },
                      { id: "full", label: "Full financing" },
                    ].map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setPaymentMode(option.id)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          paymentMode === option.id
                            ? "bg-brand text-white"
                            : "border border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl border border-brand-line bg-brand-soft px-4 py-3 text-sm text-slate-700">
                    <span className="font-semibold text-slate-900">Financing term cap:</span> maximum {maxFinanceTerm} years
                    {leadData.customerAge ? ` based on customer age ${leadData.customerAge}.` : " based on the default 25-year limit."}
                  </div>

                  {needsCoSigner ? (
                    <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5">
                      <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Co-signer details</div>
                      <div className="mt-4 grid gap-4 sm:grid-cols-3">
                        <NumberInput
                          label="Co-signer age"
                          value={coSignerAge}
                          onChange={(event) => setCoSignerAge(event.target.value)}
                          min="18"
                          max="100"
                        />
                        <label className="grid gap-2">
                          <span className="text-sm font-semibold text-slate-700">Co-signer name</span>
                          <input
                            type="text"
                            value={coSignerName}
                            onChange={(event) => setCoSignerName(event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft"
                          />
                        </label>
                        <label className="grid gap-2">
                          <span className="text-sm font-semibold text-slate-700">Relationship</span>
                          <input
                            type="text"
                            value={coSignerRelationship}
                            onChange={(event) => setCoSignerRelationship(event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft"
                          />
                        </label>
                      </div>
                      <div className="mt-3 text-xs leading-5 text-slate-500">
                        Customer is age {leadData.customerAge}, so financing should be documented with a co-signer for this quote path.
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5">
                    {paymentMode === "upfront" ? (
                      <>
                        <InvoiceLine
                          label="Amount due on installation"
                          value={formatCurrency(netProjectCost)}
                          calculation="Single payment equal to the net quoted amount after subsidies."
                          strong
                        />
                        <InvoiceLine
                          label="Profile-led current bill baseline"
                          value={formatCurrency(currentMonthlyBill)}
                          calculation={
                            `Derived from zip prediction logic: ${frontend11Energy.gridAnnualKwh.toLocaleString("de-DE")} grid kWh/year after existing assets, plus ${formatCurrency(frontend11Energy.annualHeatingCost)} heating cost in ${frontend11Energy.state || "the postcode region"}.`
                          }
                        />
                        <InvoiceLine
                          label="Existing-asset adjustment"
                          value={`${Math.round(frontend11Energy.gridShare * 100)}% grid reliance`}
                          calculation={
                            leadData.existingAssets
                              ? `${leadData.existingAssets} reduces imported electricity used for the bill baseline.`
                              : "No existing asset reduction applied."
                          }
                        />
                        <InvoiceLine
                          label="Heating cost baseline"
                          value={formatCurrency(frontend11Energy.annualHeatingCost)}
                          calculation={
                            leadData.existingHeating
                              ? `${frontend11Energy.heatedFloorAreaM2} m2 x ${frontend11Energy.heatIntensity} kWh/m2/year x ${frontend11Energy.heatingSystemFactor.toFixed(2)} system factor x ${frontend11Energy.heatingRatePerKwh.toFixed(2)} EUR/kWh for ${leadData.existingHeating}.`
                              : "No existing heating system selected, so heating-cost logic is not added."
                          }
                        />
                        <InvoiceLine
                          label="Estimated yearly savings"
                          value={formatCurrency(selectedOffer?.annual_savings_eur)}
                          calculation="AI estimate from energy spend, output, and self-consumption."
                        />
                      </>
                    ) : null}

                    {paymentMode === "partial" ? (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                          <NumberInput
                            label="Upfront payment"
                            value={partialUpfront}
                            onChange={(event) => {
                              const nextUpfront = event.target.value;
                              setPartialUpfront(nextUpfront);
                              setPartialFinanceAmount(String(Math.max(netProjectCost - (Number(nextUpfront) || 0), 0)));
                            }}
                            suffix="€"
                            max={String(netProjectCost)}
                          />
                          <NumberInput
                            label="Financed amount"
                            value={partialFinanceAmount}
                            onChange={(event) => setPartialFinanceAmount(event.target.value)}
                            suffix="€"
                            max={String(netProjectCost)}
                          />
                          <NumberInput
                            label="Interest rate"
                            value={partialInterestRate}
                            onChange={(event) => setPartialInterestRate(event.target.value)}
                            suffix="%"
                            step="0.1"
                          />
                          <NumberInput
                            label="Financing years"
                            value={partialTermYearsInput}
                            onChange={(event) => setPartialTermYearsInput(event.target.value)}
                            min="1"
                            max={String(maxFinanceTerm)}
                          />
                        </div>
                        <div className="mt-5">
                          <InvoiceLine label="Upfront payment" value={formatCurrency(partialUpfrontValue)} calculation="Paid at signing or installation." />
                          <InvoiceLine
                            label={`Monthly financing payment (${partialTermYears} years)`}
                            value={formatCurrency(partialMonthlyPayment)}
                            calculation={`${formatCurrency(partialFinanceValue)} financed at ${partialRateValue}% over ${partialTermYears} years. Targeted to stay near ${formatCurrency(targetPartialMonthly)}/month from the frontend11 property-demand model.`}
                          />
                          <InvoiceLine
                            label="Total customer outlay"
                            value={formatCurrency(partialTotalPayable)}
                            calculation={`${formatCurrency(partialUpfrontValue)} upfront + ${formatCurrency(partialMonthlyPayment)} x ${partialTermYears * 12} months.`}
                            strong
                          />
                        </div>
                      </>
                    ) : null}

                    {paymentMode === "full" ? (
                      <>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <NumberInput
                            label="Interest rate"
                            value={fullInterestRate}
                            onChange={(event) => setFullInterestRate(event.target.value)}
                            suffix="%"
                            step="0.1"
                          />
                          <NumberInput
                            label="Financing years"
                            value={fullTermYearsInput}
                            onChange={(event) => setFullTermYearsInput(event.target.value)}
                            min="1"
                            max={String(maxFinanceTerm)}
                          />
                          <MetricTile label="Financed amount" value={formatCurrency(fullFinanceValue)} note="Entire net quoted amount financed." />
                        </div>
                        <div className="mt-5">
                          <InvoiceLine
                            label={`Monthly financing payment (${fullTermYears} years)`}
                            value={formatCurrency(fullMonthlyPayment)}
                            calculation={`${formatCurrency(fullFinanceValue)} financed at ${fullRateValue}% over ${fullTermYears} years. Targeted to stay near ${formatCurrency(targetFullMonthly)}/month from the frontend11 property-demand model.`}
                          />
                          <InvoiceLine
                            label="Total customer outlay"
                            value={formatCurrency(fullTotalPayable)}
                            calculation={`${formatCurrency(fullMonthlyPayment)} x ${fullTermYears * 12} months.`}
                            strong
                          />
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <YearlySavingsChart data={yearlySavingsSeries} />

                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">How payment works</h4>
                  <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <span className="font-semibold text-slate-900">Upfront:</span> customer pays the full net quoted amount at installation and captures savings from day one.
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <span className="font-semibold text-slate-900">Partial:</span> part of the quote is paid immediately, and the rest is amortized monthly using the financed amount and interest rate entered above.
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <span className="font-semibold text-slate-900">Full financing:</span> the full net quoted amount is spread across monthly payments using the selected rate and lender term.
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <span className="font-semibold text-slate-900">Zip logic used:</span> finance defaults are now anchored to an estimated household demand of {frontend11Energy.annualKwh.toLocaleString("de-DE")} kWh/year, {frontend11Energy.dayLoadKwh.toLocaleString("de-DE")} kWh/year daytime-aligned demand, and a modeled energy-cost baseline of {formatCurrency(currentMonthlyBill)} per month.
                    </div>
                    {(financingForTier.subsidies_applied || []).length ? (
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <span className="font-semibold text-slate-900">Support included:</span> {(financingForTier.subsidies_applied || []).join(", ")}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
              No financing data was returned for this customer report yet.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
