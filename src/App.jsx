import { useState } from "react";
import Briefing from "./components/Briefing";
import BriefingWorkspace from "./components/BriefingWorkspace";
import FinancingWorkspace from "./components/FinancingWorkspace";
import ReportsWorkspace from "./components/ReportsWorkspace";
import SalesCoach from "./components/SalesCoach";
import AuthPortal from "./components/AuthPortal";
import CustomersPanel from "./components/CustomersPanel";
import { callGPT } from "./lib/openai";
import { saveUser } from "./lib/api";
import {
  deriveStateFromPostcode,
  getDerivedElectricityMonthlyCost,
  getPropertyMetrics,
} from "./lib/propertyMetrics";
import { parseModelJson } from "./lib/openai";
import { getSolarSizingMetrics } from "./lib/osmRoofTools";

const BRIEFING_SYSTEM_PROMPT = `You are an AI sales co-pilot for a German residential clean energy installer.
Given a lead's details, generate a structured sales briefing as a JSON object.
Respond ONLY with valid JSON. No markdown, no backticks, no explanation.

The JSON must follow this exact shape:
{
  "market_context": {
    "urgency_level": "Very urgent | Urgent | Mildly urgent",
    "urgency_summary": "string — 1 sentence explaining why the level applies now",
    "energy_price_trend": "string — 1 sentence on local energy price direction",
    "price_projection": {
      "current_annual_cost_eur": number,
      "year_2_annual_cost_eur": number,
      "year_5_annual_cost_eur": number,
      "year_10_annual_cost_eur": number,
      "do_nothing_cost_increase_eur": number
    },
    "regulations": [
      {
        "name": "string",
        "timeline": "string",
        "impact": "string",
        "estimated_customer_savings_eur": number
      }
    ],
    "subsidies": [
      {
        "name": "string",
        "amount": "string",
        "estimated_customer_benefit_eur": number,
        "eligibility_fit": "string",
        "note": "string"
      }
    ],
    "broader_trends": [
      {
        "trend": "string",
        "why_act_now": "string",
        "estimated_customer_savings_eur": number
      }
    ],
    "urgency_factors": [
      {
        "label": "string",
        "detail": "string",
        "estimated_customer_savings_eur": number
      }
    ]
  },
  "offers": [
    {
      "tier": "Starter",
      "assets": ["string"],
      "why": "string — causal logic for this bundle",
      "upfront_cost_eur": number,
      "annual_savings_eur": number,
      "payback_years": number,
      "co2_reduction_kg": number
    },
    { "tier": "Recommended", ... },
    { "tier": "Full Independence", ... }
  ],
  "financing": [
    {
      "offer_tier": "Starter",
      "cash": { "total": number, "note": "string" },
      "partial": { "upfront": number, "monthly": number, "term_years": number, "rate_pct": number },
      "full_finance": { "monthly": number, "term_years": number, "total_cost": number },
      "subsidies_applied": ["string"],
      "net_cost_after_subsidy": number
    },
    { "offer_tier": "Recommended", ... },
    { "offer_tier": "Full Independence", ... }
  ]
}

Base all numbers on realistic German market data (2024-2025).
KfW 270 and BAFA BEG subsidies apply where relevant.
Tailor everything to the specific postcode, product interest, and household details provided.
Quantify the customer's likely energy spend today and projected annual spend in 2, 5, and 10 years if they do nothing.
Make the regulations specific to German residential energy transition drivers including GEG 65% renewable heating rule, rising carbon prices, and municipal heat planning deadlines where relevant.
For regulations, subsidies, broader trends, and urgency factors, include realistic euro-denominated customer benefit or avoided-cost estimates.
If a roof surface area or usable roof area from an OpenStreetMap building polygon is provided, use it to tailor solar and battery sizing assumptions.
Use concise, sales-ready language that is easy to scan in a mobile document.`;

