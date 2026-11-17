import {
  BundleItemSummary,
  CartItem,
  DeliveryConfig,
  DeliveryMethod,
  DeviceListing,
  GiftOrderDetails,
  GiftSenderVisibility,
  ListingFilters,
  Order,
  CosmeticGrade,
  PaymentRequestItemSnapshot,
  PaymentRequestRecord,
  PlatformConfig,
  PlatformFeeConfig,
  PromoBadgeType,
  VendorStorefront,
} from '../types/marketplace';
import { getListingVendorState, normalizeNigerianState } from './nigerianStates';

// Approved UsedRight platform fee ceilings and defaults
export const MAX_CUSTOMER_FEE_RATE = 0.007; // 0.7% max
export const MAX_VENDOR_FEE_RATE = 0.01; // 1.0% max
export const MAX_COMBINED_FEE_RATE = 0.017; // 1.7% max combined
export const BUYER_FEE_RATE = 0.007; // 0.7% Customer Platform Service Fee
export const SELLER_FEE_RATE = 0.01; // 1.0% Vendor Platform Service Fee
export const DEFAULT_FIXED_DELIVERY_FEE = 3000; // ₦3,000 fixed delivery per vendor

export function calculateBuyerServiceCharge(
  itemPrice: number,
  rate: number = BUYER_FEE_RATE
): number {
  if (itemPrice <= 0 || rate <= 0) return 0;
  const clamped = Math.min(rate, MAX_CUSTOMER_FEE_RATE);
  return Math.round(itemPrice * clamped);
}

export function calculateSellerServiceCharge(
  itemPrice: number,
  rate: number = SELLER_FEE_RATE
): number {
  if (itemPrice <= 0 || rate <= 0) return 0;
  const clamped = Math.min(rate, MAX_VENDOR_FEE_RATE);
  return Math.round(itemPrice * clamped);
}

export function calculateSellerNetPayout(
  itemPrice: number,
  rate: number = SELLER_FEE_RATE
): number {
  const fee = calculateSellerServiceCharge(itemPrice, rate);
  return Math.max(0, itemPrice - fee);
}

export function calculateOrderFinancials(
  itemPrice: number,
  deliveryFee: number,
  accessoriesPrice: number = 0,
  referralDiscount: number = 0,
  customerFeeRate: number = BUYER_FEE_RATE
) {
  const subtotal = itemPrice + accessoriesPrice;
  const serviceCharge = calculateBuyerServiceCharge(subtotal, customerFeeRate);
  const total = Math.max(0, subtotal + serviceCharge + deliveryFee - referralDiscount);
  return {
    itemPrice,
    accessoriesPrice,
    subtotal,
    serviceCharge,
    customer_platform_service_fee: serviceCharge,
    customerFeeRate,
    deliveryFee,
    referralDiscount,
    total,
  };
}

