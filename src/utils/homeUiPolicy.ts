import { DemoRole, DeviceListing } from '../types/marketplace';

export interface DemoVisibilityInput {
  role: DemoRole;
  isDev: boolean;
  search?: string;
  hasSessionDemoFlag?: boolean;
}

/**
 * Floating Demo controls are hidden from ordinary production customers.
 * They only appear in authorized contexts:
 * - Signed-in Admin role
 * - Explicit preview/demo URL flag (?demo=1 or ?preview=1) or persisted preview session
 * - Local development server (unless ?prod_preview=1 is explicitly supplied to simulate production)
 */
export function shouldShowDemoControls(input: DemoVisibilityInput): boolean {
  const search = input.search || '';
  if (/(?:\?|&)prod_preview=1(?:&|$)/.test(search)) {
    return false;
  }
  if (input.role === 'admin') {
    return true;
  }
  if (/(?:\?|&)(?:demo|preview)=1(?:&|$)/.test(search)) {
    return true;
  }
  if (input.hasSessionDemoFlag) {
    return true;
  }
  return Boolean(input.isDev);
}

/**
 * Selects top popular devices from real active inventory without fabricating fields.
 */
export function selectPopularDevices(
  activeListings: DeviceListing[],
  limit: number = 8
): DeviceListing[] {
  const scored = [...activeListings].sort((a, b) => {
    const scoreA =
      (a.views || 0) +
      (a.modelReviewCount || 0) * 4 +
      (a.sellerSalesCount || 0) +
      (a.usedRightInspected ? 40 : 0);
    const scoreB =
      (b.views || 0) +
      (b.modelReviewCount || 0) * 4 +
      (b.sellerSalesCount || 0) +
      (b.usedRightInspected ? 40 : 0);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.id.localeCompare(b.id);
  });
  return scored.slice(0, Math.max(0, limit));
}

export interface CardReviewDisplay {
  modelRating: number | null;
  modelReviewCount: number | null;
  sellerRating: number | null;
}

/**
 * Extracts verified, non-fabricated model review and seller rating metadata.
 * Never invents missing ratings or review counts.
 */
export function getCardReviewDisplay(listing: DeviceListing): CardReviewDisplay {
  const modelRating =
    typeof listing.modelRating === 'number' &&
    Number.isFinite(listing.modelRating) &&
    listing.modelRating > 0
      ? listing.modelRating
      : null;

  const modelReviewCount =
    modelRating !== null &&
    typeof listing.modelReviewCount === 'number' &&
    Number.isFinite(listing.modelReviewCount) &&
    listing.modelReviewCount > 0
      ? listing.modelReviewCount
      : null;

  const sellerRating =
    typeof listing.sellerRating === 'number' &&
    Number.isFinite(listing.sellerRating) &&
    listing.sellerRating > 0
      ? listing.sellerRating
      : null;

  return {
    modelRating,
    modelReviewCount,
    sellerRating,
  };
}
