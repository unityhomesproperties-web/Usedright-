import {
  AuditLogEntry,
  Category,
  DemoRole,
  DeviceCondition,
  DeviceListing,
  DisputeRecord,
  MessageConversation,
  Order,
  PaymentHold,
  VendorStorefront,
} from '../types/marketplace';
import {
  calculateSellerNetPayout,
  calculateSellerServiceCharge,
  formatNaira,
} from './marketplace';

export type BulkAccessoryType =
  | 'Charger'
  | 'Pouch'
  | 'Cable'
  | 'Screen Guard'
  | 'Power Bank'
  | 'Laptop Sleeve';

export const BULK_ACCESSORY_TYPES: BulkAccessoryType[] = [
  'Charger',
  'Pouch',
  'Cable',
  'Screen Guard',
  'Power Bank',
  'Laptop Sleeve',
];

export const ACCESSORY_STUDIO_PRESETS: Record<BulkAccessoryType, string> = {
  Charger: '/assets/images/usbc_charger_20w_studio_1794644013084.jpg',
  Pouch: '/assets/aistudio/IMG_2196_33cba3a2.jpeg',
  Cable: '/assets/images/accessory_powerbank_studio_1794735001532.jpg',
  'Screen Guard': '/assets/images/iphone_15_front_screen_1794644013924.jpg',
  'Power Bank': '/assets/images/accessory_powerbank_studio_1794735001532.jpg',
  'Laptop Sleeve': '/assets/images/laptop_sleeve_hub_studio_1794735000604.jpg',
};

export interface BulkAccessoryRowDraft {
  id: string;
  accessoryType: BulkAccessoryType;
  title: string;
  compatibleModels: string;
  price: number;
  stockQuantity: number;
  condition: 'New' | 'Foreign-Used';
  imageUrl: string;
  brand?: string;
}

export function createEmptyAccessoryRow(index: number = 0): BulkAccessoryRowDraft {
  return {
    id: `acc-row-${Date.now()}-${index}`,
    accessoryType: 'Charger',
    title: '',
    compatibleModels: 'iPhone 13–16, Samsung Galaxy S24',
    price: 15000,
    stockQuantity: 5,
    condition: 'New',
    imageUrl: ACCESSORY_STUDIO_PRESETS.Charger,
    brand: 'Anker',
  };
}

export function validateBulkAccessoryRows(rows: BulkAccessoryRowDraft[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!rows || rows.length === 0) {
    return { valid: false, errors: ['Add at least one accessory or gadget row to publish.'] };
  }

  rows.forEach((row, idx) => {
    const label = `Item #${idx + 1}`;
    if (!row.title || row.title.trim().length < 3) {
      errors.push(`${label}: Enter an accessory title (minimum 3 characters).`);
    }
    if (!row.compatibleModels || row.compatibleModels.trim().length < 2) {
      errors.push(`${label}: Specify compatible device models.`);
    }
    if (!row.price || row.price < 500) {
      errors.push(`${label}: Price must be at least ₦500.`);
    }
    if (!row.stockQuantity || row.stockQuantity < 1) {
      errors.push(`${label}: Stock quantity must be 1 or more.`);
    }
  });

  return { valid: errors.length === 0, errors };
}

function resolveCategoryForAccessory(
  accessoryType: BulkAccessoryType,
  compatibleModels: string
): Category {
  const lowerCompat = compatibleModels.toLowerCase();
  if (
    accessoryType === 'Laptop Sleeve' ||
    lowerCompat.includes('macbook') ||
    lowerCompat.includes('laptop') ||
    lowerCompat.includes('thinkpad') ||
    lowerCompat.includes('xps')
  ) {
    return 'computer_accessories';
  }
  return 'accessories';
}

