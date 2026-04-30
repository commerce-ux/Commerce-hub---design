import type { QuantityPricingTier } from "./types";

/** Resolves the unit price for a given quantity from pricing tiers. */
export function resolvePricingTier(tiers: QuantityPricingTier[], qty: number): number {
  for (const tier of [...tiers].reverse()) {
    if (qty >= tier.minQty) return tier.unitPrice;
  }
  return tiers[0]?.unitPrice ?? 0;
}

/** Computes the step size to use within each pricing tier range. */
export function computeIncrementRanges(
  tiers: QuantityPricingTier[],
  minQty: number,
  maxQty: number
): { from: number; to: number; step: number; unitPrice: number }[] {
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  return sorted.map((tier, i) => {
    const from = Math.max(tier.minQty, minQty);
    const to = i + 1 < sorted.length ? sorted[i + 1].minQty : maxQty;
    const width = to - from;
    const step = width <= 100 ? 50 : 100;
    return { from, to, step, unitPrice: tier.unitPrice };
  });
}

/** Generates the ordered list of quantity options for a product's Select/pricing guide. */
export function generateGuideQuantities(
  tiers: QuantityPricingTier[],
  minQty: number,
  maxQty: number
): number[] {
  const ranges = computeIncrementRanges(tiers, minQty, maxQty);
  const seen = new Set<number>();
  const qtys: number[] = [];

  for (const range of ranges) {
    for (let q = range.from; q < range.to; q += range.step) {
      if (q >= minQty && q <= maxQty && !seen.has(q)) {
        seen.add(q);
        qtys.push(q);
      }
    }
  }

  if (!seen.has(maxQty)) qtys.push(maxQty);
  return qtys.sort((a, b) => a - b);
}
