import { useMemo } from "react";
import { getPolygonViewModel, getRoofMetrics, getSolarSizingMetrics } from "../lib/osmRoofTools";
import { getPropertyMetrics } from "../lib/propertyMetrics";
import { getRecommendedTier } from "../lib/offers";

function formatCurrency(value) {
  if (typeof value !== "number") {
    return "€0";
  }

  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatYears(value) {
  return typeof value === "number" ? `${value} years` : "N/A";
}

function formatCo2(value) {
  if (typeof value !== "number") {
    return "0 kg/year";
  }

  return `${new Intl.NumberFormat("en-US").format(value)} kg/year`;
}

function deriveRegionLabel(postcode) {
  const prefix = Number(String(postcode || "").trim().slice(0, 2));

  if (Number.isNaN(prefix)) {
    return "";
  }

  if (prefix >= 1 && prefix <= 9) return "Saxony";
  if (prefix >= 10 && prefix <= 19) return "Berlin / Brandenburg";
  if (prefix >= 20 && prefix <= 29) return "Hamburg / Lower Saxony / Schleswig-Holstein";
  if (prefix >= 30 && prefix <= 34) return "Lower Saxony";
  if (prefix >= 35 && prefix <= 39) return "Hesse";
  if (prefix >= 40 && prefix <= 47) return "North Rhine-Westphalia";
  if (prefix >= 48 && prefix <= 49) return "North Rhine-Westphalia / Lower Saxony";
  if (prefix >= 50 && prefix <= 53) return "North Rhine-Westphalia";
  if (prefix >= 54 && prefix <= 56) return "Rhineland-Palatinate";
  if (prefix >= 57 && prefix <= 59) return "North Rhine-Westphalia";
  if (prefix >= 60 && prefix <= 65) return "Hesse";
  if (prefix === 66) return "Saarland";
  if (prefix >= 67 && prefix <= 69) return "Rhineland-Palatinate / Baden-Württemberg";
  if (prefix >= 70 && prefix <= 79) return "Baden-Württemberg";
  if (prefix >= 80 && prefix <= 87) return "Bavaria";
  if (prefix >= 88 && prefix <= 89) return "Baden-Württemberg / Bavaria";
  if (prefix >= 90 && prefix <= 97) return "Bavaria";
  if (prefix >= 98 && prefix <= 99) return "Thuringia";

  return "";
}

function getUrgencyStyles(level) {
  switch (level) {
    case "Very urgent":
      return {
        badge: "border-rose-200 bg-rose-50 text-rose-700",
        card: "border-rose-200 bg-rose-50",
      };
    case "Urgent":
      return {
        badge: "border-amber-200 bg-amber-50 text-amber-700",
        card: "border-amber-200 bg-amber-50",
      };
    default:
      return {
        badge: "border-brand-line bg-brand-soft text-brand-deep",
        card: "border-brand-line bg-brand-soft",
      };
  }
}

function MarketListCard({ title, children, tone = "slate" }) {
  const toneClasses =
    tone === "amber"
      ? "border-amber-200 bg-amber-50"
      : tone === "emerald"
        ? "border-brand-line bg-brand-soft"
        : "border-slate-200 bg-slate-50";

  return (
    <div className={`min-w-0 rounded-3xl border p-5 ${toneClasses}`}>
      <h4 className="break-words text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">
        {title}
      </h4>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function RoofAreaCard({ leadData }) {
  const roofPolygon = Array.isArray(leadData.roofPolygon) ? leadData.roofPolygon : [];
  const hasPolygon = roofPolygon.length >= 4;
  const roofMetrics = getRoofMetrics(leadData);
  const solarSizing = getSolarSizingMetrics(leadData);
  const viewModel = hasPolygon
    ? getPolygonViewModel(
        [
          {
            id: leadData.roofBuildingId || "selected-roof",
            label: leadData.roofBuildingLabel || "Selected building",
            polygon: roofPolygon,
            areaM2: roofMetrics.footprintAreaM2 || 0,
          },
        ],
        leadData.roofBuildingId || "selected-roof",
      )
    : { polygons: [] };

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Roof area from map</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Surface and usable area calculated from the selected OpenStreetMap building polygon.
          </p>
        </div>
        {leadData.roofBuildingLabel ? (
          <div className="rounded-full border border-brand-line bg-brand-soft px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-deep">
            {leadData.roofBuildingLabel}
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_1.4fr]">
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <MetricTile
            label="Footprint area"
            value={`${new Intl.NumberFormat("de-DE").format(roofMetrics.footprintAreaM2)} m2`}
            calculation="2D plan area from the selected or manually drawn polygon."
          />
          <MetricTile
            label="Surface area"
            value={`${new Intl.NumberFormat("de-DE").format(roofMetrics.surfaceAreaM2)} m2`}
            calculation={`${new Intl.NumberFormat("de-DE").format(roofMetrics.footprintAreaM2)} m2 footprint x ${roofMetrics.pitchMultiplier.toFixed(2)} roof-pitch factor from ${leadData.roofType || "flat roof"} assumption.`}
            highlight
          />
          <MetricTile
            label="Usable roof area"
            value={`${new Intl.NumberFormat("de-DE").format(roofMetrics.usableRoofAreaM2)} m2`}
            calculation={`${new Intl.NumberFormat("de-DE").format(roofMetrics.surfaceAreaM2)} m2 x ${leadData.usableRoofPct || 75}% usable share for setbacks, chimneys, and shading.`}
          />
          <MetricTile
            label="Estimated panel count"
            value={solarSizing.panelCount ? `${solarSizing.panelCount} panels` : "0 panels"}
            calculation={`${new Intl.NumberFormat("de-DE").format(solarSizing.effectivePanelAreaM2)} m2 effective install area divided by ${solarSizing.panelAreaM2.toFixed(2)} m2 per panel at ${(solarSizing.layoutEfficiency * 100).toFixed(0)}% packing efficiency.`}
            highlight
          />
          <MetricTile
            label="Estimated system power"
            value={solarSizing.systemSizeKw ? `${solarSizing.systemSizeKw.toLocaleString("de-DE")} kWp` : "0 kWp"}
            calculation={`${solarSizing.panelCount} panels x ${solarSizing.panelPowerKw.toFixed(2)} kW per panel.`}
          />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            Selected footprint
          </h4>
          {viewModel.polygons.length ? (
            <svg viewBox={`0 0 ${viewModel.width} ${viewModel.height}`} className="mt-4 h-[220px] w-full rounded-2xl bg-white">
              <defs>
                <clipPath id="briefing-roof-map-clip">
                  <rect x="0" y="0" width={viewModel.width} height={viewModel.height} rx="20" ry="20" />
                </clipPath>
              </defs>
              <rect x="0" y="0" width={viewModel.width} height={viewModel.height} fill="#e2e8f0" />
              <g clipPath="url(#briefing-roof-map-clip)">
                {(viewModel.tiles || []).map((tile) => (
                  <image
                    key={tile.key}
                    href={tile.href}
                    x={tile.x}
                    y={tile.y}
                    width={tile.width}
                    height={tile.height}
                    preserveAspectRatio="none"
                  />
                ))}
                <rect
                  x="0"
                  y="0"
                  width={viewModel.width}
                  height={viewModel.height}
                  fill="rgba(248,250,252,0.12)"
                />
              </g>
              {viewModel.polygons.map((polygon) => (
                <polygon
                  key={polygon.id}
                  points={polygon.path}
                  fill="#10b981"
                  fillOpacity="0.85"
                  stroke="#047857"
                  strokeWidth="2"
                />
              ))}
            </svg>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
              No building polygon selected yet. Choose one in the customer or briefing assumptions view.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricTile({ label, value, highlight = false, calculation }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-4 ${
        highlight ? "border-brand-line bg-white" : "border-white/70 bg-white/70"
      }`}
    >
      <p className="break-words text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
        {value}
      </p>
      {calculation ? (
        <p className="mt-2 break-words text-xs leading-5 text-slate-500">{calculation}</p>
      ) : null}
    </div>
  );
}

function EnergyPredictionCard({ metrics }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h4 className="break-words text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">
            Energy consumption prediction
          </h4>
          <p className="mt-3 max-w-2xl break-words text-sm leading-6 text-slate-700">
            Rule-based demand estimate from the zip logic using postcode-derived region, house type,
            roof type, floors, household size, and usage timing.
          </p>
        </div>
        <div className="rounded-2xl border border-brand-line bg-white px-4 py-3 text-right">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-deep">
            Annual estimate
          </div>
          <div className="mt-2 text-lg font-semibold text-slate-900">
            {metrics.annualKwh.toLocaleString("de-DE")} kWh/year
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricTile
          label="Daytime-aligned demand"
          value={`${metrics.dayLoadKwh.toLocaleString("de-DE")} kWh/year`}
          calculation={`${metrics.peakLabel}. Derived from the usage timing selected in the property questionnaire.`}
        />
        <MetricTile
          label="Imported grid share"
          value={`${Math.round(metrics.gridShare * 100)}%`}
          calculation="Adjusted down when existing solar or solar plus battery is already installed."
        />
        <MetricTile
          label="Electricity cost baseline"
          value={formatCurrency(metrics.electricityAnnualCost)}
          calculation={`${metrics.gridAnnualKwh.toLocaleString("de-DE")} imported kWh/year x ${metrics.tariffPerKwh.toFixed(2)} EUR/kWh.`}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Winter"
          value={`${metrics.seasonal.winter.toLocaleString("de-DE")} kWh`}
          calculation="Seasonal share from the zip model."
        />
        <MetricTile
          label="Spring"
          value={`${metrics.seasonal.spring.toLocaleString("de-DE")} kWh`}
          calculation="Seasonal share from the zip model."
        />
        <MetricTile
          label="Summer"
          value={`${metrics.seasonal.summer.toLocaleString("de-DE")} kWh`}
          calculation="Seasonal share from the zip model."
        />
        <MetricTile
          label="Autumn"
          value={`${metrics.seasonal.autumn.toLocaleString("de-DE")} kWh`}
          calculation="Seasonal share from the zip model."
        />
      </div>
    </div>
  );
}

function SkeletonCard({ tall = false }) {
  return (
    <div className={`rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel ${tall ? "min-h-[320px]" : ""}`}>
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-32 rounded-full bg-slate-200" />
        <div className="h-8 w-2/3 rounded-2xl bg-slate-200" />
        <div className="h-24 rounded-3xl bg-slate-100" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-16 rounded-2xl bg-slate-100" />
          <div className="h-16 rounded-2xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title, description, action }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-deep">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export default function Briefing({
  leadData,
  briefing,
  loading,
  error,
  onNewLead,
  onRetry,
  actionLabel = "← New lead",
}) {
  if (loading) {
    return (
      <section className="mx-auto max-w-6xl">
        <SectionTitle
          eyebrow="Generating brief"
          title="Building a customer-ready sales pack"
          description="Cloover is modeling local context, tiering the offer, and sizing financing options for this lead."
          action={
            <button
              type="button"
              onClick={onNewLead}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600"
            >
              {actionLabel}
            </button>
          }
        />
        <div className="grid gap-5">
          <SkeletonCard />
          <SkeletonCard tall />
          <SkeletonCard />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-3xl rounded-[28px] border border-rose-200 bg-white p-6 shadow-panel sm:p-8">
        <SectionTitle
          eyebrow="Briefing error"
          title="We couldn’t turn that AI response into a usable brief."
          description={error}
          action={
            <button
              type="button"
              onClick={onNewLead}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600"
            >
              {actionLabel}
            </button>
          }
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  if (!briefing) {
    return (
      <section className="mx-auto max-w-4xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel sm:p-8">
        <SectionTitle
          eyebrow="Briefing workspace"
          title="Report not ready yet"
          description="Cloover has the customer context, but the report is still being prepared or needs to be regenerated."
          action={
            <button
              type="button"
              onClick={onNewLead}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600"
            >
              {actionLabel}
            </button>
          }
        />
      </section>
    );
  }

  const urgencyLevel = briefing.market_context?.urgency_level || "Urgent";
  const urgencyStyles = getUrgencyStyles(urgencyLevel);
  const priceProjection = briefing.market_context?.price_projection || {};
  const derivedRegion = deriveRegionLabel(leadData.postcode);
  const currentEnergyBaseline = getPropertyMetrics(leadData);
  const recommendedTier = getRecommendedTier(briefing.offers || []);

  return (
    <section className="mx-auto max-w-6xl">
      <SectionTitle
        eyebrow="Sales briefing"
        title={`${leadData.productInterest} opportunity for ${leadData.postcode}`}
        description={`A mobile-first summary designed to be used from the car, driveway, or kitchen table before the homeowner meeting starts.${derivedRegion ? ` Region derived from postcode: ${derivedRegion}.` : ""}`}
        action={
          <button
            type="button"
            onClick={onNewLead}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-brand-line hover:text-brand-deep"
          >
            {actionLabel}
          </button>
        }
      />

      <div className="grid gap-5">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel sm:p-8">
          <div className="mb-6 flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Market context</h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Quantified urgency, cost exposure, regulation pressure, and available support for this customer.
              </p>
            </div>

            <div className={`min-w-0 rounded-3xl border px-5 py-4 sm:max-w-sm ${urgencyStyles.card}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 sm:text-right">
                Urgency level
              </p>
              <div className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] sm:ml-auto ${urgencyStyles.badge}`}>
                {urgencyLevel}
              </div>
              <p className="mt-3 break-words text-sm leading-6 text-slate-700 sm:text-right">
                {briefing.market_context?.urgency_summary}
              </p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="grid gap-4">
              <EnergyPredictionCard metrics={currentEnergyBaseline} />

              <div className="rounded-3xl border border-brand-line bg-brand-soft p-5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <h4 className="break-words text-sm font-semibold uppercase tracking-[0.16em] text-brand-deep">
                      Energy price outlook
                    </h4>
                    <p className="mt-3 max-w-2xl break-words text-sm leading-6 text-slate-700">
                      {briefing.market_context?.energy_price_trend}
                    </p>
                  </div>
                  <div className="shrink-0 text-3xl text-brand-deep">↗</div>
                </div>

                <div className="mt-5 grid gap-3">
                  <MetricTile
                    label="Paying today"
                    value={formatCurrency(priceProjection.current_annual_cost_eur)}
                    calculation={`Consumption-led baseline: ${formatCurrency(currentEnergyBaseline.electricityAnnualCost)} electricity plus ${formatCurrency(currentEnergyBaseline.annualHeatingCost)} heating, using the zip prediction logic and current heating setup.`}
                  />
                  <MetricTile
                    label="In 2 years"
                    value={formatCurrency(priceProjection.year_2_annual_cost_eur)}
                    calculation={`Projection from today's annual cost with regional price escalation over 2 years.`}
                  />
                  <MetricTile
                    label="In 5 years"
                    value={formatCurrency(priceProjection.year_5_annual_cost_eur)}
                    calculation={`Projection from today's annual cost with regional price escalation over 5 years.`}
                  />
                  <MetricTile
                    label="In 10 years"
                    value={formatCurrency(priceProjection.year_10_annual_cost_eur)}
                    calculation={`Projection from today's annual cost with regional price escalation over 10 years.`}
                  />
                  <MetricTile
                    label="Do nothing increase"
                    value={formatCurrency(priceProjection.do_nothing_cost_increase_eur)}
                    highlight
                    calculation={`Calculated as 10-year projected cost ${formatCurrency(priceProjection.year_10_annual_cost_eur)} minus current annual cost ${formatCurrency(priceProjection.current_annual_cost_eur)}.`}
                  />
                </div>
              </div>

              <MarketListCard title="Regulations">
                <ul className="space-y-3 text-sm leading-6 text-slate-700">
                  {(briefing.market_context?.regulations || []).map((item, index) => (
                    <li key={`${item.name || "reg"}-${index}`} className="rounded-2xl bg-white px-4 py-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="break-words font-semibold text-slate-900">{item.name || item}</div>
                          {item.timeline ? (
                            <div className="mt-1 break-words text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                              {item.timeline}
                            </div>
                          ) : null}
                        </div>
                        {typeof item.estimated_customer_savings_eur === "number" ? (
                          <div className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900">
                            End-user impact: {formatCurrency(item.estimated_customer_savings_eur)}
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-3 break-words text-sm leading-6 text-slate-600">
                        {item.impact || item}
                      </div>
                      {typeof item.estimated_customer_savings_eur === "number" ? (
                        <div className="mt-2 text-xs leading-5 text-slate-500">
                          AI estimate for this postcode, household profile, and projected avoided compliance or fuel-cost exposure.
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </MarketListCard>
            </div>

            <div className="grid gap-4">
              <MarketListCard title="Subsidies" tone="emerald">
                <ul className="space-y-3 text-sm leading-6 text-slate-700">
                  {(briefing.market_context?.subsidies || []).map((item, index) => (
                    <li key={`${item.name}-${index}`} className="rounded-2xl bg-white px-4 py-4">
                      <div className="flex flex-col gap-4">
                        <div className="break-words font-semibold text-slate-900">{item.name}</div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-brand-line bg-brand-soft px-4 py-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-deep">
                              Program support
                            </div>
                            <div className="mt-2 break-words text-base font-semibold text-slate-900">
                              {item.amount || "Check scheme"}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                              Likely benefit for this customer
                            </div>
                            <div className="mt-2 break-words text-base font-semibold text-slate-900">
                              {typeof item.estimated_customer_benefit_eur === "number"
                                ? formatCurrency(item.estimated_customer_benefit_eur)
                                : "To confirm"}
                            </div>
                          </div>
                        </div>
                      </div>
                      {item.eligibility_fit ? (
                        <div className="mt-2 break-words text-sm font-medium text-slate-700">
                          {item.eligibility_fit}
                        </div>
                      ) : null}
                      <div className="mt-2 break-words text-xs leading-5 text-slate-500">{item.note}</div>
                      <div className="mt-1 break-words text-xs leading-5 text-slate-500">
                        Calculation basis: program support filtered through likely eligibility, asset mix, and customer profile.
                      </div>
                    </li>
                  ))}
                </ul>
              </MarketListCard>

              <MarketListCard title="Why act now" tone="amber">
                <ul className="space-y-3 text-sm leading-6 text-slate-700">
                  {(briefing.market_context?.broader_trends || []).map((item, index) => (
                    <li key={`${item.trend}-${index}`} className="rounded-2xl bg-white px-4 py-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 break-words font-semibold text-slate-900">{item.trend || item}</div>
                        {typeof item.estimated_customer_savings_eur === "number" ? (
                          <div className="rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                            End-user impact: {formatCurrency(item.estimated_customer_savings_eur)}
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-3 break-words text-sm leading-6 text-slate-600">
                        {item.why_act_now || item}
                      </div>
                      {typeof item.estimated_customer_savings_eur === "number" ? (
                        <div className="mt-2 text-xs leading-5 text-slate-500">
                          Estimated from avoided future energy inflation, subsidy timing, and installation timing assumptions.
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </MarketListCard>

              <MarketListCard title="Urgency factors" tone="amber">
                <ul className="space-y-3 text-sm leading-6 text-slate-700">
                  {(briefing.market_context?.urgency_factors || []).map((item, index) => {
                    const label = typeof item === "string" ? item : item.label;
                    const detail = typeof item === "string" ? item : item.detail;

                    return (
                      <li key={`${label}-${index}`} className="rounded-2xl bg-white px-4 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 break-words font-semibold text-slate-900">{label}</div>
                          {typeof item?.estimated_customer_savings_eur === "number" ? (
                            <div className="rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                              End-user impact: {formatCurrency(item.estimated_customer_savings_eur)}
                            </div>
                          ) : null}
                        </div>
                        <div className="mt-3 break-words text-sm leading-6 text-slate-600">{detail}</div>
                        {typeof item?.estimated_customer_savings_eur === "number" ? (
                          <div className="mt-2 text-xs leading-5 text-slate-500">
                            AI estimate using postcode timing pressure, household profile, and avoided-cost assumptions.
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </MarketListCard>
            </div>
          </div>
        </div>

        <RoofAreaCard leadData={leadData} />

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel sm:p-8">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-slate-900">Offer tiers</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Compare all three pathways side by side. Open the Financing tab to build the customer-specific quote and payment plan.
            </p>
          </div>

          <div className="overflow-x-auto rounded-[28px] border border-slate-200">
            <div className="grid min-w-[760px] grid-cols-4 bg-slate-50 text-sm">
              <div className="border-b border-slate-200 px-5 py-4 font-semibold text-slate-500">Comparison</div>
              {(briefing.offers || []).map((offer) => {
                const isRecommended = offer.tier === recommendedTier;
                return (
                  <div
                    key={offer.tier}
                    className={`border-b border-l px-5 py-4 ${
                      isRecommended ? "border-brand-line bg-brand-soft" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-slate-900">{offer.tier}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">{offer.why}</div>
                      </div>
                      {isRecommended ? (
                        <span className="rounded-full bg-brand px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                          Recommended
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {[
                { label: "Assets", getValue: (offer) => ({ main: offer.assets?.join(", ") || "N/A" }) },
                {
                  label: "Upfront cost (€)",
                  getValue: (offer) => ({
                    main: formatCurrency(offer.upfront_cost_eur),
                    calc: `AI estimate from selected assets, installation complexity, and postcode pricing.`,
                  }),
                },
                {
                  label: "Annual savings (€)",
                  getValue: (offer) => ({
                    main: formatCurrency(offer.annual_savings_eur),
                    calc: `AI estimate from current energy bill, self-consumption, and system output.`,
                  }),
                },
                {
                  label: "Payback period",
                  getValue: (offer) => ({
                    main: formatYears(offer.payback_years),
                    calc:
                      typeof offer.upfront_cost_eur === "number" && typeof offer.annual_savings_eur === "number" && offer.annual_savings_eur
                        ? `${formatCurrency(offer.upfront_cost_eur)} / ${formatCurrency(offer.annual_savings_eur)} per year`
                        : "AI payback estimate",
                  }),
                },
                {
                  label: "CO2 reduction (kg/year)",
                  getValue: (offer) => ({
                    main: formatCo2(offer.co2_reduction_kg),
                    calc: `AI estimate from displaced grid or fossil energy for this asset mix.`,
                  }),
                },
              ].map((row) => (
                <FragmentRow
                  key={row.label}
                  label={row.label}
                  offers={briefing.offers}
                  getValue={row.getValue}
                  recommendedTier={recommendedTier}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FragmentRow({ label, offers, getValue, recommendedTier }) {
  return (
    <>
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium text-slate-700">
        {label}
      </div>
      {(offers || []).map((offer) => (
        (() => {
          const value = getValue(offer);
          const content = typeof value === "object" ? value : { main: value };

          return (
            <div
              key={`${offer.tier}-${label}`}
              className={`border-b border-l px-5 py-4 text-sm leading-6 text-slate-700 ${
                offer.tier === recommendedTier
                  ? "border-brand-line bg-brand-soft"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div>{content.main}</div>
              {content.calc ? (
                <div className="mt-1 text-xs leading-5 text-slate-500">{content.calc}</div>
              ) : null}
            </div>
          );
        })()
      ))}
    </>
  );
}