export function buildListingsFromBulkAccessories(
  rows: BulkAccessoryRowDraft[],
  vendor: VendorStorefront,
  batchReference: string = 'ACC-BULK-2026'
): DeviceListing[] {
  const nowStamp = Date.now();
  const createdDate = new Date().toISOString().slice(0, 10);

  return rows.map((row, idx) => {
    const mappedCondition: DeviceCondition =
      row.condition === 'New' ? 'Brand-New' : 'Foreign-Used';
    const category = resolveCategoryForAccessory(row.accessoryType, row.compatibleModels);
    const cleanTitle = row.title.trim();
    const resolvedBrand =
      row.brand?.trim() ||
      (cleanTitle.split(' ')[0]?.length >= 2 ? cleanTitle.split(' ')[0] : 'UsedRight Gear');
    const resolvedImage =
      row.imageUrl.trim() || ACCESSORY_STUDIO_PRESETS[row.accessoryType] || ACCESSORY_STUDIO_PRESETS.Charger;

    return {
      id: `dev-acc-${nowStamp}-${idx}`,
      category,
      condition: mappedCondition,
      title: cleanTitle,
      brand: resolvedBrand,
      model: row.accessoryType,
      modelYear: 2025,
      yearMade: 2025,
      yearMadePrecision: 'known',
      color: 'Standard',
      price: Math.round(row.price),
      cosmeticGrade: 'Grade A',
      cosmeticDescription: `${row.condition} ${row.accessoryType} · Compatible with ${row.compatibleModels.trim()}.`,
      images: [resolvedImage],
      sellerId: vendor.id,
      sellerName: vendor.name,
      sellerState: vendor.state || 'Lagos State',
      sellerVerified: vendor.verificationBadge,
      sellerRating: vendor.rating,
      sellerSalesCount: vendor.completedOrders,
      foreignUsedStatus: 'Verified Foreign-Used',
      sourceCountry: 'United States',
      batchReference: batchReference.trim() || 'ACC-BULK-2026',
      imeiOrSerial: `ACC-${nowStamp.toString().slice(-6)}-${idx + 1}`,
      disclosedFaults: [],
      disclosedFaultsList: [],
      categorySpecs: {
        'Accessory Type': row.accessoryType,
        'Compatible Models': row.compatibleModels.trim(),
        Condition: row.condition,
        'Available Stock': `${row.stockQuantity} unit(s)`,
      },
      structuredDescription: {
        overview: `${row.condition} ${row.accessoryType} tested for ${row.compatibleModels.trim()}.`,
        compatibilityInfo: row.compatibleModels.trim(),
        includedItems: `${cleanTitle} (${row.condition})`,
      },
      conditionReport: {
        batteryHealth: 100,
        batteryReplaced: 'Original',
        screenOriginality: 'Original, verified',
        screenReplacementHistory: 'Accessory item — no screen',
        faceIdOrFingerprint: 'Not applicable',
        frontCamera: 'Not applicable',
        rearCamera: 'Not applicable',
        speakers: 'Not applicable',
        microphone: 'Not applicable',
        chargingPort: 'Working',
        wifi: 'Not applicable',
        bluetooth: 'Not applicable',
        simFunctionality: 'Not applicable',
        networkLockStatus: 'Unlocked',
        icloudOrGoogleLock: 'Clean & Removed',
        mdmStatus: 'No MDM / Clean',
        imeiVerificationStatus: 'Verified Clean',
        otherRepairsNotes: `${row.condition} accessory checked by ${vendor.name}.`,
      },
      repairHistory: [],
      warrantyDays: 14,
      warrantyPolicyNotes: vendor.warrantyPolicy || '14-day replacement warranty for defective accessories.',
      deliveryFee: 3500,
      freeDeliveryEligible: row.price >= 50000,
      status: 'Active',
      displayOrder: 0,
      createdAt: createdDate,
      views: 1,
      stockQuantity: Math.max(1, Math.floor(row.stockQuantity)),
      totalStock: Math.max(1, Math.floor(row.stockQuantity)),
    };
  });
}

export type DisbursementStatusLabel =
  | 'In Escrow (Under 24h Inspection)'
  | 'In Escrow (Pre-Delivery)'
  | 'Frozen (Dispute)'
  | 'Ready for Payout'
  | 'Successfully Settled'
  | 'Refunded to Customer';

export interface FinancialLedgerRow {
  id: string;
  orderId: string;
  orderNumber: string;
  transactionNumber: string;
  deviceTitle: string;
  variationInfo?: string;
  grossAmount: number;
  feeDeduction: number;
  netExpectedPayout: number;
  disbursementStatus: DisbursementStatusLabel;
  remainingSeconds: number;
  isDisputed: boolean;
  deliveredAt?: string;
  paymentReceivedAt: string;
}

export interface VendorFinancialLedgerSummary {
  totalRevenue: number;
  activeEscrowAmount: number;
  readyForPayoutAmount: number;
  settledAmount: number;
  frozenDisputeAmount: number;
  rows: FinancialLedgerRow[];
}