export function validatePlatformFeeConfig(input: {
  customerFeeRate: number;
  vendorFeeRate: number;
  vendorSpecificRates?: Record<string, number>;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!Number.isFinite(input.customerFeeRate) || input.customerFeeRate < 0) {
    errors.push('Customer Platform Service Fee rate cannot be negative.');
  } else if (input.customerFeeRate > MAX_CUSTOMER_FEE_RATE + 1e-9) {
    errors.push('Customer Platform Service Fee cannot exceed the maximum 0.7% limit.');
  }

  if (!Number.isFinite(input.vendorFeeRate) || input.vendorFeeRate < 0) {
    errors.push('Vendor Platform Service Fee rate cannot be negative.');
  } else if (input.vendorFeeRate > MAX_VENDOR_FEE_RATE + 1e-9) {
    errors.push('Vendor Platform Service Fee cannot exceed the maximum 1.0% limit.');
  }

  if (input.vendorSpecificRates) {
    for (const [vendorId, rate] of Object.entries(input.vendorSpecificRates)) {
      if (!Number.isFinite(rate) || rate < 0 || rate > MAX_VENDOR_FEE_RATE + 1e-9) {
        errors.push(`Negotiated vendor rate for ${vendorId} must be between 0% and 1.0%.`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export interface VendorQuoteGroup {
  vendorId: string;
  vendorName: string;
  vendorState: string;
  vendorNumber: string;
  vendorRating: number;
  vendorVerified: boolean;
  pickupLocation: string;
  pickupHours: string;
  pickupInstructions: string;
  items: {
    cartItemId: string;
    listing: DeviceListing;
    selectedVariation?: CartItem['selectedVariation'];
    quantity: number;
    unitPrice: number;
    accessoriesTotal: number;
    lineSubtotal: number;
    selectedAccessories: NonNullable<CartItem['selectedAccessories']>;
  }[];
  vendorSubtotal: number;
  vendorDeliveryFee: number;
  customerFeeShare: number;
  vendorFeeRate: number;
  vendor_platform_service_fee: number;
  netVendorPayout: number;
  estimatedDeliveryWindow: string;
}

export interface MultiVendorCheckoutQuote {
  vendorGroups: VendorQuoteGroup[];
  vendorCount: number;
  totalItemsCount: number;
  subtotal: number;
  customerFeeRate: number;
  customer_platform_service_fee: number;
  deliveryFeeTotal: number;
  fixedDeliveryFeePerVendor: number;
  referralDiscount: number;
  totalAmount: number;
  unavailableItemIds: string[];
  priceChangedItems: { listingId: string; title: string; oldPrice: number; newPrice: number }[];
  hasBlockingIssues: boolean;
}

export function calculateMultiVendorCheckoutQuote(params: {
  cartItems: CartItem[];
  deliveryMethod: DeliveryMethod;
  listings?: DeviceListing[];
  vendors?: VendorStorefront[];
  feeConfig?: PlatformFeeConfig;
  deliveryConfig?: DeliveryConfig;
  referralDiscount?: number;
}): MultiVendorCheckoutQuote {
  const {
    cartItems,
    deliveryMethod,
    listings = [],
    vendors = [],
    feeConfig,
    deliveryConfig,
    referralDiscount = 0,
  } = params;

  const customerFeeRate = Math.min(
    feeConfig?.customerFeeRate ?? BUYER_FEE_RATE,
    MAX_CUSTOMER_FEE_RATE
  );
  const defaultVendorFeeRate = Math.min(
    feeConfig?.vendorFeeRate ?? SELLER_FEE_RATE,
    MAX_VENDOR_FEE_RATE
  );
  const fixedPerVendorFee =
    deliveryMethod === 'physical_pickup'
      ? 0
      : Math.max(0, deliveryConfig?.fixedDeliveryFee ?? DEFAULT_FIXED_DELIVERY_FEE);

  const unavailableItemIds: string[] = [];
  const priceChangedItems: { listingId: string; title: string; oldPrice: number; newPrice: number }[] = [];

  const groupMap = new Map<string, VendorQuoteGroup>();

  for (let idx = 0; idx < cartItems.length; idx++) {
    const item = cartItems[idx];
    const cartItemId = item.id || `${item.listing.id}-${item.selectedVariation?.id || 'base'}-${idx}`;
    const latestListing = listings.find((l) => l.id === item.listing.id);
    const activeListing = latestListing || item.listing;

    // Validate availability from authoritative listing catalog if provided
    if (latestListing) {
      if (latestListing.status !== 'Active') {
        unavailableItemIds.push(cartItemId);
      } else if (item.selectedVariation && latestListing.variations) {
        const matchedVar = latestListing.variations.find((v) => v.id === item.selectedVariation?.id);
        if (!matchedVar || !matchedVar.isAvailable || matchedVar.stockQuantity < item.quantity) {
          unavailableItemIds.push(cartItemId);
        }
      } else if ((latestListing.stockQuantity ?? latestListing.totalStock ?? 1) < item.quantity) {
        unavailableItemIds.push(cartItemId);
      }
    }

    const quotedUnitPrice = item.selectedVariation?.price ?? item.listing.price;
    const authoritativeUnitPrice = latestListing
      ? item.selectedVariation && latestListing.variations
        ? latestListing.variations.find((v) => v.id === item.selectedVariation?.id)?.price ?? latestListing.price
        : latestListing.price
      : quotedUnitPrice;

    if (latestListing && authoritativeUnitPrice !== quotedUnitPrice) {
      priceChangedItems.push({
        listingId: activeListing.id,
        title: activeListing.title,
        oldPrice: quotedUnitPrice,
        newPrice: authoritativeUnitPrice,
      });
    }

    const qty = Math.max(1, item.quantity || 1);
    const selectedAccessories = item.selectedAccessories || [];
    const accessoriesTotal = selectedAccessories.reduce((sum, a) => sum + a.price * qty, 0);
    const lineSubtotal = authoritativeUnitPrice * qty + accessoriesTotal;

    const vendorId = activeListing.sellerId;
    const vendorRecord = vendors.find((v) => v.id === vendorId);

    if (!groupMap.has(vendorId)) {
      const configuredRate =
        feeConfig?.vendorSpecificRates?.[vendorId] ??
        vendorRecord?.negotiatedVendorFeeRate ??
        defaultVendorFeeRate;
      const clampedVendorRate = Math.min(Math.max(0, configuredRate), MAX_VENDOR_FEE_RATE);

      groupMap.set(vendorId, {
        vendorId,
        vendorName: vendorRecord?.name || activeListing.sellerName,
        vendorState: vendorRecord?.state || activeListing.sellerState || 'Lagos State',
        vendorNumber: vendorRecord?.vendorNumber || `UR-VND-${vendorId.slice(-3).toUpperCase()}`,
        vendorRating: vendorRecord?.rating || activeListing.sellerRating || 4.8,
        vendorVerified: vendorRecord?.verificationBadge ?? activeListing.sellerVerified,
        pickupLocation: vendorRecord?.pickupLocation || vendorRecord?.location || 'Vendor Storefront Desk, Ikeja',
        pickupHours: vendorRecord?.pickupHours || 'Mon–Sat, 9:00 AM – 6:00 PM',
        pickupInstructions:
          vendorRecord?.pickupInstructions ||
          'Present your confidential Pickup Verification Code and valid government ID at the collection desk.',
        items: [],
        vendorSubtotal: 0,
        vendorDeliveryFee: fixedPerVendorFee,
        customerFeeShare: 0,
        vendorFeeRate: clampedVendorRate,
        vendor_platform_service_fee: 0,
        netVendorPayout: 0,
        estimatedDeliveryWindow:
          deliveryMethod === 'physical_pickup'
            ? 'Ready once vendor confirms pickup slot'
            : deliveryConfig?.estimatedDeliveryWindow || '1–3 business days after vendor dispatch',
      });
    }

    const group = groupMap.get(vendorId)!;
    group.items.push({
      cartItemId,
      listing: activeListing,
      selectedVariation: item.selectedVariation,
      quantity: qty,
      unitPrice: authoritativeUnitPrice,
      accessoriesTotal,
      lineSubtotal,
      selectedAccessories,
    });
    group.vendorSubtotal += lineSubtotal;
  }

  const vendorGroups = Array.from(groupMap.values());
  let subtotal = 0;
  let deliveryFeeTotal = 0;
  let totalItemsCount = 0;

  for (const group of vendorGroups) {
    subtotal += group.vendorSubtotal;
    deliveryFeeTotal += group.vendorDeliveryFee;
    totalItemsCount += group.items.reduce((sum, i) => sum + i.quantity, 0);
    // Delivery fee excluded from platform fees
    group.vendor_platform_service_fee = calculateSellerServiceCharge(group.vendorSubtotal, group.vendorFeeRate);
    group.netVendorPayout = Math.max(0, group.vendorSubtotal - group.vendor_platform_service_fee);
  }

  const customer_platform_service_fee = calculateBuyerServiceCharge(subtotal, customerFeeRate);

  // Allocate proportional customer fee share per vendor group strictly matching rounded total
  let allocatedCustomerFee = 0;
  for (let i = 0; i < vendorGroups.length; i++) {
    const group = vendorGroups[i];
    if (i === vendorGroups.length - 1) {
      group.customerFeeShare = Math.max(0, customer_platform_service_fee - allocatedCustomerFee);
    } else if (subtotal > 0) {
      const share = Math.round((group.vendorSubtotal / subtotal) * customer_platform_service_fee);
      group.customerFeeShare = share;
      allocatedCustomerFee += share;
    }
  }

  const appliedDiscount = Math.min(Math.max(0, referralDiscount), subtotal);
  const totalAmount = Math.max(
    0,
    subtotal + customer_platform_service_fee + deliveryFeeTotal - appliedDiscount
  );

  return {
    vendorGroups,
    vendorCount: vendorGroups.length,
    totalItemsCount,
    subtotal,
    customerFeeRate,
    customer_platform_service_fee,
    deliveryFeeTotal,
    fixedDeliveryFeePerVendor: fixedPerVendorFee,
    referralDiscount: appliedDiscount,
    totalAmount,
    unavailableItemIds,
    priceChangedItems,
    hasBlockingIssues: unavailableItemIds.length > 0 || priceChangedItems.length > 0,
  };
}

export function calculateRefundFeeAdjustment(params: {
  originalEligibleSubtotal: number;
  refundProductAmount: number;
  customerFeeAmount: number;
  vendorFeeAmount: number;
}) {
  const { originalEligibleSubtotal, refundProductAmount, customerFeeAmount, vendorFeeAmount } = params;
  if (originalEligibleSubtotal <= 0 || refundProductAmount <= 0) {
    return { ratio: 0, customerFeeRefund: 0, vendorFeeCredit: 0 };
  }
  const ratio = Math.min(1, refundProductAmount / originalEligibleSubtotal);
  return {
    ratio,
    customerFeeRefund: Math.round(customerFeeAmount * ratio),
    vendorFeeCredit: Math.round(vendorFeeAmount * ratio),
  };
}

export const ORDER_STAGES_8 = [
  'Payment confirmed',
  'Order received by vendor',
  'Vendor preparing order',
  'Dispatch arranged',
  'Dispatched',
  'Delivered',
  'Inspection period active',
  'Order completed',
] as const;

export function getOrderStageIndex(order: Order): number {
  const status = order.fulfillmentStatus;
  if (status === 'Completed') return 7;
  if (
    status === 'Delivered_In_Inspection' ||
    status === 'Buyer inspection' ||
    status === 'Disputed' ||
    status === 'Dispute_Opened'
  ) {
    return 6;
  }
  if (status === 'Delivered') return 5;
  if (status === 'In transit' || status === 'Ready for Pickup') return 4;
  if (status === 'Awaiting courier collection' || order.dispatchDetails?.dispatchStatus === 'dispatch_arranged') {
    return 3;
  }
  if (status === 'Seller preparing device') return 2;
  if (status === 'Vendor Accepted Order') return 1;
  return 0;
}

/**
 * Formats a number to Nigerian Naira string (e.g. ₦420,000)
 */
export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

/**
 * Formats remaining inspection seconds as readable countdown text
 */
export function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0h 00m';
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${String(mins).padStart(2, '0')}m`;
  }
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

/**
 * Scans chat text (and optional attachment metadata/OCR hint) for off-platform diversion,
 * returning 3-tier risk level, exact triggers, and whether direct high-risk diversion should be blocked.
 */
export type ModerationRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface SafetyScanResult {
  isSafe: boolean;
  warnings: string[];
  warningMessage?: string;
  riskLevel: ModerationRiskLevel;
  triggers: string[];
  shouldBlock: boolean;
}

export function scanMessageForDisallowedContent(
  text: string,
  attachmentMeta?: { fileName?: string; ocrHint?: string }
): SafetyScanResult {
  const warnings: string[] = [];
  const triggers: string[] = [];
  let riskScore = 0;

  const combined = [text, attachmentMeta?.fileName || '', attachmentMeta?.ocrHint || '']
    .filter(Boolean)
    .join(' ');
  const compactDigits = combined.replace(/[\s\-().]/g, '');

  // 1. Nigerian & international phone numbers (compact or obfuscated digits)
  const phonePattern = /(?:\+?234|0)[789][01]\d{8}|\b\d{3}[-.\s]?\d{3,4}[-.\s]?\d{4}\b/;
  if (phonePattern.test(compactDigits)) {
    warnings.push('Phone numbers detected. For your safety, keep all communications on UsedRight.');
    triggers.push('phone_number');
    riskScore += 2;
  }

  // 2. Messaging app solicitation (WhatsApp, Telegram, etc.)
  const whatsappPattern = /\b(whatsapp|what's\s?app|whatapp|watsapp|wa\.me|dm\s*me\s*on|chat\s*me\s*on|reach\s*me\s*on|call\s*me\s*on)\b/i;
  if (whatsappPattern.test(combined)) {
    warnings.push('External messaging requests (e.g. WhatsApp) remove your UsedRight payment protection.');
    triggers.push('whatsapp_or_external_chat');
    riskScore += 3;
  }

  const telegramOrSocialDmPattern =
    /\b(telegram|t\.me\/|instagram\.com|ig\s*:|tiktok\.com|facebook\.com|snapchat|dm\s*@|handle\s*:)\b/i;
  if (telegramOrSocialDmPattern.test(combined)) {
    warnings.push('External social or Telegram contact handles remove your UsedRight buyer protection.');
    triggers.push('social_or_telegram_handle');
    riskScore += 2;
  }

  // Standalone @handle (exclude common email domain syntax handled separately)
  if (/(?:^|\s)@[a-zA-Z0-9_.]{3,25}\b/.test(text)) {
    if (!triggers.includes('social_or_telegram_handle')) {
      warnings.push('Social media @handles detected. Keep all negotiations inside UsedRight.');
      triggers.push('social_handle');
      riskScore += 1;
    }
  }

  // 3. Email addresses
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
  if (emailPattern.test(combined)) {
    warnings.push('Email addresses detected. Direct off-platform transactions are not covered by buyer protection.');
    triggers.push('email_address');
    riskScore += 2;
  }

  // 4. External URLs / payment links
  const externalLinkPattern = /(https?:\/\/[^\s]+|\b(?:paystack\.com|flutterwave\.com|bit\.ly|tinyurl\.com|selar\.co)\/[^\s]*)/i;
  if (externalLinkPattern.test(combined)) {
    warnings.push('External links or third-party payment links are not allowed in order chat.');
    triggers.push('external_payment_or_url');
    riskScore += 3;
  }

  // 5. Direct bank transfer / NUBAN account solicitation
  const bankKeywordPattern =
    /\b(bank\s*transfer|account\s*number|acct\s*no|send\s*to\s*my\s*account|pay\s*directly|pay\s*into|transfer\s*directly|send\s*outside|zenith|gtb|gtbank|access\s*bank|uba|kuda|opay|palmpay|moniepoint|first\s*bank)\b/i;
  const hasTenDigitAccount = /\b\d{10}\b/.test(compactDigits);
  const hasDirectPaymentPhrase = /\b(send\s*to|transfer|pay\s*directly|pay\s*into|outside\s*usedright|avoid\s*fee)\b/i.test(
    combined
  );

  if (bankKeywordPattern.test(combined) && (/\b\d{8,11}\b/.test(compactDigits) || hasDirectPaymentPhrase)) {
    warnings.push('Direct bank transfer details detected. Never send money outside UsedRight checkout.');
    triggers.push('bank_transfer_diversion');
    riskScore += 4;
  } else if (hasTenDigitAccount && /(acct|account|bank|naira|transfer|send)/i.test(combined)) {
    warnings.push('Direct bank account number detected. Complete all payments strictly through UsedRight checkout.');
    triggers.push('bank_account_number');
    riskScore += 3;
  }

  // 6. Suspicious image filename/OCR indicator
  if (attachmentMeta?.fileName && /(whatsapp|acct|account|bank_slip|opay|palmpay|transfer_details)/i.test(attachmentMeta.fileName)) {
    triggers.push('suspicious_attachment_name');
    riskScore += 1;
  }

  let riskLevel: ModerationRiskLevel = 'LOW';
  if (riskScore >= 4 || triggers.includes('bank_transfer_diversion') || triggers.includes('external_payment_or_url')) {
    riskLevel = 'HIGH';
  } else if (riskScore >= 2) {
    riskLevel = 'MEDIUM';
  }

  const shouldBlock = riskLevel === 'HIGH';

  return {
    isSafe: warnings.length === 0,
    warnings,
    warningMessage: warnings.length > 0 ? warnings[0] : undefined,
    riskLevel,
    triggers,
    shouldBlock,
  };
}

export type CatalogSortOption =
  | 'recommended'
  | 'price_asc'
  | 'price_desc'
  | 'top_rated'
  | 'deals_first';

export type CatalogPriceBucket = 'all' | 'under_300k' | '300k_600k' | '600k_1m' | 'above_1m';

export interface CatalogToolbarFilters {
  sortBy: CatalogSortOption;
  priceBucket: CatalogPriceBucket;
  brand: string;
  color: string;
  storage: string;
  grade: CosmeticGrade | 'all';
  locationState: string;
}

export const DEFAULT_CATALOG_TOOLBAR_FILTERS: CatalogToolbarFilters = {
  sortBy: 'recommended',
  priceBucket: 'all',
  brand: 'all',
  color: 'all',
  storage: 'all',
  grade: 'all',
  locationState: 'all',
};

export function hasActiveCatalogFilters(filters: CatalogToolbarFilters): boolean {
  return (
    filters.sortBy !== 'recommended' ||
    filters.priceBucket !== 'all' ||
    filters.brand !== 'all' ||
    filters.color !== 'all' ||
    filters.storage !== 'all' ||
    filters.grade !== 'all' ||
    filters.locationState !== 'all'
  );
}

export function getPriceRangeForBucket(bucket: CatalogPriceBucket): [number, number] | undefined {
  switch (bucket) {
    case 'under_300k':
      return [0, 299999];
    case '300k_600k':
      return [300000, 600000];
    case '600k_1m':
      return [600001, 1000000];
    case 'above_1m':
      return [1000001, Number.MAX_SAFE_INTEGER];
    default:
      return undefined;
  }
}

export function isDealListing(item: DeviceListing): boolean {
  return Boolean(
    item.promoBadge ||
      (item.originalPrice && item.originalPrice > item.price) ||
      item.freeGift
  );
}

/**
 * Filter and sort listings across all active categories while respecting platform Brand-New toggle.
 */
export function filterListings(
  listings: DeviceListing[],
  filters: ListingFilters,
  platformConfig?: PlatformConfig,
  vendors?: VendorStorefront[]
): DeviceListing[] {
  const enabledCategoryIds = platformConfig
    ? new Set(platformConfig.categories.filter((c) => c.enabled).map((c) => c.id))
    : null;

  return listings
    .filter((item) => {
      if (item.status !== 'Active') {
        return false;
      }

      const isAccessoryCategory =
        item.category === 'accessories' || item.category === 'computer_accessories';
      if (
        platformConfig &&
        !platformConfig.brandNewEnabled &&
        item.condition === 'Brand-New' &&
        !isAccessoryCategory
      ) {
        return false;
      }

      if (enabledCategoryIds && !enabledCategoryIds.has(item.category)) {
        return false;
      }

      if (filters.condition && filters.condition !== 'all') {
        if (item.condition !== filters.condition) return false;
      }

      if (filters.category && filters.category !== 'all') {
        if (item.category !== filters.category) return false;
      }

      if (filters.dealsOnly && !isDealListing(item)) {
        return false;
      }

      if (filters.searchQuery && filters.searchQuery.trim() !== '') {
        const q = filters.searchQuery.toLowerCase();
        const match =
          item.title.toLowerCase().includes(q) ||
          item.brand.toLowerCase().includes(q) ||
          item.model.toLowerCase().includes(q) ||
          item.color.toLowerCase().includes(q) ||
          (item.colorSwatches &&
            item.colorSwatches.some((sw) => sw.name.toLowerCase().includes(q))) ||
          (item.promoBadge ? item.promoBadge.toLowerCase().includes(q) : false) ||
          (item.storage ? item.storage.toLowerCase().includes(q) : false) ||
          item.sellerName.toLowerCase().includes(q) ||
          (item.disclosedFaults && item.disclosedFaults.some((f) => f.toLowerCase().includes(q)));
        if (!match) return false;
      }

      if (filters.brands && filters.brands.length > 0) {
        const normalizedBrands = filters.brands.map((b) => b.toLowerCase());
        if (normalizedBrands.includes('android')) {
          const isApple = item.brand.toLowerCase() === 'apple';
          const isAndroid =
            !isApple &&
            (item.category === 'phones' ||
              Boolean(item.operatingSystem?.toLowerCase().includes('android')));
          if (!isAndroid) return false;
        } else if (!normalizedBrands.includes(item.brand.toLowerCase())) {
          return false;
        }
      }

      if (filters.colors && filters.colors.length > 0) {
        const hasMatchingColor = filters.colors.some((c) => {
          const needle = c.toLowerCase();
          if (item.color.toLowerCase().includes(needle)) return true;
          if (item.title.toLowerCase().includes(needle)) return true;
          if (item.colorSwatches?.some((sw) => sw.name.toLowerCase().includes(needle))) return true;
          if (item.variations?.some((v) => v.color.toLowerCase().includes(needle))) return true;
          return false;
        });
        if (!hasMatchingColor) return false;
      }

      if (filters.priceRange) {
        const [min, max] = filters.priceRange;
        if (item.price < min || item.price > max) return false;
      }

      if (filters.cosmeticGrades && filters.cosmeticGrades.length > 0) {
        if (!filters.cosmeticGrades.includes(item.cosmeticGrade)) return false;
      }

      if (filters.minBatteryHealth !== undefined && filters.minBatteryHealth > 0) {
        if (item.category === 'phones') {
          const health = item.batteryHealth || 0;
          if (health < filters.minBatteryHealth) return false;
        }
      }

      if (filters.storage && filters.storage.length > 0) {
        const hasStorage = filters.storage.some((s) => {
          const needle = s.toLowerCase();
          return (
            (item.storage || item.storageCapacity || '').toLowerCase().includes(needle) ||
            item.title.toLowerCase().includes(needle)
          );
        });
        if (!hasStorage) return false;
      }

      if (filters.ram && filters.ram.length > 0) {
        if (!item.ram) return false;
        const hasRam = filters.ram.some((r) => item.ram?.toLowerCase().includes(r.toLowerCase()));
        if (!hasRam) return false;
      }

      if (filters.batteryAssessmentType && filters.batteryAssessmentType.length > 0) {
        if (
          !item.batteryAssessmentType ||
          !filters.batteryAssessmentType.includes(item.batteryAssessmentType)
        ) {
          return false;
        }
      }

      if (filters.hasFreeGiftOnly) {
        if (!item.freeGift) return false;
      }

      if (filters.hasDisclosedFaultsOnly) {
        if (
          (!item.disclosedFaultsList || item.disclosedFaultsList.length === 0) &&
          (!item.disclosedFaults || item.disclosedFaults.length === 0)
        ) {
          return false;
        }
      }

      if (filters.vendorId) {
        if (item.sellerId !== filters.vendorId) return false;
      }

      if (filters.faceIdOnly) {
        if (item.category === 'phones' && item.faceIdStatus !== 'Working') return false;
      }

      if (filters.locationState && filters.locationState !== 'all') {
        const targetState = normalizeNigerianState(filters.locationState);
        const listingState = normalizeNigerianState(getListingVendorState(item, vendors));
        if (listingState !== targetState) return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case 'price_asc':
          return a.price - b.price;
        case 'price_desc':
          return b.price - a.price;
        case 'top_rated': {
          const ratingA = a.modelRating ?? a.sellerRating;
          const ratingB = b.modelRating ?? b.sellerRating;
          return ratingB - ratingA || (b.views || 0) - (a.views || 0);
        }
        case 'deals_first': {
          const promoRank = (item: DeviceListing) => {
            if (item.promoBadge === 'DEAL OF THE WEEK') return 3;
            if (item.promoBadge) return 2;
            if (item.originalPrice && item.originalPrice > item.price) return 1;
            return 0;
          };
          const diff = promoRank(b) - promoRank(a);
          if (diff !== 0) return diff;
          const discA = a.originalPrice ? (a.originalPrice - a.price) / a.originalPrice : 0;
          const discB = b.originalPrice ? (b.originalPrice - b.price) / b.originalPrice : 0;
          return discB - discA;
        }
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'condition': {
          const gradeRank: Record<CosmeticGrade, number> = {
            'Grade A': 4,
            'Grade B': 3,
            'Grade C': 2,
            'Grade D': 1,
          };
          return gradeRank[b.cosmeticGrade] - gradeRank[a.cosmeticGrade];
        }
        case 'recommended':
        default:
          if (filters.vendorId) {
            const orderA = a.displayOrder ?? 9999;
            const orderB = b.displayOrder ?? 9999;
            if (orderA !== orderB) return orderA - orderB;
          }
          return b.sellerRating * 100 - a.sellerRating * 100 || (b.views || 0) - (a.views || 0);
      }
    });
}

export function searchListingsWithQuickChip(
  listings: DeviceListing[],
  query: string,
  platformConfig?: PlatformConfig,
  vendors?: VendorStorefront[],
  locationState?: string
): DeviceListing[] {
  const trimmed = query.trim();
  const isDealsQuery = trimmed.toLowerCase() === 'deals';
  return filterListings(
    listings,
    {
      searchQuery: isDealsQuery ? '' : trimmed,
      dealsOnly: isDealsQuery,
      sortBy: isDealsQuery ? 'deals_first' : 'recommended',
      locationState: locationState && locationState !== 'all' ? locationState : undefined,
    },
    platformConfig,
    vendors
  );
}

export function applyCatalogToolbarFilters(
  listings: DeviceListing[],
  toolbar: CatalogToolbarFilters,
  platformConfig?: PlatformConfig,
  extra?: Partial<ListingFilters>,
  vendors?: VendorStorefront[]
): DeviceListing[] {
  return filterListings(
    listings,
    {
      ...extra,
      sortBy: toolbar.sortBy,
      priceRange: getPriceRangeForBucket(toolbar.priceBucket),
      brands: toolbar.brand !== 'all' ? [toolbar.brand] : extra?.brands,
      colors: toolbar.color !== 'all' ? [toolbar.color] : extra?.colors,
      storage: toolbar.storage !== 'all' ? [toolbar.storage] : extra?.storage,
      cosmeticGrades: toolbar.grade !== 'all' ? [toolbar.grade] : extra?.cosmeticGrades,
      locationState:
        toolbar.locationState && toolbar.locationState !== 'all'
          ? toolbar.locationState
          : extra?.locationState,
    },
    platformConfig,
    vendors
  );
}

const DEFAULT_ALLOWED_CATEGORIES = [
  'phones',
  'laptops',
  'tablets',
  'smartwatches',
  'audio',
  'gaming',
  'cameras',
  'computer_accessories',
  'accessories',
];

/**
 * Validates whether a seller has all mandatory disclosures to submit a device listing.
 * Blocks Brand-New listings when platformConfig.brandNewEnabled is false.
 */
export function validateDeviceListing(
  listing: Partial<DeviceListing>,
  platformConfig?: PlatformConfig
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const allowedCategories = platformConfig
    ? platformConfig.categories.filter((c) => c.enabled).map((c) => c.id)
    : DEFAULT_ALLOWED_CATEGORIES;

  if (!listing.title || listing.title.trim().length < 3) {
    errors.push('Device title is required.');
  }
  if (!listing.brand) {
    errors.push('Brand must be selected.');
  }
  if (!listing.model) {
    errors.push('Model must be specified.');
  }
  if (!listing.category || !allowedCategories.includes(listing.category)) {
    errors.push('Please select a valid active product category.');
  }
  if (!listing.condition || !['Foreign-Used', 'Brand-New'].includes(listing.condition)) {
    errors.push('Condition must be explicitly declared as Foreign-Used or Brand-New.');
  }
  if (platformConfig && !platformConfig.brandNewEnabled && listing.condition === 'Brand-New') {
    errors.push('Brand-new devices are currently disabled on UsedRight. Only Foreign-Used products are permitted.');
  }
  if (!listing.price || listing.price <= 0) {
    errors.push('Valid price in Nigerian Naira is required.');
  }
  if (!listing.cosmeticGrade) {
    errors.push('Cosmetic Grade (A, B, C, or D) must be selected.');
  }
  if (!listing.batchReference || listing.batchReference.trim() === '') {
    errors.push('Device must be linked to an approved Foreign-Use batch manifest or airway bill.');
  }
  if (!listing.imeiOrSerial || listing.imeiOrSerial.trim() === '') {
    errors.push('IMEI (for phones) or Serial Number is required for verification.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export const LAGOS_STANDARD_DELIVERY_FEE = 3000;

export function generateOrderId(): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `UR-ORD-2026-${rand}`;
}

export function generateSubOrderId(index: number = 1): string {
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `UR-SUB-2026-${rand}-${index}`;
}

export function generateTransactionId(): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `UR-TXN-2026-${rand}`;
}

export function generatePickupOtp(): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `UR-PICK-${rand}`;
}

export function generateDeliveryVerificationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function generateVendorNumber(seq: number): string {
  const safeSeq = Math.max(1, Math.floor(seq));
  return `U-${String(safeSeq).padStart(4, '0')}`;
}

export function normalizeSocialUrl(
  platform: 'Instagram' | 'Facebook' | 'TikTok' | 'X (Twitter)' | 'Website' | 'LinkedIn',
  rawInput: string
): string {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const cleanHandle = trimmed.replace(/^@+/, '').replace(/\/+$/, '');
  switch (platform) {
    case 'Instagram':
      return `https://instagram.com/${cleanHandle}`;
    case 'TikTok':
      return `https://tiktok.com/@${cleanHandle}`;
    case 'Facebook':
      return `https://facebook.com/${cleanHandle}`;
    case 'X (Twitter)':
      return `https://x.com/${cleanHandle}`;
    case 'LinkedIn':
      return `https://linkedin.com/company/${cleanHandle}`;
    default:
      return `https://${cleanHandle}`;
  }
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export interface VendorSearchResultItem {
  vendor: VendorStorefront;
  matchType: 'id' | 'exact' | 'prefix' | 'partial' | 'fuzzy' | 'browse';
  activeListingsCount: number;
  previewListings: DeviceListing[];
}

export function searchVendorsAndStores(
  vendors: VendorStorefront[],
  listings: DeviceListing[],
  query: string,
  options?: {
    verifiedOnly?: boolean;
    state?: string;
    platformConfig?: PlatformConfig;
  }
): VendorSearchResultItem[] {
  const rawQ = (query || '').trim().toLowerCase();
  const normalizedIdQuery = rawQ.replace(/[^a-z0-9]/g, '');
  const stateFilter = options?.state && options.state !== 'all' ? normalizeNigerianState(options.state) : undefined;

  const activeByVendor = new Map<string, DeviceListing[]>();
  for (const item of listings) {
    if (item.status !== 'Active') continue;
    const isAccessoryCategory =
      item.category === 'accessories' || item.category === 'computer_accessories';
    if (
      options?.platformConfig &&
      !options.platformConfig.brandNewEnabled &&
      item.condition === 'Brand-New' &&
      !isAccessoryCategory
    ) {
      continue;
    }
    const existing = activeByVendor.get(item.sellerId) || [];
    existing.push(item);
    activeByVendor.set(item.sellerId, existing);
  }

  const results: (VendorSearchResultItem & { score: number })[] = [];

  for (const vendor of vendors) {
    if (vendor.isSuspended) continue;
    if (options?.verifiedOnly && !vendor.verificationBadge) continue;
    if (stateFilter && normalizeNigerianState(vendor.state || vendor.location) !== stateFilter) {
      continue;
    }

    const vendorListings = activeByVendor.get(vendor.id) || [];
    const nameLower = vendor.name.toLowerCase();
    const numLower = (vendor.vendorNumber || '').toLowerCase();
    const compactNum = numLower.replace(/[^a-z0-9]/g, '');
    const locationLower = (vendor.location || '').toLowerCase();
    const stateLower = (vendor.state || '').toLowerCase();

    let matchType: VendorSearchResultItem['matchType'] | null = null;
    let score = 0;

    if (!rawQ) {
      matchType = 'browse';
      score = vendor.verificationBadge ? 10 : 5;
    } else if (numLower === rawQ || (normalizedIdQuery.length >= 2 && compactNum === normalizedIdQuery)) {
      matchType = 'id';
      score = 100;
    } else if (numLower.includes(rawQ) || (normalizedIdQuery.length >= 3 && compactNum.includes(normalizedIdQuery))) {
      matchType = 'id';
      score = 88;
    } else if (nameLower === rawQ) {
      matchType = 'exact';
      score = 95;
    } else if (nameLower.startsWith(rawQ)) {
      matchType = 'prefix';
      score = 85;
    } else if (
      nameLower.includes(rawQ) ||
      locationLower.includes(rawQ) ||
      stateLower.includes(rawQ) ||
      vendor.description.toLowerCase().includes(rawQ)
    ) {
      matchType = 'partial';
      score = nameLower.includes(rawQ) ? 75 : 55;
    } else if (rawQ.length >= 3) {
      // Typo-tolerant token fuzzy check
      const tokens = nameLower.split(/\s+/).filter(Boolean);
      const qTokens = rawQ.split(/\s+/).filter(Boolean);
      const maxEdits = rawQ.length >= 6 ? 2 : 1;
      const wholeDist = levenshteinDistance(rawQ, nameLower);
      const tokenMatch = qTokens.some((qt) =>
        tokens.some((t) => levenshteinDistance(qt, t) <= (qt.length >= 6 ? 2 : 1))
      );
      if (wholeDist <= maxEdits || tokenMatch) {
        matchType = 'fuzzy';
        score = 45;
      }
    }

    if (matchType) {
      results.push({
        vendor,
        matchType,
        activeListingsCount: vendorListings.length,
        previewListings: vendorListings.slice(0, 3),
        score: score + (vendor.verificationBadge ? 5 : 0) + vendor.rating,
      });
    }
  }

  return results
    .sort((a, b) => b.score - a.score || b.vendor.completedOrders - a.vendor.completedOrders)
    .map(({ score: _s, ...rest }) => rest);
}

export function generateDisputeId(): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `UR-DSP-2026-${rand}`;
}

/**
 * Checks whether blocking is restricted due to an active order with payment held or open dispute.
 */
export function checkBlockingRestriction(
  buyerIdOrActiveHold: string | boolean,
  vendorId?: string,
  orders?: Order[]
): { isRestricted: boolean; allowed: boolean; reason?: string; activeOrderNumber?: string } {
  if (typeof buyerIdOrActiveHold === 'boolean') {
    if (buyerIdOrActiveHold) {
      return {
        isRestricted: true,
        allowed: false,
        reason:
          'You cannot block this account while an active order or dispute is being handled by UsedRight. You can still report a problem or contact support.',
      };
    }
    return { isRestricted: false, allowed: true };
  }

  const buyerId = buyerIdOrActiveHold;
  const activeStatuses: string[] = [
    'Order placed',
    'Seller preparing device',
    'Awaiting courier collection',
    'In transit',
    'Delivered',
    'Buyer inspection',
    'Delivered_In_Inspection',
    'Disputed',
    'Dispute_Opened',
    'Ready for Pickup',
  ];

  const activeOrder = (orders || []).find(
    (o) =>
      (o.buyerId === buyerId || o.listing.sellerId === buyerId) &&
      (o.listing.sellerId === vendorId ||
        o.buyerId === vendorId ||
        (o.items && o.items.some((i) => i.listing.sellerId === vendorId))) &&
      activeStatuses.includes(o.fulfillmentStatus)
  );

  if (activeOrder) {
    return {
      isRestricted: true,
      allowed: false,
      activeOrderNumber: activeOrder.orderNumber,
      reason:
        'You cannot block this account while an active order is under review or payment hold. You can still report a problem or contact UsedRight Support.',
    };
  }

  return { isRestricted: false, allowed: true };
}

export const NIGERIAN_BANKS = [
  'Access Bank',
  'GTBank (Guaranty Trust Bank)',
  'Zenith Bank',
  'UBA (United Bank for Africa)',
  'First Bank of Nigeria',
  'Fidelity Bank',
  'Stanbic IBTC Bank',
  'Kuda Microfinance Bank',
  'Moniepoint MFB',
  'OPay Digital Services',
  'Wema Bank (ALAT)',
  'Providus Bank',
];

export function validateNigerianBankAccount(input: {
  bankName: string;
  accountNumber: string;
  accountName: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const bank = (input.bankName || '').trim();
  const acct = (input.accountNumber || '').replace(/\s+/g, '');
  const name = (input.accountName || '').trim();

  if (!bank) {
    errors.push('Select your Nigerian bank.');
  }
  if (!/^\d{10}$/.test(acct)) {
    errors.push('NUBAN account number must be exactly 10 digits.');
  }
  if (name.length < 3) {
    errors.push('Enter the matching account holder name.');
  }

  return { valid: errors.length === 0, errors };
}

export const DEMO_OTP_CODE = '4829';

export function isValidNigerianPhone(phone: string): boolean {
  const digits = (phone || '').replace(/[\s\-()]/g, '');
  return /^(?:\+?234|0)?[789][01]\d{8}$/.test(digits);
}

export function verifySimulatedOtp(
  entered: string,
  expected: string = DEMO_OTP_CODE
): boolean {
  return entered.trim() === expected.trim();
}

export function buildComboBundleListing(params: {
  vendor: VendorStorefront;
  primaryListing: DeviceListing;
  secondaryListings: DeviceListing[];
  bundlePrice: number;
  promoTag: Extract<PromoBadgeType, 'COMBO DEAL' | 'GIFT PACK'>;
  customTitle?: string;
}): {
  valid: boolean;
  error?: string;
  listing?: DeviceListing;
  savings?: number;
  discountPercent?: number;
} {
  const { vendor, primaryListing, secondaryListings, bundlePrice, promoTag, customTitle } = params;
  if (!secondaryListings || secondaryListings.length === 0) {
    return { valid: false, error: 'Select at least one companion item to bundle.' };
  }

  const allItems = [primaryListing, ...secondaryListings];
  const originalSum = allItems.reduce((sum, item) => sum + item.price, 0);

  if (!bundlePrice || bundlePrice < 1000) {
    return { valid: false, error: 'Enter a valid bundle price in Naira (₦).' };
  }
  if (bundlePrice >= originalSum) {
    return {
      valid: false,
      error: `Bundle price (${formatNaira(bundlePrice)}) must be lower than combined price (${formatNaira(originalSum)}).`,
    };
  }

  const savings = originalSum - bundlePrice;
  const discountPercent = Math.round((savings / originalSum) * 100);
  const bundleItems: BundleItemSummary[] = allItems.map((item) => ({
    listingId: item.id,
    title: item.model || item.title,
    image: item.images[0] || '',
    price: item.price,
  }));

  const combinedImages = Array.from(
    new Set(allItems.flatMap((i) => i.images.slice(0, 1)).filter(Boolean))
  );

  const title =
    customTitle?.trim() ||
    `${primaryListing.model} + ${secondaryListings.map((s) => s.model).join(' + ')} Combo`;

  const listing: DeviceListing = {
    ...primaryListing,
    id: `ur-combo-${Date.now()}`,
    title,
    model: title,
    price: bundlePrice,
    originalPrice: originalSum,
    priceHasStartingPrefix: false,
    promoBadge: promoTag,
    images: combinedImages.length > 0 ? combinedImages : primaryListing.images,
    bundleItems,
    stockQuantity: Math.min(
      ...allItems.map((i) => i.stockQuantity ?? i.totalStock ?? 1)
    ),
    totalStock: Math.min(...allItems.map((i) => i.stockQuantity ?? i.totalStock ?? 1)),
    cosmeticDescription: `Verified vendor ${promoTag.toLowerCase()} saving buyers ${formatNaira(savings)} (${discountPercent}% off individual prices).`,
    structuredDescription: {
      overview: `Bundled multi-item package from ${vendor.name}: ${allItems
        .map((i) => i.title)
        .join(' + ')}.`,
      includedItems: allItems.map((i) => i.title).join(' + '),
      specsSummary: `Combined value ${formatNaira(originalSum)} — bundle savings ${formatNaira(savings)}.`,
    },
    sellerId: vendor.id,
    sellerName: vendor.name,
    sellerState: vendor.state || 'Lagos State',
    sellerVerified: vendor.verificationBadge,
    sellerRating: vendor.rating,
    sellerSalesCount: vendor.completedOrders,
    displayOrder: 0,
    createdAt: new Date().toISOString().slice(0, 10),
    views: 1,
    variations: undefined,
  };

  return { valid: true, listing, savings, discountPercent };
}

export const DEFAULT_PAYMENT_REQUEST_VALIDITY_HOURS = 24;
export const MIN_PAYMENT_REQUEST_VALIDITY_HOURS = 1;
export const MAX_PAYMENT_REQUEST_VALIDITY_HOURS = 168;
export const MAX_GIFT_MESSAGE_LENGTH = 240;

/**
 * Strips script/style blocks, HTML tags, dangerous schemes, and control characters from gift messages.
 */
export function sanitizeGiftMessage(raw?: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const withoutScripts = raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  const collapsed = withoutScripts.replace(/\s+/g, ' ').trim();
  return collapsed.slice(0, MAX_GIFT_MESSAGE_LENGTH);
}

/**
 * Validates and normalizes Send as a Gift details (works for phone, laptop, and multi-vendor orders).
 */
export function validateGiftOrderDetails(
  input: Partial<{
    recipientName: string;
    recipientPhone: string;
    street: string;
    city: string;
    state: string;
    landmark?: string;
    deliveryInstructions?: string;
    giftMessage?: string;
    senderVisibility?: GiftSenderVisibility;
    senderDisplayName?: string;
    occasion?: string;
    recipientPortalToken?: string;
  }>,
  deliveryMethod: DeliveryMethod = 'usedright_delivery'
): { valid: boolean; errors: string[]; giftDetails?: GiftOrderDetails } {
  const errors: string[] = [];
  const recipientName = (input.recipientName || '').trim();
  const recipientPhone = (input.recipientPhone || '').trim();
  const street = (input.street || '').trim();
  const city = (input.city || '').trim();
  const state = normalizeNigerianState((input.state || '').trim() || 'Lagos State');

  if (recipientName.length < 2) {
    errors.push('Enter the gift recipient’s full name.');
  }
  if (!isValidNigerianPhone(recipientPhone)) {
    errors.push('Enter a valid Nigerian phone number for the gift recipient.');
  }
  if (deliveryMethod === 'usedright_delivery') {
    if (street.length < 5) {
      errors.push('Enter the gift recipient’s full street delivery address.');
    }
    if (city.length < 2) {
      errors.push('Enter the gift recipient’s city or area.');
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const visibility: GiftSenderVisibility =
    input.senderVisibility === 'anonymous' ? 'anonymous' : 'show_name';
  const cleanedMessage = sanitizeGiftMessage(input.giftMessage);
  const cleanedInstructions = sanitizeGiftMessage(input.deliveryInstructions).slice(0, 200);
  const cleanedOccasion = sanitizeGiftMessage(input.occasion).slice(0, 60);
  const cleanedSenderName =
    visibility === 'show_name'
      ? sanitizeGiftMessage(input.senderDisplayName).slice(0, 80)
      : undefined;

  const portalToken =
    input.recipientPortalToken ||
    generateRandomUrlToken(18);

  return {
    valid: true,
    errors: [],
    giftDetails: {
      isGift: true,
      recipientName,
      recipientPhone,
      recipientAddress: {
        fullName: recipientName,
        phone: recipientPhone,
        street:
          deliveryMethod === 'physical_pickup'
            ? street || 'Vendor In-Store Pickup Desk'
            : street,
        city:
          deliveryMethod === 'physical_pickup'
            ? city || 'In-Store Pickup'
            : city,
        state,
        landmark: input.landmark?.trim() || undefined,
      },
      deliveryInstructions: cleanedInstructions || undefined,
      giftMessage: cleanedMessage || undefined,
      senderVisibility: visibility,
      senderDisplayName: cleanedSenderName || undefined,
      occasion: cleanedOccasion || undefined,
      hidePriceFromPackage: true,
      specialPackagingGuaranteed: false,
      recipientAccessTokenHash: sha256Hex(portalToken),
      recipientPortalToken: portalToken,
    },
  };
}

export function generatePaymentRequestRef(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `UR-PAYREQ-2026-${num}`;
}

export function generateRecipientComplaintNumber(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `UR-GFT-CMP-${num}`;
}

export function generateRandomUrlToken(byteLength: number = 24): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789-_';
  let out = '';
  const globalCrypto = typeof globalThis !== 'undefined' ? (globalThis as { crypto?: { getRandomValues?: (arr: Uint8Array) => void } }).crypto : undefined;
  if (globalCrypto && typeof globalCrypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(byteLength);
    globalCrypto.getRandomValues(bytes);
    for (let i = 0; i < bytes.length; i += 1) {
      out += chars[bytes[i] % chars.length];
    }
    return out;
  }
  for (let i = 0; i < byteLength; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/**
 * Pure TypeScript SHA-256 digest matching Node `crypto.createHash('sha256')` across server, browser, and unit tests.
 */
export function sha256Hex(input: string): string {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n));
  const utf8 = unescape(encodeURIComponent(input));
  const bytes: number[] = [];
  for (let i = 0; i < utf8.length; i += 1) bytes.push(utf8.charCodeAt(i));
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) bytes.push(0);
  const highBits = Math.floor(bitLen / 0x100000000);
  const lowBits = bitLen >>> 0;
  bytes.push((highBits >>> 24) & 0xff, (highBits >>> 16) & 0xff, (highBits >>> 8) & 0xff, highBits & 0xff);
  bytes.push((lowBits >>> 24) & 0xff, (lowBits >>> 16) & 0xff, (lowBits >>> 8) & 0xff, lowBits & 0xff);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  for (let offset = 0; offset < bytes.length; offset += 64) {
    const w = new Array<number>(64);
    for (let i = 0; i < 16; i += 1) {
      const j = offset + i * 4;
      w[i] = ((bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3]) >>> 0;
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      const s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((v) => v.toString(16).padStart(8, '0'))
    .join('');
}

export interface PaymentRequestAvailabilityResult {
  valid: boolean;
  reason?: string;
  shouldExpire?: boolean;
  shouldInvalidate?: boolean;
  priceChangedItems: string[];
  unavailableItems: string[];
}

/**
 * Re-validates a persisted PaymentRequest against live expiry, vendor status, product stock, and price snapshots.
 */
export function evaluatePaymentRequestAvailability(params: {
  request: PaymentRequestRecord;
  listings: DeviceListing[];
  vendors: VendorStorefront[];
  nowMs?: number;
}): PaymentRequestAvailabilityResult {
  const { request, listings, vendors, nowMs = Date.now() } = params;

  if (request.status === 'Cancelled') {
    return {
      valid: false,
      reason: 'This payment request was cancelled by the cart owner.',
      priceChangedItems: [],
      unavailableItems: [],
    };
  }
  if (request.status === 'Paid') {
    return {
      valid: false,
      reason: 'This payment request has already been paid. Duplicate payment is blocked.',
      priceChangedItems: [],
      unavailableItems: [],
    };
  }
  if (request.status === 'Payment processing') {
    return {
      valid: false,
      reason: 'A payment is already being verified for this request. Duplicate attempts are blocked.',
      priceChangedItems: [],
      unavailableItems: [],
    };
  }
  if (request.status === 'Invalidated') {
    return {
      valid: false,
      reason:
        request.invalidatedReason ||
        'This payment request was invalidated because item availability or price changed.',
      priceChangedItems: [],
      unavailableItems: [],
    };
  }
  if (request.status === 'Expired' || new Date(request.expiresAt).getTime() <= nowMs) {
    return {
      valid: false,
      shouldExpire: true,
      reason:
        'This payment request has expired. Ask the cart owner to generate a fresh payment link.',
      priceChangedItems: [],
      unavailableItems: [],
    };
  }

  const priceChangedItems: string[] = [];
  const unavailableItems: string[] = [];

  request.itemsSnapshot.forEach((snap: PaymentRequestItemSnapshot) => {
    const liveListing = listings.find((l) => l.id === snap.listingId);
    const liveVendor = vendors.find((v) => v.id === snap.vendorId);

    if (!liveListing || liveListing.status !== 'Active' || liveListing.isSold) {
      unavailableItems.push(snap.title);
      return;
    }
    if (liveVendor && (liveVendor.isSuspended || !liveVendor.verificationBadge)) {
      unavailableItems.push(`${snap.title} (vendor unavailable)`);
      return;
    }

    const liveVar = snap.variationId
      ? liveListing.variations?.find((v) => v.id === snap.variationId)
      : undefined;
    if (snap.variationId && !liveVar) {
      unavailableItems.push(snap.title);
      return;
    }

    const availableStock = liveVar
      ? liveVar.stockQuantity
      : (liveListing.stockQuantity ?? liveListing.totalStock ?? 1);
    if ((liveVar && !liveVar.isAvailable) || availableStock < snap.quantity) {
      unavailableItems.push(`${snap.title} (insufficient stock)`);
      return;
    }

    const liveUnitPrice = liveVar?.price ?? liveListing.price;
    if (liveUnitPrice !== snap.unitPrice) {
      priceChangedItems.push(
        `${snap.title} (was ${formatNaira(snap.unitPrice)}, now ${formatNaira(liveUnitPrice)})`
      );
    }
  });

  if (unavailableItems.length > 0) {
    return {
      valid: false,
      shouldInvalidate: true,
      unavailableItems,
      priceChangedItems,
      reason: `Unavailable or out-of-stock item(s): ${unavailableItems.join(', ')}. Ask the cart owner to update their cart and send a new request.`,
    };
  }

  if (priceChangedItems.length > 0) {
    return {
      valid: false,
      shouldInvalidate: true,
      unavailableItems,
      priceChangedItems,
      reason: `Item price changed since this request was created: ${priceChangedItems.join('; ')}. The cart owner must create an updated payment request.`,
    };
  }

  return {
    valid: true,
    priceChangedItems: [],
    unavailableItems: [],
  };
}

export interface RecipientSafeOrderView {
  orderId: string;
  orderNumber: string;
  parentOrderNumber?: string;
  fulfillmentStatus: Order['fulfillmentStatus'];
  deliveryMethod: DeliveryMethod;
  vendorName: string;
  vendorState: string;
  deviceTitle: string;
  deviceImage: string;
  deviceSpecsLabel: string;
  disclosedFaults: string[];
  estimatedDelivery: string;
  trackingNumber: string;
  courierName: string;
  dispatchReference?: string;
  dispatcherPhone?: string;
  pickupLocation?: string;
  pickupHours?: string;
  recipientName: string;
  recipientCityState: string;
  deliveryInstructions?: string;
  giftMessage?: string;
  occasion?: string;
  senderDisplayMode: 'named' | 'anonymous';
  senderDisplayLabel: string;
  deliveryVerificationCode?: string;
  deliveryCodeExpiresAt?: string;
  deliveryCodeUsedAt?: string;
  inspectionWindowHours: number;
  inspectionRemainingSeconds: number;
  warrantyDurationMonths: number;
  warrantyStatus?: string;
  hidePriceFromPackage: true;
  specialPackagingGuaranteed: false;
  events: Order['events'];
}

/**
 * Strips ALL payment, price, fee, buyer billing/contact info, and anonymous sender identity from an Order for gift recipient views.
 */
export function buildRecipientSafeOrderView(order: Order): RecipientSafeOrderView {
  const isAnon = order.giftDetails?.senderVisibility === 'anonymous';
  const senderLabel = isAnon
    ? 'Anonymous Sender'
    : order.giftDetails?.senderDisplayName || order.buyerName;

  const v = order.selectedVariation;
  const specsLabel = v
    ? `${v.color}${v.storage ? ` · ${v.storage}` : ''}${v.ram ? ` · ${v.ram}` : ''} · ${v.grade}`
    : `${order.listing.color}${order.listing.storage ? ` · ${order.listing.storage}` : ''} · ${order.listing.cosmeticGrade}`;

  const recipientAddr = order.giftDetails?.recipientAddress || order.deliveryAddress;

  return {
    orderId: order.id,
    orderNumber: order.subOrderNumber || order.orderNumber,
    parentOrderNumber: order.parentOrderNumber,
    fulfillmentStatus: order.fulfillmentStatus,
    deliveryMethod: order.deliveryMethod || 'usedright_delivery',
    vendorName: order.vendorName || order.listing.sellerName,
    vendorState: order.listing.sellerState || 'Lagos State',
    deviceTitle: order.listing.title,
    deviceImage: v?.images?.[0] || order.listing.images[0] || '',
    deviceSpecsLabel: specsLabel,
    disclosedFaults: order.selectedVariation?.disclosedFaults || order.listing.disclosedFaults || [],
    estimatedDelivery: order.estimatedDelivery,
    trackingNumber: order.trackingNumber,
    courierName: order.dispatchDetails?.dispatcherOrCourierName || order.courierName,
    dispatchReference: order.dispatchDetails?.dispatchReference,
    dispatcherPhone: order.dispatchDetails?.dispatcherPhone,
    pickupLocation: order.pickupLocation,
    pickupHours: order.pickupHours,
    recipientName: order.giftDetails?.recipientName || order.deliveryAddress.fullName,
    recipientCityState: `${recipientAddr.city}, ${recipientAddr.state}`,
    deliveryInstructions: order.giftDetails?.deliveryInstructions,
    giftMessage: order.giftDetails?.giftMessage,
    occasion: order.giftDetails?.occasion,
    senderDisplayMode: isAnon ? 'anonymous' : 'named',
    senderDisplayLabel: senderLabel,
    deliveryVerificationCode: order.deliveryVerificationCode,
    deliveryCodeExpiresAt: order.deliveryCodeExpiresAt,
    deliveryCodeUsedAt: order.deliveryCodeUsedAt,
    inspectionWindowHours: Math.max(24, order.inspectionWindowHours || 24),
    inspectionRemainingSeconds: order.inspectionRemainingSeconds ?? order.inspectionSecondsRemaining ?? 86400,
    warrantyDurationMonths: order.warranty?.durationMonths || 3,
    warrantyStatus: order.warranty?.status,
    hidePriceFromPackage: true,
    specialPackagingGuaranteed: false,
    events: order.events,
  };
}

export interface PayerSafeRequestView {
  id: string;
  requestReference: string;
  status: PaymentRequestRecord['status'];
  createdAt: string;
  expiresAt: string;
  validityHours: number;
  paidAt?: string;
  invalidatedReason?: string;
  lastFailureReason?: string;
  orderOwnerDisplayName: string;
  deliveryMethod: DeliveryMethod;
  deliveryDestinationSummary: string;
  isGift: boolean;
  giftRecipientFirstName?: string;
  giftOccasion?: string;
  giftSenderVisibility?: GiftSenderVisibility;
  vendorCount: number;
  items: PaymentRequestItemSnapshot[];
  vendorGroupsSummary: PaymentRequestRecord['vendorGroupsSummary'];
  subtotalAmount: number;
  customerFeeRate: number;
  customer_platform_service_fee: number;
  deliveryFeeTotal: number;
  totalPayableAmount: number;
  currency: 'NGN';
  paymentProviderRef?: string;
  parentOrderId?: string;
  payerSummary?: {
    payerName: string;
    maskedEmail: string;
    paidAt?: string;
    paymentProviderRef?: string;
  };
  parentOrderNumber?: string;
}

function maskEmailAddress(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const local = parts[0];
  const domain = parts[1];
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

/**
 * Strips cart owner email/phone/street-level billing and internal hashes before sending a Payment Request to a Payer.
 */
export function buildPayerSafeRequestView(
  request: PaymentRequestRecord
): PayerSafeRequestView {
  const firstName = request.orderOwnerName.split(' ')[0] || 'UsedRight Customer';
  const recipientFirst = request.giftDetails?.recipientName.split(' ')[0];

  return {
    id: request.id,
    requestReference: request.requestReference,
    status: request.status,
    createdAt: request.createdAt,
    expiresAt: request.expiresAt,
    validityHours: request.validityHours,
    paidAt: request.paidAt,
    invalidatedReason: request.invalidatedReason,
    lastFailureReason: request.lastFailureReason,
    orderOwnerDisplayName: firstName,
    deliveryMethod: request.deliveryMethod,
    deliveryDestinationSummary:
      request.deliveryMethod === 'physical_pickup'
        ? `In-Store Pickup · ${request.deliveryAddress.state}`
        : `${request.deliveryAddress.city}, ${request.deliveryAddress.state}`,
    isGift: request.isGift,
    giftRecipientFirstName: recipientFirst,
    giftOccasion: request.giftDetails?.occasion,
    giftSenderVisibility: request.giftDetails?.senderVisibility,
    vendorCount:
      request.vendorGroupsSummary?.length ||
      new Set(request.itemsSnapshot.map((i) => i.vendorId)).size,
    items: request.itemsSnapshot,
    vendorGroupsSummary: request.vendorGroupsSummary,
    subtotalAmount: request.subtotalAmount,
    customerFeeRate: request.customerFeeRate,
    customer_platform_service_fee: request.customer_platform_service_fee,
    deliveryFeeTotal: request.deliveryFeeTotal,
    totalPayableAmount: request.totalPayableAmount,
    currency: request.currency,
    paymentProviderRef: request.paymentProviderRef || request.payerInfo?.paymentProviderRef,
    parentOrderId: request.parentOrderId,
    payerSummary: request.payerInfo
      ? {
          payerName: request.payerInfo.payerName,
          maskedEmail: maskEmailAddress(request.payerInfo.payerEmail),
          paidAt: request.payerInfo.paidAt,
          paymentProviderRef: request.payerInfo.paymentProviderRef,
        }
      : undefined,
    parentOrderNumber: request.parentOrderNumber,
  };
}