const initialLeadData = {
  address: "",
  postcode: "",
  productInterest: "Solar panels",
  householdSize: "",
  customerAge: "",
  houseBuildYear: "",
  roofDirection: "",
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

function buildLeadSummary(leadData) {
  const derivedState = deriveStateFromPostcode(leadData.postcode);
  const propertyMetrics = getPropertyMetrics(leadData);
  const derivedElectricityMonthlyCost = getDerivedElectricityMonthlyCost(leadData);
  const solarSizingMetrics = getSolarSizingMetrics(leadData);
  const parts = [
    `Address: ${leadData.address || "Not provided"}`,
    `Postcode: ${leadData.postcode}`,
    `Product interest: ${leadData.productInterest}`,
  ];

  if (leadData.householdSize) {
    parts.push(`Household: ${leadData.householdSize}`);
  }
  if (leadData.customerAge) {
    parts.push(`Customer age: ${leadData.customerAge}`);
  }
  if (leadData.houseBuildYear) {
    parts.push(`House built: ${leadData.houseBuildYear}`);
  }
  if (leadData.roofDirection) {
    parts.push(`Roof: ${leadData.roofDirection}`);
  }
  if (leadData.existingHeating) {
    parts.push(`Existing heating: ${leadData.existingHeating}`);
  }
  if (leadData.existingAssets) {
    parts.push(`Existing assets: ${leadData.existingAssets}`);
  }
  parts.push(`Derived monthly electricity baseline: EUR ${derivedElectricityMonthlyCost}`);
  if (leadData.customerConcerns) {
    parts.push(`Customer concerns: ${leadData.customerConcerns}`);
  }
  if (derivedState) {
    parts.push(`Derived region from postcode: ${derivedState}`);
  }
  if (leadData.houseType) {
    parts.push(`House type: ${leadData.houseType}`);
  }
  if (leadData.roofType) {
    parts.push(`Roof type: ${leadData.roofType}`);
  }
  if (leadData.floors) {
    parts.push(`Floors: ${leadData.floors}`);
  }
  if (leadData.electricityUsageTime) {
    parts.push(`Electricity usage pattern: ${leadData.electricityUsageTime}`);
  }
  if (leadData.roofBuildingLabel) {
    parts.push(`OpenStreetMap selected building: ${leadData.roofBuildingLabel}`);
  }
  if (leadData.roofSelectionMode) {
    parts.push(`Roof selection mode: ${leadData.roofSelectionMode}`);
  }
  if (leadData.roofFootprintAreaM2) {
    parts.push(`Roof footprint area from polygon: ${leadData.roofFootprintAreaM2} m2`);
  }
  if (leadData.roofSurfaceAreaM2) {
    parts.push(`Surface roof area from building polygon: ${leadData.roofSurfaceAreaM2} m2`);
  }
  if (leadData.usableRoofAreaM2) {
    parts.push(
      `Usable roof area: ${leadData.usableRoofAreaM2} m2 at ${leadData.usableRoofPct || 75}% usable share`,
    );
  }
  if (solarSizingMetrics.panelCount > 0) {
    parts.push(
      `Deterministic roof sizing estimate: ${solarSizingMetrics.panelCount} solar panels using ${solarSizingMetrics.effectivePanelAreaM2} m2 effective installable area`,
    );
    parts.push(
      `Estimated solar system power from roof area: ${solarSizingMetrics.systemSizeKw} kWp based on ${solarSizingMetrics.panelPowerKw} kW per panel and ${solarSizingMetrics.layoutEfficiency * 100}% layout efficiency`,
    );
  }
  parts.push(
    `Rule-based electricity estimate: ${propertyMetrics.annualKwh} kWh/year with ${propertyMetrics.dayLoadKwh} kWh/year daytime-aligned demand`,
  );
  parts.push(
    `Seasonal electricity split: winter ${propertyMetrics.seasonal.winter} kWh, spring ${propertyMetrics.seasonal.spring} kWh, summer ${propertyMetrics.seasonal.summer} kWh, autumn ${propertyMetrics.seasonal.autumn} kWh`,
  );
  parts.push(
    `Estimated imported-grid share after existing assets: ${Math.round(propertyMetrics.gridShare * 100)}%`,
  );
  parts.push(
    `Estimated annual electricity cost baseline: EUR ${propertyMetrics.electricityAnnualCost}`,
  );
  if (propertyMetrics.annualHeatingCost) {
    parts.push(
      `Estimated annual heating cost baseline: EUR ${propertyMetrics.annualHeatingCost} from ${propertyMetrics.annualHeatingDemandKwh} kWh heating demand using ${leadData.existingHeating}`,
    );
  }
  parts.push(`Estimated total annual energy cost baseline: EUR ${propertyMetrics.totalAnnualEnergyCost}`);
  return parts.join(", ");
}

function mapCustomerToLeadData(customer) {
  return {
    address: customer.address || "",
    postcode: customer.postcode || "",
    productInterest: customer.productInterest || "Solar panels",
    householdSize: customer.householdSize || "",
    customerAge: customer.customerAge || "",
    houseBuildYear: customer.houseBuildYear || "",
    roofDirection: customer.roofDirection || "",
    existingHeating: customer.existingHeating || "",
    existingAssets: customer.existingAssets || "",
    monthlyEnergyBill: customer.monthlyEnergyBill || "",
    customerConcerns: customer.customerConcerns || "",
    houseType: customer.houseType || "",
    roofType: customer.roofType || "",
    floors: customer.floors || "",
    electricityUsageTime: customer.electricityUsageTime || "",
    roofSearchQuery: customer.roofSearchQuery || "",
    roofSearchResult: customer.roofSearchResult || "",
    roofSearchLat: customer.roofSearchLat || "",
    roofSearchLng: customer.roofSearchLng || "",
    roofSelectionMode: customer.roofSelectionMode || "manual",
    roofBuildingId: customer.roofBuildingId || "",
    roofBuildingLabel: customer.roofBuildingLabel || "",
    roofPolygon: customer.roofPolygon || [],
    roofFootprintAreaM2: customer.roofFootprintAreaM2 || "",
    roofSurfaceAreaM2: customer.roofSurfaceAreaM2 || "",
    usableRoofPct: customer.usableRoofPct || 75,
    usableRoofAreaM2: customer.usableRoofAreaM2 || "",
  };
}

export default function App() {
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [activeTab, setActiveTab] = useState("customers");
  const [leadData, setLeadData] = useState(initialLeadData);
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [briefingError, setBriefingError] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  const currentUser = users.find((user) => user.id === currentUserId) || null;
  const selectedCustomer =
    currentUser?.customers?.find((customer) => customer.id === selectedCustomerId) || null;
  const hasReportOpen = Boolean(
    selectedCustomer ||
      briefing ||
      currentUser?.customers?.some((customer) => customer.reportStatus === "ready"),
  );

  async function persistUserUpdate(nextUser) {
    setUsers((current) => {
      const exists = current.some((item) => item.id === nextUser.id);
      return exists
        ? current.map((item) => (item.id === nextUser.id ? nextUser : item))
        : [nextUser, ...current];
    });

    try {
      const savedUser = await saveUser(nextUser);
      setUsers((current) => current.map((item) => (item.id === savedUser.id ? savedUser : item)));
      return savedUser;
    } catch (error) {
      console.error("Database sync failed, keeping local state only.", error);
      return nextUser;
    }
  }

  async function handleGenerate(nextLeadData) {
    setLeadData(nextLeadData);
    setActiveTab("briefing");
    setLoading(true);
    setBriefingError("");
    setBriefing(null);

    try {
      const raw = await callGPT(BRIEFING_SYSTEM_PROMPT, buildLeadSummary(nextLeadData));

      try {
        const parsed = parseModelJson(raw);
        setBriefing(parsed);
      } catch (error) {
        console.error("Failed to parse briefing JSON", error);
        setBriefingError("The AI returned an invalid briefing format. Please try again.");
      }
    } catch (error) {
      console.error(error);
      setBriefingError(error.message || "Unable to generate briefing.");
    } finally {
      setLoading(false);
    }
  }

  async function generateBriefingReport(nextLeadData) {
    const raw = await callGPT(BRIEFING_SYSTEM_PROMPT, buildLeadSummary(nextLeadData));
    return parseModelJson(raw);
  }

  function handleNewLead() {
    setActiveTab("briefing");
    setSelectedCustomerId(null);
    setBriefing(null);
    setBriefingError("");
    setLoading(false);
  }

  function handleBackToReportsWorkspace() {
    setActiveTab("reports");
    setSelectedCustomerId(null);
    setBriefing(null);
    setBriefingError("");
    setLoading(false);
  }

  async function openCustomerInWorkspace(customer, targetTab) {
    const nextLeadData = mapCustomerToLeadData(customer);

    setSelectedCustomerId(customer.id);
    setLeadData((current) => ({ ...current, ...nextLeadData }));
    setActiveTab(targetTab);
    setBriefingError("");
    setLoading(true);

    if (customer.briefing) {
      setBriefing(customer.briefing);
      setLoading(false);
      return;
    }

    setBriefing(null);

    try {
      const parsed = await generateBriefingReport(nextLeadData);
      setBriefing(parsed);
      if (currentUser) {
        await persistUserUpdate({
          ...currentUser,
          customers: (currentUser.customers || []).map((item) =>
            item.id === customer.id ? { ...item, briefing: parsed } : item,
          ),
        });
      }
    } catch (error) {
      console.error(error);
      setBriefingError(
        error instanceof SyntaxError
          ? "The AI returned an invalid briefing format. Please try again."
          : error.message || "Unable to generate briefing.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCustomerBriefing(customer) {
    await openCustomerInWorkspace(customer, "briefing");
  }

  async function handleCustomerReports(customer) {
    await openCustomerInWorkspace(customer, "reports");
  }

  async function handleDeleteCustomerReport(customerId) {
    if (!currentUser) {
      return;
    }

    const nextCustomers = (currentUser.customers || []).filter((item) => item.id !== customerId);

    await persistUserUpdate({
      ...currentUser,
      customers: nextCustomers,
    });

    if (selectedCustomerId === customerId) {
      setSelectedCustomerId(null);
      setLeadData(initialLeadData);
      setBriefing(null);
      setBriefingError("");
      setLoading(false);
    }
  }

  async function handleRegenerateCustomerReport(updatedLeadData) {
    if (!selectedCustomerId) {
      return;
    }

    setLeadData((current) => ({ ...current, ...updatedLeadData }));
    setBriefing(null);
    setBriefingError("");
    setLoading(true);

    if (currentUser) {
      setUsers((current) =>
        current.map((user) =>
          user.id === currentUserId
            ? {
                ...user,
                customers: (user.customers || []).map((item) =>
                  item.id === selectedCustomerId
                    ? { ...item, ...updatedLeadData, reportStatus: "generating" }
                    : item,
                ),
              }
            : user,
        ),
      );
    }

    try {
      const parsed = await generateBriefingReport(updatedLeadData);
      setBriefing(parsed);
      if (currentUser) {
        await persistUserUpdate({
          ...currentUser,
          customers: (currentUser.customers || []).map((item) =>
            item.id === selectedCustomerId
              ? { ...item, ...updatedLeadData, briefing: parsed, reportStatus: "ready" }
              : item,
          ),
        });
      }
    } catch (error) {
      console.error(error);
      setBriefingError(
        error instanceof SyntaxError
          ? "The AI returned an invalid briefing format. Please try again."
          : error.message || "Unable to generate briefing.",
      );
      if (currentUser) {
        try {
          await persistUserUpdate({
            ...currentUser,
            customers: (currentUser.customers || []).map((item) =>
              item.id === selectedCustomerId
                ? { ...item, ...updatedLeadData, reportStatus: "error" }
                : item,
            ),
          });
        } catch (saveError) {
          console.error(saveError);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCoachLeadUpdate(partialLeadUpdate) {
    const cleanedUpdate = Object.fromEntries(
      Object.entries(partialLeadUpdate || {}).filter(([, value]) => {
        if (Array.isArray(value)) {
          return value.length > 0;
        }

        return value !== undefined && value !== null && value !== "";
      }),
    );

    if (!Object.keys(cleanedUpdate).length) {
      return { leadData, briefing };
    }

    const nextLeadData = { ...leadData, ...cleanedUpdate };
    setLeadData(nextLeadData);

    if (!selectedCustomerId) {
      return { leadData: nextLeadData, briefing };
    }

    if (currentUser) {
      setUsers((current) =>
        current.map((user) =>
          user.id === currentUserId
            ? {
                ...user,
                customers: (user.customers || []).map((item) =>
                  item.id === selectedCustomerId ? { ...item, ...cleanedUpdate } : item,
                ),
              }
            : user,
        ),
      );
    }

    setBriefing(null);
    setBriefingError("");
    setLoading(true);

    if (currentUser) {
      setUsers((current) =>
        current.map((user) =>
          user.id === currentUserId
            ? {
                ...user,
                customers: (user.customers || []).map((item) =>
                  item.id === selectedCustomerId
                    ? { ...item, ...cleanedUpdate, reportStatus: "generating" }
                    : item,
                ),
              }
            : user,
        ),
      );
    }

    try {
      const parsed = await generateBriefingReport(nextLeadData);
      setBriefing(parsed);

      if (currentUser) {
        await persistUserUpdate({
          ...currentUser,
          customers: (currentUser.customers || []).map((item) =>
            item.id === selectedCustomerId
              ? { ...item, ...cleanedUpdate, briefing: parsed, reportStatus: "ready" }
              : item,
          ),
        });
      }

      return { leadData: nextLeadData, briefing: parsed };
    } catch (error) {
      console.error(error);
      setBriefingError(
        error instanceof SyntaxError
          ? "The AI returned an invalid briefing format. Please try again."
          : error.message || "Unable to generate briefing.",
      );

      return { leadData: nextLeadData, briefing: null };
    } finally {
      setLoading(false);
    }
  }

  function handleAuthenticate(user) {
    setUsers((current) => {
      const exists = current.some((item) => item.id === user.id);
      return exists ? current.map((item) => (item.id === user.id ? user : item)) : [user, ...current];
    });
    setCurrentUserId(user.id);
    setActiveTab("customers");
  }

  async function handleAddCustomer(customer) {
    const leadForReport = mapCustomerToLeadData(customer);

    setSelectedCustomerId(customer.id);
    setLeadData((current) => ({ ...current, ...leadForReport }));
    setActiveTab("briefing");
    setBriefing(null);
    setBriefingError("");
    setLoading(true);

    if (currentUser) {
      setUsers((current) =>
        current.map((user) =>
          user.id === currentUserId
            ? {
                ...user,
                customers: [
                  { ...customer, ...leadForReport, briefing: null, reportStatus: "generating" },
                  ...(user.customers || []),
                ],
              }
            : user,
        ),
      );
    }

    try {
      const parsed = await generateBriefingReport(leadForReport);
      setBriefing(parsed);
      setLoading(false);
      if (currentUser) {
        await persistUserUpdate({
          ...currentUser,
          customers: [
            {
              ...customer,
              ...leadForReport,
              briefing: parsed,
              reportStatus: "ready",
            },
            ...(currentUser.customers || []),
          ],
        });
      }
    } catch (error) {
      console.error(error);
      setBriefingError(
        error instanceof SyntaxError
          ? "The AI returned an invalid briefing format. Please try again."
          : error.message || "Unable to generate briefing.",
      );
      setLoading(false);
      if (currentUser) {
        try {
          await persistUserUpdate({
            ...currentUser,
            customers: [
              {
                ...customer,
                ...leadForReport,
                briefing: null,
                reportStatus: "error",
              },
              ...(currentUser.customers || []),
            ],
          });
        } catch (saveError) {
          console.error(saveError);
        }
      }
    }
  }

  function handleSignOut() {
    setCurrentUserId(null);
    setActiveTab("customers");
    setSelectedCustomerId(null);
    setBriefing(null);
    setBriefingError("");
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(29,62,255,0.1),_transparent_28%),linear-gradient(180deg,_#ffffff_0%,_#f5f8ff_52%,_#eef3ff_100%)] text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="relative mb-6 overflow-hidden rounded-[32px] border border-brand-line/80 bg-white/90 p-5 shadow-shell backdrop-blur sm:p-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">
                Cloover
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                AI sales co-pilot
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Clean-energy briefings built for reps on the move.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Build a lead-ready sales brief with German subsidy context, tiered offers,
                financing options, and live objection coaching in one place.
              </p>
            </div>

            {currentUser ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-brand-line bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand hover:text-brand-deep"
              >
                Sign out
              </button>
            ) : null}
          </div>
        </header>

        <main className="flex-1">
          {!currentUser ? (
            <AuthPortal onAuthenticate={handleAuthenticate} />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
              <aside className="rounded-[32px] border border-brand-line/80 bg-white/95 p-4 shadow-shell">
                <div className="mb-5 rounded-[28px] border border-brand-line bg-[linear-gradient(180deg,#f5f8ff,#eef3ff)] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-deep">
                    Logged in
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{currentUser.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{currentUser.organisation}</p>
                </div>
                <nav className="grid gap-2">
                  {[
                    { id: "customers", label: "Customers" },
                    { id: "briefing", label: "Briefing" },
                    { id: "reports", label: "Reports" },
                    { id: "financing", label: "Financing" },
                    { id: "sales-coach", label: "Sales Coach" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      disabled={(tab.id === "briefing" || tab.id === "reports" || tab.id === "financing") && !hasReportOpen}
                      className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                        activeTab === tab.id
                          ? "bg-brand text-white shadow-[0_14px_30px_rgba(29,62,255,0.22)]"
                          : "border border-transparent bg-slate-50 text-slate-700 hover:border-brand-line hover:bg-brand-soft hover:text-slate-900"
                      } disabled:cursor-not-allowed disabled:border-transparent disabled:bg-slate-100 disabled:text-slate-400`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </aside>

              <div>
                {activeTab === "customers" ? (
                  <CustomersPanel
                    currentUser={currentUser}
                    onAddCustomer={handleAddCustomer}
                  />
                ) : activeTab === "sales-coach" ? (
                  <SalesCoach
                    selectedCustomer={selectedCustomer}
                    leadData={leadData}
                    briefing={briefing}
                    onApplyLeadUpdates={handleCoachLeadUpdate}
                  />
                ) : activeTab === "reports" ? (
                  <ReportsWorkspace
                    customers={currentUser.customers || []}
                    selectedCustomer={selectedCustomer}
                    leadData={leadData}
                    briefing={briefing}
                    onSelectCustomer={handleCustomerReports}
                    onBackToList={handleBackToReportsWorkspace}
                  />
                ) : activeTab === "financing" ? (
                  <FinancingWorkspace
                    customers={currentUser.customers || []}
                    selectedCustomer={selectedCustomer}
                    leadData={leadData}
                    briefing={briefing}
                    onSelectCustomer={handleCustomerBriefing}
                    onBackToList={handleNewLead}
                    onDeleteCustomerReport={handleDeleteCustomerReport}
                  />
                ) : (
                  <BriefingWorkspace
                    customers={currentUser.customers || []}
                    selectedCustomer={selectedCustomer}
                    leadData={leadData}
                    briefing={briefing}
                    loading={loading}
                    error={briefingError}
                    onSelectCustomer={handleCustomerBriefing}
                    onBackToList={handleNewLead}
                    onRetry={() => handleCustomerBriefing(selectedCustomer)}
                    onRegenerateCustomer={handleRegenerateCustomerReport}
                    onDeleteCustomerReport={handleDeleteCustomerReport}
                  />
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
