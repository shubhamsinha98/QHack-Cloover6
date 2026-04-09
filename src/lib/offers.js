export function getOfferScore(offer) {
  if (!offer) {
    return -Infinity;
  }

  const savings = Number(offer.annual_savings_eur) || 0;
  const payback = Number(offer.payback_years) || 99;
  const upfront = Number(offer.upfront_cost_eur) || 0;
  const co2 = Number(offer.co2_reduction_kg) || 0;

  return savings * 0.45 + co2 * 0.02 - payback * 900 - upfront * 0.03;
}

export function getRecommendedOffer(offers = []) {
  return [...offers].sort((left, right) => getOfferScore(right) - getOfferScore(left))[0] || null;
}

export function getRecommendedTier(offers = []) {
  return getRecommendedOffer(offers)?.tier || offers?.[0]?.tier || "";
}