export function computeVendorFinancialLedger(
  vendorHolds: PaymentHold[]
): VendorFinancialLedgerSummary {
  let totalRevenue = 0;
  let activeEscrowAmount = 0;
  let readyForPayoutAmount = 0;
  let settledAmount = 0;
  let frozenDisputeAmount = 0;

  const rows: FinancialLedgerRow[] = vendorHolds.map((hold) => {
    const gross = hold.grossAmount;
    const fee =
      hold.platformFeeVendor !== undefined
        ? hold.platformFeeVendor
        : calculateSellerServiceCharge(gross);
    const net =
      hold.netVendorPayout !== undefined
        ? hold.netVendorPayout
        : calculateSellerNetPayout(gross);

    let disbursementStatus: DisbursementStatusLabel = 'In Escrow (Pre-Delivery)';

    if (hold.status === 'Refunded') {
      disbursementStatus = 'Refunded to Customer';
    } else if (hold.status === 'Settled') {
      disbursementStatus = 'Successfully Settled';
      totalRevenue += gross;
      settledAmount += net;
    } else if (hold.isDisputed || hold.status === 'Dispute Opened') {
      disbursementStatus = 'Frozen (Dispute)';
      totalRevenue += gross;
      activeEscrowAmount += net;
      frozenDisputeAmount += net;
    } else if (
      hold.status === 'Payment Approved for Release' ||
      (hold.deliveredAt && hold.remainingSeconds <= 0)
    ) {
      disbursementStatus = 'Ready for Payout';
      totalRevenue += gross;
      readyForPayoutAmount += net;
    } else if (
      hold.status === 'Inspection Period Active' ||
      hold.status === 'Delivered' ||
      Boolean(hold.deliveredAt)
    ) {
      disbursementStatus = 'In Escrow (Under 24h Inspection)';
      totalRevenue += gross;
      activeEscrowAmount += net;
    } else {
      disbursementStatus = 'In Escrow (Pre-Delivery)';
      totalRevenue += gross;
      activeEscrowAmount += net;
    }

    return {
      id: hold.id,
      orderId: hold.orderId,
      orderNumber: hold.orderNumber,
      transactionNumber: hold.transactionNumber,
      deviceTitle: hold.deviceTitle,
      variationInfo: hold.variationInfo,
      grossAmount: gross,
      feeDeduction: fee,
      netExpectedPayout: net,
      disbursementStatus,
      remainingSeconds: hold.remainingSeconds,
      isDisputed: hold.isDisputed,
      deliveredAt: hold.deliveredAt,
      paymentReceivedAt: hold.paymentReceivedAt,
    };
  });

  return {
    totalRevenue,
    activeEscrowAmount,
    readyForPayoutAmount,
    settledAmount,
    frozenDisputeAmount,
    rows,
  };
}

export type ActivityCategoryFilter = 'all' | 'orders' | 'price_edits' | 'chats' | 'disputes';

export interface UnifiedActivityItem {
  id: string;
  category: Exclude<ActivityCategoryFilter, 'all'>;
  title: string;
  description: string;
  referenceCode?: string;
  timestampLabel: string;
  sortKey: number;
  tone: 'purple' | 'green' | 'red' | 'neutral';
  orderId?: string;
  conversationId?: string;
  listingId?: string;
}

function parseSortableTime(raw?: string, fallbackSeq: number = 0): number {
  if (!raw) return fallbackSeq;
  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) return parsed;
  return fallbackSeq;
}

