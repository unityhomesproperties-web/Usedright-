import {
  DeviceListing,
  DisputeReason,
  OrderWarrantyRecord,
  VendorStorefront,
  WarrantyClaimCategory,
  WarrantyPolicyConfig,
} from '../types/marketplace';

export const DEFAULT_WARRANTY_COVERED_TERMS: string[] = [
  'Hardware failures not caused by accidental impact or physical misuse',
  'Unexpected device shutdowns or motherboard failure under normal use',
  'Display failure not caused by cracked glass or external pressure',
  'Battery failure beyond normal wear and expected foreign-used health tolerance',
  'Internal component failure (charging port, speakers, mic, Face ID, or Wi-Fi/Bluetooth) present or emerging under normal use',
  'Material undisclosed technical defects present at delivery',
];

export const DEFAULT_WARRANTY_EXCLUDED_TERMS: string[] = [
  'Accidental drops, cracked screens, bent frames, or impact damage after delivery',
  'Liquid spills, water submersion, or moisture corrosion after delivery',
  'Unauthorised third-party opening, board repair, or part swapping',
  'Software misuse, rooting/jailbreaking, or carrier-banned usage after delivery',
  'Specific faults explicitly disclosed on the product listing at checkout',
];

export const DEFAULT_WARRANTY_POLICY_CONFIG: WarrantyPolicyConfig = {
  defaultDurationMonths: 3,
  applicableCategories: [
    'phones',
    'laptops',
    'tablets',
    'smartwatches',
    'audio',
    'gaming',
    'cameras',
  ],
  coveredSummary: DEFAULT_WARRANTY_COVERED_TERMS,
  excludedSummary: DEFAULT_WARRANTY_EXCLUDED_TERMS,
  claimResponseSlaHours: 48,
  updatedAt: '2026-11-16T08:00:00Z',
  updatedBy: 'UsedRight Marketplace Policy',
};

export const APPROVED_DISPUTE_REASONS: DisputeReason[] = [
  'Physical damage',
  'Wrong item received',
  'Missing accessory',
  'Technical issue',
  'Device not working as advertised',
  'Package not received',
  'Other',
];

export const WARRANTY_CLAIM_CATEGORIES: WarrantyClaimCategory[] = [
  'Battery or charging failure',
  'Display or touch malfunction',
  'Motherboard / unexpected shutdown',
  'Speaker, mic or connectivity defect',
  'Camera or Face ID / biometric fault',
  'Other covered hardware defect',
];

export const ALLOWED_CHAT_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const ALLOWED_CHAT_VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
]);

export const MAX_CHAT_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
export const MAX_CHAT_VIDEO_BYTES = 25 * 1024 * 1024; // 25MB

export function validateAttachmentUpload(input: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}): {
  valid: boolean;
  mediaType?: 'image' | 'video';
  error?: string;
} {
  const mime = (input.mimeType || '').toLowerCase().trim();
  const ext = (input.fileName || '').toLowerCase();

  const isImage =
    ALLOWED_CHAT_IMAGE_MIME_TYPES.has(mime) ||
    (!mime && /\.(jpe?g|png|webp)$/.test(ext));
  const isVideo =
    ALLOWED_CHAT_VIDEO_MIME_TYPES.has(mime) ||
    (!mime && /\.(mp4|webm)$/.test(ext));

  if (!isImage && !isVideo) {
    return {
      valid: false,
      error: 'Unsupported file type. Upload JPEG, PNG, WebP images or MP4/WebM short videos only.',
    };
  }

  if (input.sizeBytes <= 0) {
    return { valid: false, error: 'Selected file appears empty.' };
  }

  if (isImage && input.sizeBytes > MAX_CHAT_IMAGE_BYTES) {
    return { valid: false, error: 'Image attachment exceeds the 8MB maximum limit.' };
  }

  if (isVideo && input.sizeBytes > MAX_CHAT_VIDEO_BYTES) {
    return { valid: false, error: 'Video attachment exceeds the 25MB maximum limit.' };
  }

  return { valid: true, mediaType: isImage ? 'image' : 'video' };
}

/**
 * Adds exact calendar months cleanly (clamping end-of-month e.g. Nov 30 + 3mo -> Feb 28/29).
 */
