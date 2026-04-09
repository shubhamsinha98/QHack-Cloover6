import { useEffect, useMemo, useState } from "react";
import { getSolarSizingMetrics } from "../lib/osmRoofTools";
import { getPropertyMetrics } from "../lib/propertyMetrics";
import { getRecommendedOffer, getRecommendedTier } from "../lib/offers";

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

function formatYears(value) {
  return typeof value === "number" && !Number.isNaN(value) ? `${value} years` : "N/A";
}

function Metric({ label, value, note, tone = "default" }) {
  const toneClass =
    tone === "emerald"
      ? "border-brand-line bg-brand-soft"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50"
        : "border-slate-200 bg-white";

  return (
    <div className={`rounded-2xl border px-4 py-4 ${toneClass}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-2 text-base font-semibold text-slate-900">{value}</div>
      {note ? <div className="mt-2 text-xs leading-5 text-slate-500">{note}</div> : null}
    </div>
  );
}

function InfoRow({ label, value, note, strong = false }) {
  return (
    <div className="border-t border-slate-200 py-3 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-4">
        <div className={`text-sm ${strong ? "font-semibold text-slate-900" : "text-slate-700"}`}>{label}</div>
        <div className={`text-right text-sm ${strong ? "font-semibold text-slate-900" : "font-medium text-slate-800"}`}>{value}</div>
      </div>
      {note ? <div className="mt-2 text-xs leading-5 text-slate-500">{note}</div> : null}
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
    const roundedAmount = Math.round((grossCost * item.weight) / totalWeight);

    if (index === weights.length - 1) {
      const allocated = weights.slice(0, -1).reduce((sum, current) => {
        return sum + Math.round((grossCost * current.weight) / totalWeight);
      }, 0);

      return { label: item.asset, amount: grossCost - allocated };
    }

    return { label: item.asset, amount: roundedAmount };
  });
}

function getMaxFinanceTerm(customerAge) {
  const age = Number(customerAge);

  if (!age || age < 56) {
    return 25;
  }

  return Math.max(Math.min(25, 80 - age), 1);
}

function buildFinanceSnapshot(leadData, briefing) {
  const recommendedOffer = getRecommendedOffer(briefing?.offers || []);
  const recommendedTier = recommendedOffer?.tier || "";
  const financingForTier =
    briefing?.financing?.find((item) => item.offer_tier === recommendedTier) || null;

  if (!recommendedOffer || !financingForTier) {
    return null;
  }

  const netCost = Number(financingForTier.net_cost_after_subsidy) || 0;
  const grossCost = Number(recommendedOffer.upfront_cost_eur) || 0;
  const subsidyValue = Math.max(grossCost - netCost, 0);
  const maxTermYears = getMaxFinanceTerm(leadData.customerAge);
  const partialTermYears = Math.min(
    Number(financingForTier.partial?.term_years) || 10,
    maxTermYears,
  );
  const fullTermYears = Math.min(
    Number(financingForTier.full_finance?.term_years) || 12,
    maxTermYears,
  );

  return {
    recommendedOffer,
    financingForTier,
    netCost,
    grossCost,
    subsidyValue,
    maxTermYears,
    partialTermYears,
    fullTermYears,
    tenYearNetSavings: (Number(recommendedOffer.annual_savings_eur) || 0) * 10 - netCost,
    equipmentBreakdown: getEquipmentBreakdown(recommendedOffer.assets || [], grossCost),
    coSignerNeeded: Number(leadData.customerAge) >= 56,
  };
}

function SalesRepOnePager({ customer, leadData, briefing }) {
  const propertyMetrics = getPropertyMetrics(leadData);
  const roofMetrics = getSolarSizingMetrics(leadData);
  const recommendedOffer = getRecommendedOffer(briefing?.offers || []);
  const financeSnapshot = buildFinanceSnapshot(leadData, briefing);
  const priceProjection = briefing?.market_context?.price_projection || {};
  const topSubsidies = (briefing?.market_context?.subsidies || []).slice(0, 2);
  const topRegulations = (briefing?.market_context?.regulations || []).slice(0, 2);

  return (
    <div className="grid gap-5">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-deep">Sales rep one-pager</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">{customer.customerCode}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {customer.postcode} • {customer.productInterest} • {leadData.houseType || "House type pending"} •{" "}
              {leadData.roofType || "Roof type pending"}
            </p>
          </div>
          {recommendedOffer ? (
            <div className="rounded-3xl border border-brand-line bg-brand-soft px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-deep">
                Dynamic recommendation
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{recommendedOffer.tier}</div>
              <div className="mt-2 text-xs leading-5 text-slate-600">{recommendedOffer.why}</div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <Metric
          label="Urgency"
          value={briefing?.market_context?.urgency_level || "N/A"}
          note={briefing?.market_context?.urgency_summary}
          tone="amber"
        />
        <Metric
          label="Predicted demand"
          value={`${propertyMetrics.annualKwh.toLocaleString("de-DE")} kWh/year`}
          note={`${propertyMetrics.dayLoadKwh.toLocaleString("de-DE")} kWh/year daytime aligned`}
        />
        <Metric
          label="Roof sizing"
          value={`${roofMetrics.panelCount} panels / ${roofMetrics.systemSizeKw.toLocaleString("de-DE")} kWp`}
          note={`${roofMetrics.usableRoofAreaM2.toLocaleString("de-DE")} m2 usable roof area`}
          tone="emerald"
        />
        <Metric
          label="10-year net value"
          value={financeSnapshot ? formatCurrency(financeSnapshot.tenYearNetSavings) : "€0"}
          note={financeSnapshot ? `${financeSnapshot.recommendedOffer.tier} finance view` : ""}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
          <h3 className="text-lg font-semibold text-slate-900">Market and savings snapshot</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Metric
              label="Paying today"
              value={formatCurrency(priceProjection.current_annual_cost_eur)}
              note="Current annual energy baseline for this customer profile."
            />
            <Metric
              label="10-year do-nothing cost"
              value={formatCurrency(priceProjection.year_10_annual_cost_eur)}
              note={`Increase of ${formatCurrency(priceProjection.do_nothing_cost_increase_eur)} if they wait.`}
            />
          </div>

          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
              <span className="font-semibold text-slate-900">Energy price outlook:</span>{" "}
              {briefing?.market_context?.energy_price_trend || "Not available."}
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
              <span className="font-semibold text-slate-900">Recommended route:</span>{" "}
              {recommendedOffer?.why || "No recommendation yet."}
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Top regulations</div>
              <div className="mt-4 space-y-3">
                {topRegulations.length ? (
                  topRegulations.map((item, index) => (
                    <div key={`${item.name || "reg"}-${index}`} className="rounded-2xl bg-white px-4 py-4">
                      <div className="text-sm font-semibold text-slate-900">{item.name || item}</div>
                      <div className="mt-2 text-sm leading-6 text-slate-600">{item.impact || item}</div>
                      {typeof item.estimated_customer_savings_eur === "number" ? (
                        <div className="mt-2 text-xs font-semibold text-brand-deep">
                          End-user impact: {formatCurrency(item.estimated_customer_savings_eur)}
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-white px-4 py-4 text-sm text-slate-500">No regulation detail yet.</div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-brand-line bg-brand-soft p-4">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-deep">Top subsidies</div>
              <div className="mt-4 space-y-3">
                {topSubsidies.length ? (
                  topSubsidies.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="rounded-2xl bg-white px-4 py-4">
                      <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                      <div className="mt-2 text-xs uppercase tracking-[0.12em] text-slate-500">
                        Program support: {item.amount}
                      </div>
                      {typeof item.estimated_customer_benefit_eur === "number" ? (
                        <div className="mt-2 text-sm font-semibold text-brand-deep">
                          Likely benefit: {formatCurrency(item.estimated_customer_benefit_eur)}
                        </div>
                      ) : null}
                      <div className="mt-2 text-sm leading-6 text-slate-600">{item.note || item.eligibility_fit}</div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-white px-4 py-4 text-sm text-slate-500">No subsidy detail yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
            <h3 className="text-lg font-semibold text-slate-900">Offer comparison</h3>
            <div className="mt-4 space-y-3">
              {(briefing?.offers || []).map((offer) => (
                <div
                  key={offer.tier}
                  className={`rounded-2xl border px-4 py-4 ${
                    recommendedOffer?.tier === offer.tier ? "border-brand-line bg-brand-soft" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{offer.tier}</div>
                      <div className="mt-2 text-sm leading-6 text-slate-600">{offer.assets?.join(", ") || "No assets listed"}</div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-semibold text-slate-900">{formatCurrency(offer.upfront_cost_eur)}</div>
                      <div className="mt-1 text-xs text-slate-500">{formatYears(offer.payback_years)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {financeSnapshot ? (
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
              <h3 className="text-lg font-semibold text-slate-900">Finance snapshot</h3>
              <div className="mt-4 space-y-1">
                <InfoRow
                  label="Gross package"
                  value={formatCurrency(financeSnapshot.grossCost)}
                  note={`${financeSnapshot.recommendedOffer.assets?.join(", ") || "Selected system"} with installation and controls.`}
                />
                <InfoRow
                  label="Support applied"
                  value={formatCurrency(financeSnapshot.subsidyValue)}
                  note={(financeSnapshot.financingForTier.subsidies_applied || []).join(", ") || "Support included in net quote."}
                />
                <InfoRow
                  label="Net quoted amount"
                  value={formatCurrency(financeSnapshot.netCost)}
                  note="Customer amount after estimated support."
                  strong
                />
                <InfoRow
                  label="Cash"
                  value={formatCurrency(financeSnapshot.financingForTier.cash?.total)}
                  note={financeSnapshot.financingForTier.cash?.note || "Single payment on installation."}
                />
                <InfoRow
                  label="Partial finance"
                  value={formatCurrency(financeSnapshot.financingForTier.partial?.monthly) + "/month"}
                  note={`${formatCurrency(financeSnapshot.financingForTier.partial?.upfront)} upfront, ${financeSnapshot.partialTermYears} years, ${financeSnapshot.financingForTier.partial?.rate_pct || 0}% rate.`}
                />
                <InfoRow
                  label="Full finance"
                  value={formatCurrency(financeSnapshot.financingForTier.full_finance?.monthly) + "/month"}
                  note={`${financeSnapshot.fullTermYears} years, ${financeSnapshot.financingForTier.full_finance?.rate_pct || financeSnapshot.financingForTier.partial?.rate_pct || 0}% rate.`}
                />
                <InfoRow
                  label="Financing cap"
                  value={`${financeSnapshot.maxTermYears} years`}
                  note={
                    financeSnapshot.coSignerNeeded
                      ? `Customer age ${leadData.customerAge}. Co-signer detail is required on financing paths.`
                      : "Default financing cap applies."
                  }
                />
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function CustomerLeaveBehind({ customer, leadData, briefing }) {
  const roofMetrics = getSolarSizingMetrics(leadData);
  const recommendedTier = getRecommendedTier(briefing?.offers || []);
  const recommendedOffer = getRecommendedOffer(briefing?.offers || []);
  const financeSnapshot = buildFinanceSnapshot(leadData, briefing);
  const priceProjection = briefing?.market_context?.price_projection || {};
  const topSubsidies = (briefing?.market_context?.subsidies || []).slice(0, 3);

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-panel">
      <div className="mx-auto max-w-4xl rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-deep">Customer leave-behind report</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">Your clean-energy proposal</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{customer.customerCode} • {customer.address || customer.postcode}</p>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
            PDF-ready
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Recommended option" value={recommendedTier || "N/A"} note={recommendedOffer?.why} tone="emerald" />
          <Metric
            label="Roof potential"
            value={`${roofMetrics.panelCount} panels / ${roofMetrics.systemSizeKw.toLocaleString("de-DE")} kWp`}
            note={`${roofMetrics.usableRoofAreaM2.toLocaleString("de-DE")} m2 usable roof area`}
          />
          <Metric
            label="Estimated annual savings"
            value={recommendedOffer ? formatCurrency(recommendedOffer.annual_savings_eur) : "€0"}
            note={recommendedOffer ? formatYears(recommendedOffer.payback_years) : ""}
          />
          <Metric
            label="Net quoted amount"
            value={financeSnapshot ? formatCurrency(financeSnapshot.netCost) : "€0"}
            note="After estimated support and subsidies."
          />
        </div>

        <div className="mt-8 grid gap-5 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Why households act now</div>
            <div className="mt-3 text-sm leading-7 text-slate-700">
              {briefing?.market_context?.urgency_summary || "Urgency summary not available."}
            </div>
            <div className="mt-5 space-y-2 text-sm text-slate-700">
              <div className="flex items-start justify-between gap-4">
                <span>Current annual energy cost</span>
                <span className="font-semibold text-slate-900">{formatCurrency(priceProjection.current_annual_cost_eur)}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span>Projected in 10 years if nothing changes</span>
                <span className="font-semibold text-slate-900">{formatCurrency(priceProjection.year_10_annual_cost_eur)}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span>Projected increase</span>
                <span className="font-semibold text-brand-deep">{formatCurrency(priceProjection.do_nothing_cost_increase_eur)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Payment routes</div>
            <div className="mt-4 space-y-1">
              <InfoRow
                label="Pay upfront"
                value={financeSnapshot ? formatCurrency(financeSnapshot.financingForTier.cash?.total) : "€0"}
                note="One payment at installation."
              />
              <InfoRow
                label="Partial upfront + finance"
                value={financeSnapshot ? `${formatCurrency(financeSnapshot.financingForTier.partial?.monthly)}/month` : "€0"}
                note={
                  financeSnapshot
                    ? `${formatCurrency(financeSnapshot.financingForTier.partial?.upfront)} upfront over ${financeSnapshot.partialTermYears} years.`
                    : ""
                }
              />
              <InfoRow
                label="Full finance"
                value={financeSnapshot ? `${formatCurrency(financeSnapshot.financingForTier.full_finance?.monthly)}/month` : "€0"}
                note={financeSnapshot ? `Over ${financeSnapshot.fullTermYears} years.` : ""}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-brand-line bg-brand-soft p-5">
          <div className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-deep">Available support</div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {topSubsidies.length ? (
              topSubsidies.map((item, index) => (
                <div key={`${item.name}-${index}`} className="rounded-2xl bg-white px-4 py-4">
                  <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                  <div className="mt-2 text-xs uppercase tracking-[0.12em] text-slate-500">Program support: {item.amount}</div>
                  {typeof item.estimated_customer_benefit_eur === "number" ? (
                    <div className="mt-2 text-sm font-semibold text-brand-deep">
                      Likely benefit: {formatCurrency(item.estimated_customer_benefit_eur)}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-white px-4 py-4 text-sm text-slate-500">No subsidy details available yet.</div>
            )}
          </div>
        </div>

        {financeSnapshot?.equipmentBreakdown?.length ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Included equipment</div>
            <div className="mt-4 space-y-1">
              {financeSnapshot.equipmentBreakdown.map((item) => (
                <InfoRow
                  key={item.label}
                  label={item.label}
                  value={formatCurrency(item.amount)}
                  note="Illustrative share of the installed package."
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default function ReportsWorkspace({
  customers,
  selectedCustomer,
  leadData,
  briefing,
  onSelectCustomer,
  onBackToList,
}) {
  const [reportMode, setReportMode] = useState("rep-sheet");
  const readyCount = useMemo(
    () => customers.filter((customer) => customer.reportStatus === "ready").length,
    [customers],
  );

  useEffect(() => {
    if (!selectedCustomer) {
      setReportMode("rep-sheet");
    }
  }, [selectedCustomer]);

  if (!selectedCustomer || !briefing) {
    return (
      <section className="grid gap-5">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-deep">Reports workspace</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Reports by customer ID</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Open a customer to view a sales rep one-pager and a customer-facing leave-behind report with the key briefing and financing information together.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Metric label="Ready reports" value={String(readyCount)} note="Customers with a generated report and finance snapshot." />
            <Metric label="Report views" value="2" note="Sales Rep Sheet and Leave-Behind PDF." />
            <Metric label="Included data" value="Brief + finance" note="Urgency, pricing, support, recommendation, and quote routes." tone="emerald" />
          </div>
        </div>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
          <div className="grid gap-4">
            {customers.length ? (
              customers.map((customer) => (
                <article key={customer.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{customer.customerCode}</h3>
                      <p className="mt-1 text-sm text-slate-500">{customer.postcode} • {customer.productInterest}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectCustomer(customer)}
                      disabled={customer.reportStatus !== "ready"}
                      className="rounded-full border border-brand-line bg-white px-4 py-2 text-sm font-semibold text-brand-deep disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                    >
                      {customer.reportStatus === "ready" ? "Open reports" : "Report not ready"}
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No customers yet. Add a customer in the Customers tab to generate the first report.
              </div>
            )}
          </div>
        </section>
      </section>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-deep">Reports workspace</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{selectedCustomer.customerCode}</h2>
          </div>
          <button
            type="button"
            onClick={onBackToList}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600"
          >
            ← Back to customer reports
          </button>
        </div>

        <div className="mt-5 flex gap-2 rounded-2xl bg-slate-100 p-1">
          {[
            { id: "rep-sheet", label: "Sales Rep Sheet" },
            { id: "leave-behind", label: "Leave-Behind PDF" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setReportMode(tab.id)}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                reportMode === tab.id ? "bg-brand text-white" : "text-slate-600 hover:bg-white hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {reportMode === "rep-sheet" ? (
        <SalesRepOnePager customer={selectedCustomer} leadData={leadData} briefing={briefing} />
      ) : (
        <CustomerLeaveBehind customer={selectedCustomer} leadData={leadData} briefing={briefing} />
      )}
    </div>
  );
}