function formatReadableTimestamp(raw?: string): string {
  if (!raw) return 'Recent';
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return raw;
  try {
    return new Date(parsed).toLocaleString('en-NG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return raw;
  }
}

export function buildUnifiedActivityHistory(params: {
  role: Extract<DemoRole, 'buyer' | 'seller_approved'>;
  orders: Order[];
  listings: DeviceListing[];
  conversations: MessageConversation[];
  disputes: DisputeRecord[];
  auditLog?: AuditLogEntry[];
}): UnifiedActivityItem[] {
  const { role, orders, listings, conversations, disputes, auditLog = [] } = params;
  const items: UnifiedActivityItem[] = [];
  const seenKeys = new Set<string>();

  const pushUnique = (entry: UnifiedActivityItem) => {
    if (seenKeys.has(entry.id)) return;
    seenKeys.add(entry.id);
    items.push(entry);
  };

  // 1. Order lifecycle milestones
  orders.forEach((order, oIdx) => {
    const baseMs = parseSortableTime(order.createdAt, 1000000 - oIdx * 1000);
    pushUnique({
      id: `act-ord-${order.id}`,
      category: 'orders',
      title: `Order ${order.orderNumber} · ${order.fulfillmentStatus.replace(/_/g, ' ')}`,
      description: `${order.listing.title} (${formatNaira(order.totalAmount)}) — ${
        role === 'seller_approved' ? `Customer: ${order.buyerName}` : `Vendor: ${order.listing.sellerName}`
      }`,
      referenceCode: order.orderNumber,
      timestampLabel: formatReadableTimestamp(order.createdAt),
      sortKey: baseMs + (order.events?.length || 0),
      tone:
        order.fulfillmentStatus === 'Completed'
          ? 'green'
          : order.disputePaused || order.fulfillmentStatus === 'Refunded'
          ? 'red'
          : 'purple',
      orderId: order.id,
      listingId: order.listing.id,
    });
  });

  // 2. Price edits from catalog listings (useful for both vendor inventory tracking and buyer saved/watched price awareness)
  listings.forEach((listing) => {
    (listing.priceChangeHistory || []).forEach((pch, idx) => {
      const tsRaw = pch.timestamp || pch.changedAt;
      const sortKey = parseSortableTime(tsRaw, 950000 - idx * 50);
      const dropped = pch.newPrice < pch.oldPrice;
      pushUnique({
        id: `act-pch-${pch.id}`,
        category: 'price_edits',
        title: `${dropped ? 'Price Dropped' : 'Price Updated'} · ${listing.model || listing.title}`,
        description: `${formatNaira(pch.oldPrice)} → ${formatNaira(pch.newPrice)}${
          pch.reason ? ` (${pch.reason})` : ''
        }`,
        referenceCode: listing.batchReference,
        timestampLabel: formatReadableTimestamp(tsRaw),
        sortKey,
        tone: dropped ? 'green' : 'purple',
        listingId: listing.id,
      });
    });
  });

  // 3. Chat logs from conversations
  conversations.forEach((conv, cIdx) => {
    const latestMsg = conv.messages[conv.messages.length - 1];
    const msgCount = conv.messages.length;
    pushUnique({
      id: `act-chat-${conv.id}`,
      category: 'chats',
      title:
        role === 'seller_approved'
          ? `Chat with ${conv.buyerName}${conv.orderNumber ? ` (${conv.orderNumber})` : ''}`
          : `Chat with ${conv.vendorName}${conv.orderNumber ? ` (${conv.orderNumber})` : ''}`,
      description: latestMsg
        ? `${latestMsg.senderLabel || latestMsg.sender}: "${latestMsg.text.slice(0, 110)}${
            latestMsg.text.length > 110 ? '…' : ''
          }" (${msgCount} message${msgCount === 1 ? '' : 's'})`
        : conv.lastMessage,
      referenceCode: conv.orderNumber || conv.listingTitle,
      timestampLabel: latestMsg?.timestamp || conv.lastMessageTime || 'Recent',
      sortKey: 900000 - cIdx * 100 + msgCount,
      tone: 'neutral',
      conversationId: conv.id,
      orderId: conv.orderId,
      listingId: conv.listingId,
    });
  });

  // 4. Dispute creation & resolution logs
  disputes.forEach((disp, dIdx) => {
    const latestAct = disp.activityHistory[disp.activityHistory.length - 1];
    const tsRaw = disp.resolvedAt || disp.updatedAt || disp.createdAt;
    pushUnique({
      id: `act-disp-${disp.id}`,
      category: 'disputes',
      title: `Dispute ${disp.disputeNumber} · ${disp.status}`,
      description:
        disp.resolutionOutcome ||
        latestAct?.action ||
        `${disp.reason} on ${disp.orderNumber}`,
      referenceCode: disp.orderNumber,
      timestampLabel: formatReadableTimestamp(tsRaw),
      sortKey: parseSortableTime(tsRaw, 980000 - dIdx * 100),
      tone: disp.status === 'Resolved' ? 'green' : 'red',
      orderId: disp.orderId,
      conversationId: disp.conversationId,
    });
  });

  // 5. Relevant Audit Log entries (price updates, bulk publishes, settlements, reports)
  auditLog.forEach((entry, aIdx) => {
    const isOrder =
      entry.actionType === 'order_created' ||
      entry.actionType === 'payment_received' ||
      entry.actionType === 'dispatch_confirmed' ||
      entry.actionType === 'delivery_confirmed' ||
      entry.actionType === 'inspection_completed' ||
      entry.actionType === 'settlement_released';
    const isPriceOrListing = entry.actionType === 'listing_updated';
    const isDispute =
      entry.actionType === 'dispute_opened' ||
      entry.actionType === 'dispute_updated' ||
      entry.actionType === 'dispute_resolved' ||
      entry.actionType === 'refund_issued' ||
      entry.actionType === 'report_submitted';

    // Customers only see their own order/dispute/listing price events, not internal admin config churn
    if (role === 'buyer' && entry.actionType === 'admin_config_changed') {
      return;
    }

    const category: Exclude<ActivityCategoryFilter, 'all'> = isDispute
      ? 'disputes'
      : isPriceOrListing
      ? 'price_edits'
      : isOrder
      ? 'orders'
      : 'orders';

    pushUnique({
      id: `act-aud-${entry.id}`,
      category,
      title: `${entry.actorName} · ${entry.entityRef}`,
      description: entry.details,
      referenceCode: entry.entityRef,
      timestampLabel: formatReadableTimestamp(entry.timestamp),
      sortKey: parseSortableTime(entry.timestamp, 850000 - aIdx * 20),
      tone:
        entry.actionType === 'refund_issued' || entry.actionType === 'dispute_opened'
          ? 'red'
          : entry.actionType === 'settlement_released' || entry.actionType === 'dispute_resolved'
          ? 'green'
          : 'purple',
    });
  });

  return items.sort((a, b) => b.sortKey - a.sortKey);
}