export function calculateThreeMonthWarrantyDates(
  startIso: string,
  months: number = 3
): { startDate: string; expiryDate: string } {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) {
    const fallback = new Date();
    return calculateThreeMonthWarrantyDates(fallback.toISOString(), months);
  }
  const expiry = new Date(start.getTime());
  const targetMonth = expiry.getUTCMonth() + months;
  const originalDay = expiry.getUTCDate();
  expiry.setUTCDate(1);
  expiry.setUTCMonth(targetMonth);
  const daysInTargetMonth = new Date(
    Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth() + 1, 0)
  ).getUTCDate();
  expiry.setUTCDate(Math.min(originalDay, daysInTargetMonth));

  return {
    startDate: start.toISOString(),
    expiryDate: expiry.toISOString(),
  };
}

export function isWarrantyActive(
  warranty?: OrderWarrantyRecord,
  nowMs: number = Date.now()
): boolean {
  if (!warranty) return false;
  if (warranty.status === 'Voided' || warranty.status === 'Pending Delivery') return false;
  if (!warranty.startDate || !warranty.expiryDate) return false;
  return new Date(warranty.expiryDate).getTime() >= nowMs;
}

export function getWarrantyDaysRemaining(
  warranty?: OrderWarrantyRecord,
  nowMs: number = Date.now()
): number {
  if (!warranty?.expiryDate) return 0;
  const diff = new Date(warranty.expiryDate).getTime() - nowMs;
  if (diff <= 0) return 0;
  return Math.ceil(diff / (24 * 3600 * 1000));
}

export function createOrderWarrantySnapshot(params: {
  orderId: string;
  orderNumber: string;
  listing: DeviceListing;
  vendor?: VendorStorefront;
  warrantyConfig?: WarrantyPolicyConfig;
  deliveredAtIso?: string;
}): OrderWarrantyRecord {
  const { orderId, orderNumber, listing, vendor, warrantyConfig, deliveredAtIso } = params;
  const cfg = warrantyConfig || DEFAULT_WARRANTY_POLICY_CONFIG;
  const months = Math.max(1, cfg.defaultDurationMonths || 3);
  const vendorNumber = vendor?.vendorNumber || 'U-0001';
  const disclosedFaults = (listing.disclosedFaults || []).slice(0, 6);

  const dates = deliveredAtIso
    ? calculateThreeMonthWarrantyDates(deliveredAtIso, months)
    : undefined;

  return {
    warrantyId: `UR-WRN-${orderNumber.replace(/^UR-ORD-/, '')}`,
    orderId,
    orderNumber,
    listingId: listing.id,
    deviceTitle: listing.title,
    serialOrImei: listing.imeiOrSerial,
    vendorId: listing.sellerId,
    vendorNumber,
    vendorName: vendor?.name || listing.sellerName,
    buyerId: '',
    durationMonths: months,
    startDate: dates?.startDate,
    expiryDate: dates?.expiryDate,
    status: dates ? 'Active' : 'Pending Delivery',
    coveredTerms: [...cfg.coveredSummary],
    excludedTerms: [...cfg.excludedSummary],
    disclosedFaultsExcluded: disclosedFaults,
    policyVersion: '1.0',
    isImmutableSnapshot: true,
  };
}

export const ORDER_ARRIVAL_MESSAGE_HEADLINE = 'Your order has arrived! 🎉';

export function buildOrderArrivalNotificationCopy(params: {
  orderNumber: string;
  deviceTitle: string;
  inspectionHours?: number;
  warrantyMonths?: number;
}): { headline: string; chatBody: string; notificationSummary: string } {
  const hours = Math.max(24, params.inspectionHours || 24);
  const months = Math.max(3, params.warrantyMonths || 3);
  const chatBody = [
    `Your order has arrived! 🎉`,
    `Order ${params.orderNumber} (${params.deviceTitle}) delivery is verified.`,
    `Please take some time to carefully inspect your package and ensure everything matches your expectations. If you experience any issues, we encourage you to check your order details and start by resolving them directly through the Order Chat using the "Open Dispute" option within ${hours} hours.`,
    `You also benefit from your ${months}-month vendor hardware warranty starting today.`,
    `Know Exactly What You’re Buying.`,
  ].join('\n\n');

  const notificationSummary = `Your order has arrived! Inspect ${params.deviceTitle} within ${hours} hours and check Order Chat if anything needs attention.`;

  return {
    headline: ORDER_ARRIVAL_MESSAGE_HEADLINE,
    chatBody,
    notificationSummary,
  };
}
