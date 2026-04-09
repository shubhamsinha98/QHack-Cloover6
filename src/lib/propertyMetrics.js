const HOUSEHOLD_BASE_KWH = {
  "1 person": 1900,
  "2 persons": 2900,
  "3 persons": 3800,
  "4 persons": 4700,
  "5+ persons": 5900,
};

const STATE_FACTORS = {
  "Baden-Württemberg": 1.02,
  Bavaria: 1.05,
  Berlin: 0.96,
  Brandenburg: 1.01,
  Bremen: 0.99,
  Hamburg: 0.98,
  Hesse: 1.0,
  "Lower Saxony": 1.0,
  "Mecklenburg-Vorpommern": 1.01,
  "North Rhine-Westphalia": 1.0,
  "Rhineland-Palatinate": 1.01,
  Saarland: 1.0,
  Saxony: 1.02,
  "Saxony-Anhalt": 1.01,
  "Schleswig-Holstein": 0.99,
  Thuringia: 1.02,
};

const HOUSE_TYPE_FACTORS = {
  "Detached house": 1.16,
  "Semi-detached house": 1.08,
  "Terraced / row house": 0.98,
  "Multi-family house": 1.12,
  Bungalow: 1.1,
};

const ROOF_TYPE_FACTORS = {
  "Gable roof": 1.01,
  "Hip roof": 1.03,
  "Flat roof": 0.97,
  "Shed / mono-pitch roof": 1.0,
  "Mansard roof": 1.04,
  "Complex / unsure": 1.06,
};

const FLOOR_FACTORS = {
  "1 floor": 0.94,
  "2 floors": 1.0,
  "3+ floors": 1.09,
};

const USAGE_TIME_FACTORS = {
  Morning: 1.01,
  Midday: 1.04,
  Afternoon: 1.03,
  Evening: 1.08,
  "Spread evenly throughout the day": 1.02,
};

const USAGE_TIME_DAYSHARE = {
  Morning: 0.32,
  Midday: 0.41,
  Afternoon: 0.36,
  Evening: 0.24,
  "Spread evenly throughout the day": 0.34,
};

const SEASONAL_SHARE = {
  winter: 0.31,
  spring: 0.23,
  summer: 0.18,
  autumn: 0.28,
};

const BASE_TARIFF_EUR_PER_KWH = 0.36;

const EXISTING_ASSET_GRID_SHARE = {
  None: 1,
  "Has solar": 0.72,
  "Has solar + battery": 0.55,
};

const HOUSE_TYPE_AREA_M2 = {
  "Detached house": 140,
  "Semi-detached house": 115,
  "Terraced / row house": 95,
  "Multi-family house": 180,
  Bungalow: 105,
};

const FLOOR_AREA_FACTORS = {
  "1 floor": 0.94,
  "2 floors": 1,
  "3 floors": 1.09,
  "4+ floors": 1.22,
};

const HOUSE_BUILD_HEAT_INTENSITY = {
  "Before 1980": 215,
  "1980-2000": 160,
  "2000-2015": 110,
  "After 2015": 72,
};

const HEATING_SYSTEM_RATES = {
  Gas: 0.11,
  Oil: 0.13,
  "District heating": 0.16,
  "Heat pump already": 0.09,
};

const HEATING_SYSTEM_EFFICIENCY = {
  Gas: 1,
  Oil: 1.05,
  "District heating": 0.92,
  "Heat pump already": 0.38,
};

export function deriveStateFromPostcode(postcode) {
  const prefix = Number(String(postcode || "").trim().slice(0, 2));

  if (Number.isNaN(prefix)) {
    return "";
  }

  if (prefix >= 1 && prefix <= 9) return "Saxony";
  if (prefix >= 10 && prefix <= 19) return "Berlin";
  if (prefix >= 20 && prefix <= 29) return "Hamburg";
  if (prefix >= 30 && prefix <= 34) return "Lower Saxony";
  if (prefix >= 35 && prefix <= 39) return "Hesse";
  if (prefix >= 40 && prefix <= 59) return "North Rhine-Westphalia";
  if (prefix >= 60 && prefix <= 65) return "Hesse";
  if (prefix === 66) return "Saarland";
  if (prefix >= 67 && prefix <= 69) return "Rhineland-Palatinate";
  if (prefix >= 70 && prefix <= 79) return "Baden-Württemberg";
  if (prefix >= 80 && prefix <= 97) return "Bavaria";
  if (prefix >= 98 && prefix <= 99) return "Thuringia";

  return "";
}

function normalizeHouseholdSize(value) {
  switch (value) {
    case "1-2 people":
      return "2 persons";
    case "3-4 people":
      return "4 persons";
    case "5+ people":
      return "5+ persons";
    default:
      return value || "";
  }
}

function normalizeRoofType(value) {
  switch (value) {
    case "Slightly pitched roof":
      return "Shed / mono-pitch roof";
    case "Steep pitch roof":
      return "Mansard roof";
    default:
      return value || "";
  }
}

function normalizeFloors(value) {
  if (value === "3 floors" || value === "4+ floors") {
    return "3+ floors";
  }

  return value || "";
}

function normalizeUsageTime(value) {
  switch (value) {
    case "Mostly morning":
      return "Morning";
    case "Mostly midday":
      return "Midday";
    case "Mostly afternoon":
      return "Afternoon";
    case "Mostly evening":
      return "Evening";
    case "Balanced through the day":
      return "Spread evenly throughout the day";
    default:
      return value || "";
  }
}

export function getPropertyMetrics(leadData) {
  const state = deriveStateFromPostcode(leadData.postcode);
  const householdSize = normalizeHouseholdSize(leadData.householdSize);
  const roofType = normalizeRoofType(leadData.roofType);
  const floors = normalizeFloors(leadData.floors);
  const electricityUsageTime = normalizeUsageTime(leadData.electricityUsageTime);

  const base = HOUSEHOLD_BASE_KWH[householdSize] || 3200;
  const stateFactor = STATE_FACTORS[state] || 1;
  const houseTypeFactor = HOUSE_TYPE_FACTORS[leadData.houseType] || 1;
  const roofFactor = ROOF_TYPE_FACTORS[roofType] || 1;
  const floorFactor = FLOOR_FACTORS[floors] || 1;
  const usageFactor = USAGE_TIME_FACTORS[electricityUsageTime] || 1;

  const annualKwh = Math.round(
    base * stateFactor * houseTypeFactor * roofFactor * floorFactor * usageFactor,
  );
  const peakDayShare = USAGE_TIME_DAYSHARE[electricityUsageTime] || 0.34;
  const dayLoadKwh = Math.round(annualKwh * peakDayShare);
  const seasonal = {
    winter: Math.round(annualKwh * SEASONAL_SHARE.winter),
    spring: Math.round(annualKwh * SEASONAL_SHARE.spring),
    summer: Math.round(annualKwh * SEASONAL_SHARE.summer),
  };
  seasonal.autumn = annualKwh - seasonal.winter - seasonal.spring - seasonal.summer;

  const peakLabel =
    electricityUsageTime === "Spread evenly throughout the day"
      ? "Evenly distributed daytime share"
      : `${electricityUsageTime || "Daytime"} daytime-aligned share`;

  const gridShare = EXISTING_ASSET_GRID_SHARE[leadData.existingAssets] || 1;
  const tariffPerKwh = BASE_TARIFF_EUR_PER_KWH * stateFactor;
  const gridAnnualKwh = Math.round(annualKwh * gridShare);
  const electricityAnnualCost = Math.round(gridAnnualKwh * tariffPerKwh);
  const electricityMonthlyCost = Math.round(electricityAnnualCost / 12);

  const heatedFloorAreaM2 = Math.round(
    (HOUSE_TYPE_AREA_M2[leadData.houseType] || 120) * (FLOOR_AREA_FACTORS[leadData.floors] || 1),
  );
  const heatIntensity = HOUSE_BUILD_HEAT_INTENSITY[leadData.houseBuildYear] || 145;
  const heatingRatePerKwh = HEATING_SYSTEM_RATES[leadData.existingHeating] || 0;
  const heatingSystemFactor = HEATING_SYSTEM_EFFICIENCY[leadData.existingHeating] || 1;
  const annualHeatingDemandKwh =
    leadData.existingHeating && heatingRatePerKwh
      ? Math.round(heatedFloorAreaM2 * heatIntensity * heatingSystemFactor)
      : 0;
  const annualHeatingCost = Math.round(annualHeatingDemandKwh * heatingRatePerKwh);
  const totalAnnualEnergyCost = electricityAnnualCost + annualHeatingCost;
  const totalMonthlyEnergyCost = Math.round(totalAnnualEnergyCost / 12);

  return {
    state,
    householdSize,
    roofType,
    floors,
    electricityUsageTime,
    annualKwh,
    dayLoadKwh,
    seasonal,
    peakLabel,
    assumptions: [
      "Household size sets the base annual demand.",
      "State and building form adjust the estimate for regional and structural variation.",
      "Roof and usage timing slightly shift the model to reflect planning behavior and seasonality.",
    ],
    gridShare,
    tariffPerKwh,
    gridAnnualKwh,
    electricityAnnualCost,
    electricityMonthlyCost,
    heatedFloorAreaM2,
    heatIntensity,
    heatingRatePerKwh,
    heatingSystemFactor,
    annualHeatingDemandKwh,
    annualHeatingCost,
    totalAnnualEnergyCost,
    totalMonthlyEnergyCost,
  };
}

export function getDerivedElectricityMonthlyCost(leadData) {
  return getPropertyMetrics(leadData).electricityMonthlyCost;
}
