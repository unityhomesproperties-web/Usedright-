import {
  AccessoryItem,
  AppNotification,
  AuditLogEntry,
  CartItem,
  CategoryConfig,
  DeliveryConfig,
  DeliveryProblemType,
  DeliveryVerificationAttemptLog,
  DemoRole,
  DeliveryMethod,
  DeviceListing,
  DisputeEvidence,
  DisputeReason,
  DisputeRecord,
  DisputeResolutionType,
  DisputeStatus,
  GiftOrderDetails,
  MarketplaceState,
  MessageConversation,
  ModerationFlag,
  Order,
  ParentOrderRecord,
  PayerInfoRecord,
  PaymentHold,
  PaymentRequestItemSnapshot,
  PaymentRequestRecord,
  PlatformConfig,
  PlatformFeeConfig,
  PolicyDocument,
  ProductVariation,
  RecipientComplaintCategory,
  RecipientComplaintRecord,
  ThirdPartyPayerDeclaration,
  VendorDispatchDetails,
  WarrantyClaim,
  WarrantyClaimCategory,
  WarrantyClaimStatus,
  WarrantyPolicyConfig,
} from '../types/marketplace';
import {
  BUYER_FEE_RATE,
  calculateBuyerServiceCharge,
  calculateMultiVendorCheckoutQuote,
  calculateSellerNetPayout,
  calculateSellerServiceCharge,
  DEFAULT_FIXED_DELIVERY_FEE,
  DEFAULT_PAYMENT_REQUEST_VALIDITY_HOURS,
  evaluatePaymentRequestAvailability,
  generateDeliveryVerificationCode,
  generateDisputeId,
  generateOrderId,
  generatePaymentRequestRef,
  generatePickupOtp,
  generateRandomUrlToken,
  generateRecipientComplaintNumber,
  generateSubOrderId,
  generateTransactionId,
  generateVendorNumber,
  MAX_CUSTOMER_FEE_RATE,
  MAX_PAYMENT_REQUEST_VALIDITY_HOURS,
  MAX_VENDOR_FEE_RATE,
  MIN_PAYMENT_REQUEST_VALIDITY_HOURS,
  ModerationRiskLevel,
  sanitizeGiftMessage,
  SELLER_FEE_RATE,
  sha256Hex,
  validateGiftOrderDetails,
  validatePlatformFeeConfig,
} from './marketplace';
import {
  buildOrderArrivalNotificationCopy,
  calculateThreeMonthWarrantyDates,
  createOrderWarrantySnapshot,
  DEFAULT_WARRANTY_POLICY_CONFIG,
  isWarrantyActive,
} from './warranty';

const nowLabel = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const isoNow = () => new Date().toISOString();

function appendAudit(
  state: MarketplaceState,
  entry: Omit<AuditLogEntry, 'id' | 'timestamp'>
): AuditLogEntry[] {
  return [
    {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: isoNow(),
      ...entry,
    },
    ...state.auditLog,
  ];
}

export interface CreateOrderPayload {
  buyerId: string;
  orderOwnerId?: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  listing: DeviceListing;
  selectedVariation?: ProductVariation;
  accessories?: AccessoryItem[];
  deliveryMethod: DeliveryMethod;
  deliveryFee: number;
  referralDiscount?: number;
  deliveryAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
  };
  existingConversationId?: string;
  markPaidImmediately?: boolean;
  thirdPartyPayer?: ThirdPartyPayerDeclaration;
  payerInfo?: PayerInfoRecord;
  paymentRequestId?: string;
  paymentRequestReference?: string;
  isGift?: boolean;
  giftDetails?: GiftOrderDetails;
}

/**
 * Atomically creates an Order, immutable item/variation snapshot, PaymentHold,
 * linked order-stage MessageConversation, stock decrement, and AuditLogEntry.
 */
export function createOrderFromCheckout(
  state: MarketplaceState,
  payload: CreateOrderPayload
): { state: MarketplaceState; order: Order; conversationId: string } {
  const orderNumber = generateOrderId();
  const transactionNumber = generateTransactionId();
  const orderId = `ord-${Date.now()}`;
  const unitPrice = payload.selectedVariation?.price ?? payload.listing.price;
  const accTotal = (payload.accessories || []).reduce((sum, a) => sum + a.price, 0);
  const subtotal = unitPrice + accTotal;
  const customerFeeRate = Math.min(state.feeConfig?.customerFeeRate ?? BUYER_FEE_RATE, MAX_CUSTOMER_FEE_RATE);
  const vendor = state.vendors.find((v) => v.id === payload.listing.sellerId);
  const vendorFeeRate = Math.min(
    state.feeConfig?.vendorSpecificRates?.[payload.listing.sellerId] ??
      vendor?.negotiatedVendorFeeRate ??
      state.feeConfig?.vendorFeeRate ??
      SELLER_FEE_RATE,
    MAX_VENDOR_FEE_RATE
  );
  const buyerServiceCharge = calculateBuyerServiceCharge(subtotal, customerFeeRate);
  const sellerServiceCharge = calculateSellerServiceCharge(subtotal, vendorFeeRate);
  const netVendorPayout = calculateSellerNetPayout(subtotal, vendorFeeRate);
  const referralDiscount = payload.referralDiscount || 0;
  const totalAmount = Math.max(0, subtotal + buyerServiceCharge + payload.deliveryFee - referralDiscount);
  const inspectionHours = Math.max(24, state.platformConfig.inspectionHours);
  const paid = payload.markPaidImmediately !== false;
  const vendorNumber = vendor?.vendorNumber || 'U-0001';

  // Snapshot copy so future listing edits never mutate confirmed orders
  const listingSnapshot: DeviceListing = JSON.parse(JSON.stringify(payload.listing));
  const variationSnapshot: ProductVariation | undefined = payload.selectedVariation
    ? JSON.parse(JSON.stringify(payload.selectedVariation))
    : undefined;

  const warrantySnapshot = {
    ...createOrderWarrantySnapshot({
      orderId,
      orderNumber,
      listing: listingSnapshot,
      vendor,
      warrantyConfig: state.warrantyConfig,
    }),
    buyerId: payload.buyerId,
  };

  const newOrder: Order = {
    id: orderId,
    orderNumber,
    parentOrderNumber: orderNumber,
    subOrderNumber: orderNumber,
    transactionNumber,
    vendorId: payload.listing.sellerId,
    vendorName: payload.listing.sellerName,
    vendorNumber,
    isDemoTransaction: true,
    listing: listingSnapshot,
    selectedVariation: variationSnapshot,
    variation: variationSnapshot,
    items: [
      {
        listing: listingSnapshot,
        selectedVariation: variationSnapshot,
        quantity: 1,
        selectedAccessories: payload.accessories || [],
        includedFreeGift: payload.listing.freeGift,
        unitPriceSnapshot: unitPrice,
        conditionSummarySnapshot: variationSnapshot?.conditionSummary || listingSnapshot.cosmeticDescription,
      },
    ],
    buyerId: payload.buyerId,
    buyerName: payload.buyerName,
    buyerEmail: payload.buyerEmail,
    buyerPhone: payload.buyerPhone,
    thirdPartyPayer: payload.thirdPartyPayer,
    deliveryMethod: payload.deliveryMethod,
    pickupOtp: payload.deliveryMethod === 'physical_pickup' ? generatePickupOtp() : undefined,
    pickupLocation: payload.deliveryMethod === 'physical_pickup' ? vendor?.pickupLocation || vendor?.location || 'Ikeja, Lagos' : undefined,
    pickupInstructions: payload.deliveryMethod === 'physical_pickup' ? vendor?.pickupInstructions : undefined,
    pickupHours: vendor?.pickupHours || 'Mon–Sat, 9:00 AM – 6:00 PM',
    deliveryAddress: payload.deliveryAddress,
    dispatchDetails: {
      dispatchStatus: 'pending_dispatch',
      dispatcherOrCourierName: '',
      dispatchReference: '',
      expectedDeliveryWindow:
        payload.deliveryMethod === 'physical_pickup'
          ? 'Ready once vendor confirms pickup slot'
          : state.deliveryConfig?.estimatedDeliveryWindow || '1–3 business days after vendor dispatch',
    },
    warranty: warrantySnapshot,
    deliveryVerificationAttempts: [],
    itemPrice: unitPrice,
    accessoriesPrice: accTotal,
    feeBaseAmount: subtotal,
    customerFeeRate,
    customer_platform_service_fee: buyerServiceCharge,
    vendorFeeRate,
    vendor_platform_service_fee: sellerServiceCharge,
    buyerServiceCharge,
    deliveryFee: payload.deliveryFee,
    fixedDeliveryFeeApplied: payload.deliveryFee,
    totalAmount,
    paymentStatus: paid ? 'Paid (Demo Verified)' : 'Pending',
    fulfillmentStatus: 'Order placed',
    trackingNumber: payload.deliveryMethod === 'physical_pickup' ? 'IN-STORE-PICKUP' : 'Awaiting Vendor Dispatch',
    courierName: payload.deliveryMethod === 'physical_pickup' ? 'Verified Vendor Pickup Desk' : 'Vendor-Managed Dispatch',
    estimatedDelivery: payload.deliveryMethod === 'physical_pickup' ? 'Ready once vendor confirms pickup slot' : 'Pending vendor dispatch arrangement',
    createdAt: isoNow(),
    events: [
      {
        title: paid
          ? `Order ${orderNumber} payment verified & placed`
          : `Order ${orderNumber} placed (awaiting simulated demo payment)`,
        time: nowLabel(),
        done: true,
      },
    ],
    accessories: payload.accessories || [],
    freeGift: payload.listing.freeGift,
    referralDiscountApplied: referralDiscount,
    inspectionWindowHours: inspectionHours,
    inspectionRemainingSeconds: inspectionHours * 3600,
    disputePaused: false,
    disputeStatus: 'None',
    isReviewed: false,
  };

  const variationLabel = variationSnapshot
    ? `${variationSnapshot.color}${variationSnapshot.storage ? ` · ${variationSnapshot.storage}` : ''}${variationSnapshot.ram ? ` · ${variationSnapshot.ram}` : ''} · ${variationSnapshot.grade}`
    : `${listingSnapshot.color}${listingSnapshot.storage ? ` · ${listingSnapshot.storage}` : ''} · ${listingSnapshot.cosmeticGrade}`;

  const newHold: PaymentHold = {
    id: `hold-${Date.now()}`,
    orderId,
    orderNumber,
    transactionNumber,
    vendorId: payload.listing.sellerId,
    vendorNumber,
    vendorName: payload.listing.sellerName,
    buyerId: payload.buyerId,
    buyerName: payload.buyerName,
    deviceTitle: listingSnapshot.title,
    itemTitle: listingSnapshot.title,
    deviceImage: variationSnapshot?.images?.[0] || listingSnapshot.images[0],
    variationInfo: variationLabel,
    grossAmount: totalAmount,
    amount: totalAmount,
    platformFeeBuyer: buyerServiceCharge,
    platformFeeVendor: sellerServiceCharge,
    customer_platform_service_fee: buyerServiceCharge,
    vendor_platform_service_fee: sellerServiceCharge,
    customerFeeRate,
    vendorFeeRate,
    deliveryFeeAllocated: payload.deliveryFee,
    netVendorPayout,
    paymentReceivedAt: nowLabel(),
    createdAt: nowLabel(),
    inspectionHours,
    remainingSeconds: inspectionHours * 3600,
    status: 'Payment Received',
    isDisputed: false,
  };

  // Attach or create post-purchase conversation linked directly to this order
  const matchingExisting = state.conversations.find(
    (c) =>
      c.id === payload.existingConversationId ||
      (c.vendorId === payload.listing.sellerId &&
        c.buyerId === payload.buyerId &&
        c.listingId === payload.listing.id &&
        !c.orderId)
  );

  let targetConversationId: string;
  let updatedConversations: MessageConversation[];
  const systemOrderMsg = {
    id: `msg-${Date.now()}`,
    sender: 'system' as const,
    orderNumber,
    text: `Order ${orderNumber} (${transactionNumber}) created for ${listingSnapshot.title} (${variationLabel}). Payment is protected in hold until confirmed delivery plus ${inspectionHours}h inspection.`,
    timestamp: nowLabel(),
    dateLabel: 'Today',
  };

  if (matchingExisting) {
    targetConversationId = matchingExisting.id;
    updatedConversations = state.conversations.map((c) =>
      c.id === matchingExisting.id
        ? {
            ...c,
            orderId,
            orderNumber,
            stage: 'post_purchase',
            listingPrice: unitPrice,
            lastMessage: systemOrderMsg.text,
            lastMessageTime: 'Just now',
            unreadCountVendor: (c.unreadCountVendor || 0) + 1,
            messages: [...c.messages, systemOrderMsg],
          }
        : c
    );
  } else {
    targetConversationId = `conv-${Date.now()}`;
    const newConv: MessageConversation = {
      id: targetConversationId,
      vendorId: payload.listing.sellerId,
      vendorName: payload.listing.sellerName,
      vendorAvatar: vendor?.logo || listingSnapshot.images[0],
      buyerId: payload.buyerId,
      buyerName: payload.buyerName,
      listingId: listingSnapshot.id,
      listingTitle: listingSnapshot.title,
      listingPrice: unitPrice,
      listingImage: variationSnapshot?.images?.[0] || listingSnapshot.images[0],
      orderId,
      orderNumber,
      stage: 'post_purchase',
      lastMessage: systemOrderMsg.text,
      lastMessageTime: 'Just now',
      unreadCount: 0,
      unreadCountVendor: 1,
      unreadCountBuyer: 0,
      messages: [systemOrderMsg],
    };
    updatedConversations = [newConv, ...state.conversations];
  }

  // Decrement stock cleanly without touching order snapshot
  const updatedListings = state.listings.map((item) => {
    if (item.id !== payload.listing.id) return item;
    if (variationSnapshot && item.variations) {
      const nextVars = item.variations.map((v) =>
        v.id === variationSnapshot.id
          ? {
              ...v,
              stockQuantity: Math.max(0, v.stockQuantity - 1),
              isAvailable: Math.max(0, v.stockQuantity - 1) > 0,
            }
          : v
      );
      return {
        ...item,
        variations: nextVars,
        totalStock: nextVars.reduce((sum, v) => sum + v.stockQuantity, 0),
      };
    }
    return {
      ...item,
      stockQuantity: Math.max(0, (item.stockQuantity ?? 1) - 1),
      totalStock: Math.max(0, (item.totalStock ?? item.stockQuantity ?? 1) - 1),
    };
  });

  const nextState: MarketplaceState = {
    ...state,
    listings: updatedListings,
    orders: [newOrder, ...state.orders],
    paymentHolds: [newHold, ...state.paymentHolds],
    conversations: updatedConversations,
    notifications: [
      {
        id: `notif-${Date.now()}`,
        title: `Order ${orderNumber} Placed`,
        message: `Your payment of ₦${totalAmount.toLocaleString('en-NG')} is held safely until delivery and ${inspectionHours}h inspection.`,
        time: 'Just now',
        read: false,
        type: 'order',
        recipientRole: 'buyer',
        orderId,
        conversationId: targetConversationId,
      },
      ...state.notifications,
    ],
    auditLog: appendAudit(state, {
      actorRole: 'buyer',
      actorName: payload.buyerName,
      actionType: 'order_created',
      entityRef: orderNumber,
      details: `Created ${orderNumber} (${transactionNumber}) for ${listingSnapshot.title}.`,
    }),
  };

  return { state: nextState, order: newOrder, conversationId: targetConversationId };
}

export function simulatePayment(state: MarketplaceState, orderId: string): MarketplaceState {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) return state;

  return {
    ...state,
    orders: state.orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            paymentStatus: 'Paid (Escrow Secured)',
            events: [
              ...o.events,
              { title: 'Demo payment confirmed and placed in protected hold', time: nowLabel(), done: true },
            ],
          }
        : o
    ),
    paymentHolds: state.paymentHolds.map((h) =>
      h.orderId === orderId ? { ...h, status: 'Payment Received' } : h
    ),
    auditLog: appendAudit(state, {
      actorRole: 'system',
      actorName: 'Payment Gateway (Demo)',
      actionType: 'payment_received',
      entityRef: order.orderNumber,
      details: `Demo payment confirmed for ${order.orderNumber}.`,
    }),
  };
}

export function simulateDispatch(
  state: MarketplaceState,
  orderId: string,
  trackingNumber?: string,
  courierName?: string
): MarketplaceState {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) return state;

  const isPickup = order.deliveryMethod === 'physical_pickup';
  const nextStatus = isPickup ? 'Ready for Pickup' : 'In transit';
  const label = isPickup
    ? `Ready for in-store pickup (OTP: ${order.pickupOtp || 'UR-PICK'}) — inspection starts only after physical collection`
    : `Dispatched with ${courierName || order.courierName} (${trackingNumber || order.trackingNumber}) — inspection starts only on delivery`;

  return {
    ...state,
    orders: state.orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            fulfillmentStatus: nextStatus,
            trackingNumber: trackingNumber || o.trackingNumber,
            courierName: courierName || o.courierName,
            events: [...o.events, { title: label, time: nowLabel(), done: true }],
          }
        : o
    ),
    paymentHolds: state.paymentHolds.map((h) =>
      h.orderId === orderId ? { ...h, status: 'Dispatched' } : h
    ),
    conversations: state.conversations.map((c) =>
      c.orderId === orderId
        ? {
            ...c,
            lastMessage: label,
            lastMessageTime: 'Just now',
            messages: [
              ...c.messages,
              {
                id: `msg-${Date.now()}`,
                sender: 'system',
                orderNumber: order.orderNumber,
                text: label,
                timestamp: nowLabel(),
                dateLabel: 'Today',
              },
            ],
          }
        : c
    ),
    auditLog: appendAudit(state, {
      actorRole: 'seller_approved',
      actorName: order.listing.sellerName,
      actionType: 'dispatch_confirmed',
      entityRef: order.orderNumber,
      details: label,
    }),
  };
}

/**
 * Starts the minimum >=24-hour inspection countdown AND the 3-month vendor warranty strictly
 * upon confirmed physical delivery/collection, posting the approved Arrival message & notification.
 */
export function confirmPhysicalDeliveryOrReceipt(
  state: MarketplaceState,
  orderId: string,
  actor: 'buyer' | 'courier' | 'system' = 'courier'
): MarketplaceState {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) return state;

  const inspectionHours = Math.max(24, order.inspectionWindowHours || state.platformConfig.inspectionHours);
  const fullSeconds = inspectionHours * 3600;
  const confirmedAtIso = order.deliveredAt || isoNow();
  const inspectionExpiresAt =
    order.inspectionExpiresAt ||
    new Date(new Date(confirmedAtIso).getTime() + fullSeconds * 1000).toISOString();

  const warrantyCfg = state.warrantyConfig || DEFAULT_WARRANTY_POLICY_CONFIG;
  const warrantyMonths = Math.max(3, order.warranty?.durationMonths || warrantyCfg.defaultDurationMonths || 3);
  const vendor = state.vendors.find((v) => v.id === (order.vendorId || order.listing.sellerId));
  const baseWarranty =
    order.warranty ||
    createOrderWarrantySnapshot({
      orderId: order.id,
      orderNumber: order.orderNumber,
      listing: order.listing,
      vendor,
      warrantyConfig: warrantyCfg,
    });
  const wDates = calculateThreeMonthWarrantyDates(confirmedAtIso, warrantyMonths);
  const activatedWarranty = {
    ...baseWarranty,
    buyerId: order.buyerId,
    durationMonths: warrantyMonths,
    startDate: baseWarranty.startDate || wDates.startDate,
    expiryDate: baseWarranty.expiryDate || wDates.expiryDate,
    status: baseWarranty.status === 'Claim Open' ? ('Claim Open' as const) : ('Active' as const),
  };

  const arrivalCopy = buildOrderArrivalNotificationCopy({
    orderNumber: order.orderNumber,
    deviceTitle: order.listing.title,
    inspectionHours,
    warrantyMonths,
  });

  const msgText = order.isGift
    ? actor === 'buyer'
      ? `Gift order ${order.orderNumber} receipt confirmed. ${inspectionHours}-hour inspection period and ${warrantyMonths}-month vendor warranty are now active.`
      : `Gift delivery confirmed by recipient (${order.giftDetails?.recipientName || order.deliveryAddress.fullName}) for ${order.orderNumber}. ${inspectionHours}-hour inspection period and ${warrantyMonths}-month vendor warranty are now active.`
    : actor === 'buyer'
    ? `Customer confirmed physical receipt for ${order.orderNumber}. ${inspectionHours}-hour inspection period and ${warrantyMonths}-month vendor warranty are now active.`
    : `Delivery confirmed for ${order.orderNumber}. ${inspectionHours}-hour inspection period and ${warrantyMonths}-month vendor warranty are now active.`;

  const arrivalNotifications: AppNotification[] = [
    {
      id: `notif-arrival-${Date.now()}`,
      title: `${arrivalCopy.headline} (${order.orderNumber})`,
      message: order.isGift
        ? `Your gift to ${order.giftDetails?.recipientName || order.deliveryAddress.fullName} (${order.listing.title}) has been delivered! ${inspectionHours}-hour inspection and ${warrantyMonths}-month vendor warranty are now active.`
        : arrivalCopy.notificationSummary,
      time: 'Just now',
      read: false,
      type: 'inspection',
      recipientRole: 'buyer',
      orderId: order.id,
    },
  ];

  if (order.isGift) {
    const isAnon = order.giftDetails?.senderVisibility === 'anonymous';
    arrivalNotifications.unshift({
      id: `notif-gift-arr-${Date.now() + 1}`,
      title: `Your Gift Has Arrived (${order.orderNumber})`,
      message: `${order.listing.title} delivered cleanly.${isAnon ? '' : ` From ${order.giftDetails?.senderDisplayName || order.buyerName}.`} Inspect the gadget within ${inspectionHours} hours and report any undisclosed issue if needed.`,
      time: 'Just now',
      read: false,
      type: 'inspection',
      recipientRole: 'recipient',
      isRecipientSafe: true,
      orderId: order.id,
    });
  }

  return {
    ...state,
    orders: state.orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            fulfillmentStatus: 'Delivered_In_Inspection',
            buyerConfirmedReceipt: actor === 'buyer' || o.isGift ? true : o.buyerConfirmedReceipt,
            recipientConfirmedReceipt: o.isGift ? true : o.recipientConfirmedReceipt,
            deliveredAt: confirmedAtIso,
            arrivalMessageSentAt: o.arrivalMessageSentAt || confirmedAtIso,
            inspectionWindowHours: inspectionHours,
            inspectionRemainingSeconds: fullSeconds,
            inspectionSecondsRemaining: fullSeconds,
            inspectionExpiresAt,
            warranty: activatedWarranty,
            estimatedDelivery: `Delivered (${nowLabel()})`,
            events: [...o.events, { title: msgText, time: nowLabel(), done: true }],
          }
        : o
    ),
    paymentHolds: state.paymentHolds.map((h) =>
      h.orderId === orderId
        ? {
            ...h,
            status: 'Inspection Period Active',
            deliveredAt: h.deliveredAt || nowLabel(),
            inspectionHours,
            inspectionExpiresAt,
            remainingSeconds: fullSeconds,
          }
        : h
    ),
    conversations: state.conversations.map((c) =>
      c.orderId === orderId
        ? {
            ...c,
            lastMessage: arrivalCopy.headline,
            lastMessageTime: 'Just now',
            unreadCountBuyer: (c.unreadCountBuyer || 0) + 1,
            messages: [
              ...c.messages,
              {
                id: `msg-arr-${Date.now()}`,
                sender: 'system',
                orderNumber: order.orderNumber,
                isArrivalWelcomeCard: true,
                text: arrivalCopy.chatBody,
                timestamp: nowLabel(),
                dateLabel: 'Today',
              },
            ],
          }
        : c
    ),
    notifications: [...arrivalNotifications, ...state.notifications],
    auditLog: appendAudit(state, {
      actorRole: actor === 'buyer' ? 'buyer' : 'system',
      actorName: actor === 'buyer' ? order.buyerName : 'Delivery Confirmation',
      actionType: 'delivery_confirmed',
      entityRef: order.orderNumber,
      details: `${msgText} Warranty ID: ${activatedWarranty.warrantyId} expires ${activatedWarranty.expiryDate?.slice(0, 10)}.`,
    }),
  };
}

/**
 * Advances inspection countdown only when delivered & not paused by an open dispute.
 */
export function advanceInspectionTimer(
  state: MarketplaceState,
  orderId: string,
  seconds: number
): MarketplaceState {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) return state;

  const isInInspection =
    order.fulfillmentStatus === 'Delivered' ||
    order.fulfillmentStatus === 'Buyer inspection' ||
    order.fulfillmentStatus === 'Delivered_In_Inspection';

  if (!isInInspection || order.disputePaused) {
    return state;
  }

  const currentSec = order.inspectionRemainingSeconds ?? order.inspectionSecondsRemaining ?? 86400;
  const nextSec = Math.max(0, currentSec - seconds);

  const nextState: MarketplaceState = {
    ...state,
    orders: state.orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            inspectionRemainingSeconds: nextSec,
            inspectionSecondsRemaining: nextSec,
          }
        : o
    ),
    paymentHolds: state.paymentHolds.map((h) =>
      h.orderId === orderId
        ? {
            ...h,
            remainingSeconds: nextSec,
            status: nextSec === 0 && !h.isDisputed ? 'Payment Approved for Release' : h.status,
          }
        : h
    ),
  };

  if (nextSec === 0) {
    return completeOrderSettlement(nextState, orderId, 'Inspection timer ended cleanly with no dispute');
  }
  return nextState;
}

export function completeOrderSettlement(
  state: MarketplaceState,
  orderId: string,
  reason: string = 'Customer accepted the order and released payment'
): MarketplaceState {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order || order.disputePaused) return state;

  const msgText = `Inspection completed (${order.orderNumber}). ${reason}. Vendor settlement recorded.`;

  return {
    ...state,
    orders: state.orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            fulfillmentStatus: 'Completed',
            inspectionRemainingSeconds: 0,
            inspectionSecondsRemaining: 0,
            events: [...o.events, { title: msgText, time: nowLabel(), done: true }],
          }
        : o
    ),
    paymentHolds: state.paymentHolds.map((h) =>
      h.orderId === orderId
        ? { ...h, status: 'Settled', remainingSeconds: 0 }
        : h
    ),
    vendors: state.vendors.map((v) =>
      v.id === order.listing.sellerId
        ? { ...v, completedOrders: v.completedOrders + 1 }
        : v
    ),
    conversations: state.conversations.map((c) =>
      c.orderId === orderId
        ? {
            ...c,
            lastMessage: msgText,
            lastMessageTime: 'Just now',
            messages: [
              ...c.messages,
              {
                id: `msg-${Date.now()}`,
                sender: 'system',
                orderNumber: order.orderNumber,
                text: msgText,
                timestamp: nowLabel(),
              },
            ],
          }
        : c
    ),
    auditLog: appendAudit(state, {
      actorRole: 'system',
      actorName: 'Conditional Settlement Engine',
      actionType: 'settlement_released',
      entityRef: order.orderNumber,
      details: msgText,
    }),
  };
}

export interface OpenDisputePayload {
  orderId: string;
  conversationId: string;
  reason: DisputeReason;
  description: string;
  requestedResolution: DisputeResolutionType;
  evidenceFiles?: { fileName: string; type: 'image' | 'video' | 'document'; caption?: string }[];
}

/**
 * Opens an in-chat dispute, freezes payout release, pauses inspection timer,
 * notifies customer, vendor, and UsedRight administrators.
 */
export function openDisputeInChat(
  state: MarketplaceState,
  payload: OpenDisputePayload
): { state: MarketplaceState; dispute?: DisputeRecord } {
  const order = state.orders.find((o) => o.id === payload.orderId);
  if (!order) return { state };

  const hold = state.paymentHolds.find((h) => h.orderId === order.id);
  const disputeNumber = generateDisputeId();
  const disputeId = `dsp-${Date.now()}`;

  const evidence: DisputeEvidence[] = (payload.evidenceFiles || []).map((f, idx) => ({
    id: `ev-${Date.now()}-${idx}`,
    uploadedBy: 'buyer',
    uploaderName: order.buyerName,
    type: f.type,
    fileName: f.fileName,
    caption: f.caption,
    uploadedAt: nowLabel(),
  }));

  const newDispute: DisputeRecord = {
    id: disputeId,
    disputeNumber,
    orderId: order.id,
    orderNumber: order.orderNumber,
    transactionNumber: order.transactionNumber || hold?.transactionNumber || 'UR-TXN-2026-000000',
    conversationId: payload.conversationId,
    buyerId: order.buyerId,
    buyerName: order.buyerName,
    vendorId: order.listing.sellerId,
    vendorName: order.listing.sellerName,
    listingTitle: order.listing.title,
    reason: payload.reason,
    description: payload.description,
    requestedResolution: payload.requestedResolution,
    status: 'Problem Reported',
    createdAt: isoNow(),
    updatedAt: isoNow(),
    evidence,
    activityHistory: [
      {
        id: `act-${Date.now()}`,
        actorRole: 'buyer',
        actorName: order.buyerName,
        action: `Problem Reported (${disputeNumber}): ${payload.reason}. Payout automatically frozen.`,
        timestamp: nowLabel(),
      },
    ],
    internalNotes: [],
  };

  const chatAlert = `PROBLEM REPORTED (${disputeNumber}) for ${order.orderNumber}: "${payload.reason}". Automatic payment release is now paused while UsedRight Support reviews the conversation and evidence.`;

  const nextState: MarketplaceState = {
    ...state,
    disputes: [newDispute, ...state.disputes],
    orders: state.orders.map((o) =>
      o.id === order.id
        ? {
            ...o,
            fulfillmentStatus: 'Dispute_Opened',
            disputePaused: true,
            disputeStatus: 'Funds Frozen',
            disputeId,
            disputeReason: payload.reason,
            events: [...o.events, { title: chatAlert, time: nowLabel(), done: true }],
          }
        : o
    ),
    paymentHolds: state.paymentHolds.map((h) =>
      h.orderId === order.id
        ? {
            ...h,
            status: 'Dispute Opened',
            isDisputed: true,
            disputeId,
            disputeReason: payload.reason,
          }
        : h
    ),
    conversations: state.conversations.map((c) =>
      c.id === payload.conversationId || c.orderId === order.id
        ? {
            ...c,
            lastMessage: chatAlert,
            lastMessageTime: 'Just now',
            unreadCountVendor: (c.unreadCountVendor || 0) + 1,
            messages: [
              ...c.messages,
              {
                id: `msg-${Date.now()}`,
                sender: 'system',
                disputeId,
                orderNumber: order.orderNumber,
                text: chatAlert,
                timestamp: nowLabel(),
              },
            ],
          }
        : c
    ),
    notifications: [
      {
        id: `notif-adm-${Date.now()}`,
        title: `New Dispute ${disputeNumber}`,
        message: `${order.buyerName} reported "${payload.reason}" on ${order.orderNumber}. Funds paused.`,
        time: 'Just now',
        read: false,
        type: 'dispute',
        recipientRole: 'admin',
        orderId: order.id,
        conversationId: payload.conversationId,
      },
      {
        id: `notif-vnd-${Date.now() + 1}`,
        title: `Dispute Opened (${order.orderNumber})`,
        message: `Payout release paused for ${order.orderNumber} while UsedRight Support reviews.`,
        time: 'Just now',
        read: false,
        type: 'dispute',
        recipientRole: 'vendor',
        orderId: order.id,
        conversationId: payload.conversationId,
      },
      ...state.notifications,
    ],
    auditLog: appendAudit(state, {
      actorRole: 'buyer',
      actorName: order.buyerName,
      actionType: 'dispute_opened',
      entityRef: disputeNumber,
      details: `Opened ${disputeNumber} on ${order.orderNumber}: ${payload.reason}.`,
    }),
  };

  return { state: nextState, dispute: newDispute };
}

export interface AdminUpdateDisputePayload {
  disputeId: string;
  adminName: string;
  newStatus?: DisputeStatus;
  publicMessage?: string;
  internalNote?: string;
}

/**
 * Allows UsedRight Support (Admin) to join chat publicly with "USED RIGHT SUPPORT"
 * while keeping internalNotes strictly separated from customer & vendor views.
 */
export function adminJoinDisputeAndUpdate(
  state: MarketplaceState,
  payload: AdminUpdateDisputePayload
): MarketplaceState {
  const dispute = state.disputes.find((d) => d.id === payload.disputeId);
  if (!dispute) return state;

  const updatedDisputes = state.disputes.map((d) => {
    if (d.id !== payload.disputeId) return d;
    const nextNotes = payload.internalNote
      ? [
          ...d.internalNotes,
          {
            id: `note-${Date.now()}`,
            adminName: payload.adminName,
            note: payload.internalNote,
            createdAt: nowLabel(),
          },
        ]
      : d.internalNotes;

    const activityAdditions = [];
    if (payload.newStatus && payload.newStatus !== d.status) {
      activityAdditions.push({
        id: `act-${Date.now()}-1`,
        actorRole: 'admin' as const,
        actorName: `USED RIGHT SUPPORT (${payload.adminName})`,
        action: `Changed dispute status to ${payload.newStatus}`,
        timestamp: nowLabel(),
      });
    }
    if (payload.publicMessage) {
      activityAdditions.push({
        id: `act-${Date.now()}-2`,
        actorRole: 'admin' as const,
        actorName: `USED RIGHT SUPPORT (${payload.adminName})`,
        action: `Posted official update in transaction chat`,
        timestamp: nowLabel(),
      });
    }

    return {
      ...d,
      status: payload.newStatus || d.status,
      adminAssigned: payload.adminName,
      updatedAt: isoNow(),
      internalNotes: nextNotes,
      activityHistory: [...d.activityHistory, ...activityAdditions],
    };
  });

  const updatedConversations = payload.publicMessage
    ? state.conversations.map((c) =>
        c.id === dispute.conversationId || c.orderId === dispute.orderId
          ? {
              ...c,
              lastMessage: `USED RIGHT SUPPORT: ${payload.publicMessage}`,
              lastMessageTime: 'Just now',
              unreadCountBuyer: (c.unreadCountBuyer || 0) + 1,
              unreadCountVendor: (c.unreadCountVendor || 0) + 1,
              messages: [
                ...c.messages,
                {
                  id: `msg-${Date.now()}`,
                  sender: 'admin' as const,
                  senderLabel: 'USED RIGHT SUPPORT',
                  disputeId: dispute.id,
                  orderNumber: dispute.orderNumber,
                  isOfficialUpdate: true,
                  text: payload.publicMessage!,
                  timestamp: nowLabel(),
                },
              ],
            }
          : c
      )
    : state.conversations;

  return {
    ...state,
    disputes: updatedDisputes,
    conversations: updatedConversations,
    auditLog: appendAudit(state, {
      actorRole: 'admin',
      actorName: payload.adminName,
      actionType: 'dispute_updated',
      entityRef: dispute.disputeNumber,
      details: payload.publicMessage
        ? `Posted official USED RIGHT SUPPORT message (${payload.newStatus || dispute.status}).`
        : `Updated ${dispute.disputeNumber} status/internal notes.`,
    }),
  };
}

export interface ResolveDisputePayload {
  disputeId: string;
  adminName: string;
  decision: 'refund_buyer' | 'release_vendor';
  outcomeSummary: string;
}

export function adminResolveDispute(
  state: MarketplaceState,
  payload: ResolveDisputePayload
): MarketplaceState {
  const dispute = state.disputes.find((d) => d.id === payload.disputeId);
  if (!dispute) return state;

  const targetOrder = state.orders.find((o) => o.id === dispute.orderId);
  // Prevent duplicate refunds on orders already refunded
  if (payload.decision === 'refund_buyer' && targetOrder?.fulfillmentStatus === 'Refunded') {
    return state;
  }

  const isRefund = payload.decision === 'refund_buyer';
  const payerTrace = targetOrder?.payerInfo
    ? ` Refund routes strictly to original payment ref (${targetOrder.payerInfo.paymentProviderRef || targetOrder.transactionNumber}) for payer ${targetOrder.payerInfo.payerName}.`
    : targetOrder?.transactionNumber
    ? ` Refund routes back to original payment method (${targetOrder.transactionNumber}).`
    : '';
  const resolutionMsg = isRefund
    ? `USED RIGHT SUPPORT resolved ${dispute.disputeNumber}: Full refund approved for customer. Order ${dispute.orderNumber} closed.${payerTrace}`
    : `USED RIGHT SUPPORT resolved ${dispute.disputeNumber}: Payment approved for vendor release. Order ${dispute.orderNumber} completed.`;

  const extraNotifs: AppNotification[] = isRefund
    ? [
        {
          id: `notif-ref-buy-${Date.now()}`,
          title: `Refund Approved (${dispute.orderNumber})`,
          message: `Full refund approved for ${dispute.orderNumber}.${payerTrace}`,
          time: 'Just now',
          read: false,
          type: 'dispute',
          recipientRole: 'buyer',
          orderId: dispute.orderId,
        },
        ...(targetOrder?.payerInfo && targetOrder.payerInfo.payerId !== targetOrder.buyerId
          ? [
              {
                id: `notif-ref-pay-${Date.now() + 1}`,
                title: `Refund Processed to Original Payment (${dispute.orderNumber})`,
                message: `Refund of ₦${targetOrder.totalAmount.toLocaleString('en-NG')} approved back to ${targetOrder.payerInfo.payerName}'s original payment method (${targetOrder.payerInfo.paymentProviderRef || targetOrder.transactionNumber}).`,
                time: 'Just now',
                read: false,
                type: 'dispute' as const,
                recipientRole: 'payer' as const,
                orderId: dispute.orderId,
              },
            ]
          : []),
      ]
    : [];

  return {
    ...state,
    disputes: state.disputes.map((d) =>
      d.id === dispute.id
        ? {
            ...d,
            status: 'Resolved',
            resolutionOutcome: payload.outcomeSummary || resolutionMsg,
            resolvedAt: isoNow(),
            updatedAt: isoNow(),
            activityHistory: [
              ...d.activityHistory,
              {
                id: `act-${Date.now()}`,
                actorRole: 'admin',
                actorName: `USED RIGHT SUPPORT (${payload.adminName})`,
                action: payload.outcomeSummary || resolutionMsg,
                timestamp: nowLabel(),
              },
            ],
          }
        : d
    ),
    orders: state.orders.map((o) =>
      o.id === dispute.orderId
        ? {
            ...o,
            fulfillmentStatus: isRefund ? 'Refunded' : 'Completed',
            paymentStatus: isRefund ? 'Refunded' : 'Paid (Escrow Secured)',
            disputePaused: false,
            disputeStatus: 'Resolved',
            refundTargetSummary: isRefund
              ? `Refunded via original ref ${o.payerInfo?.paymentProviderRef || o.transactionNumber || 'Paystack'} (${o.payerInfo?.payerName || o.buyerName})`
              : o.refundTargetSummary,
            events: [...o.events, { title: resolutionMsg, time: nowLabel(), done: true }],
          }
        : o
    ),
    paymentHolds: state.paymentHolds.map((h) =>
      h.orderId === dispute.orderId
        ? {
            ...h,
            status: isRefund ? 'Refunded' : 'Settled',
            isDisputed: false,
            remainingSeconds: 0,
            refundedAmount: isRefund ? targetOrder?.totalAmount ?? h.grossAmount : h.refundedAmount,
          }
        : h
    ),
    conversations: state.conversations.map((c) =>
      c.id === dispute.conversationId || c.orderId === dispute.orderId
        ? {
            ...c,
            lastMessage: resolutionMsg,
            lastMessageTime: 'Just now',
            messages: [
              ...c.messages,
              {
                id: `msg-${Date.now()}`,
                sender: 'admin',
                senderLabel: 'USED RIGHT SUPPORT',
                disputeId: dispute.id,
                orderNumber: dispute.orderNumber,
                isOfficialUpdate: true,
                text: resolutionMsg,
                timestamp: nowLabel(),
              },
            ],
          }
        : c
    ),
    notifications: [...extraNotifs, ...state.notifications],
    auditLog: appendAudit(state, {
      actorRole: 'admin',
      actorName: payload.adminName,
      actionType: isRefund ? 'refund_issued' : 'dispute_resolved',
      entityRef: dispute.disputeNumber,
      details: resolutionMsg,
    }),
  };
}

/**
 * Privacy guard: strips internal admin notes when viewed by customer or vendor.
 */
export function getRoleSafeDisputeView(
  dispute: DisputeRecord,
  role: DemoRole
): DisputeRecord {
  if (role === 'admin') {
    return dispute;
  }
  return {
    ...dispute,
    internalNotes: [],
  };
}

/**
 * Updates listing price, stock, or variations while guaranteeing confirmed order snapshots are never altered.
 */
export function updateListingSafely(
  state: MarketplaceState,
  listingId: string,
  updates: Partial<DeviceListing>,
  reason?: string
): MarketplaceState {
  const existing = state.listings.find((l) => l.id === listingId);
  if (!existing) return state;

  const priceChanged = updates.price !== undefined && updates.price !== existing.price;
  const newPriceRecord = priceChanged
    ? [
        {
          id: `pch-${Date.now()}`,
          listingId,
          oldPrice: existing.price,
          newPrice: updates.price!,
          changedAt: nowLabel(),
          reason: reason || 'Vendor updated listing price',
        },
        ...(existing.priceChangeHistory || []),
      ]
    : existing.priceChangeHistory;

  return {
    ...state,
    listings: state.listings.map((l) =>
      l.id === listingId
        ? {
            ...l,
            ...updates,
            priceChangeHistory: newPriceRecord,
          }
        : l
    ),
    auditLog: appendAudit(state, {
      actorRole: 'seller_approved',
      actorName: existing.sellerName,
      actionType: 'listing_updated',
      entityRef: existing.title,
      details: priceChanged
        ? `Updated price from ₦${existing.price.toLocaleString('en-NG')} to ₦${updates.price!.toLocaleString('en-NG')} (existing orders unaffected).`
        : `Updated stock/details for ${existing.title}.`,
    }),
  };
}

export interface AdminConfigUpdatePayload {
  brandNewEnabled?: boolean;
  inspectionHours?: number;
  categories?: CategoryConfig[];
  adminName?: string;
}

/**
 * Updates platform configuration while enforcing minimum 24-hour inspection window floor.
 */
export function configureAdminSettings(
  state: MarketplaceState,
  payload: AdminConfigUpdatePayload
): MarketplaceState {
  const nextHours =
    payload.inspectionHours !== undefined
      ? Math.max(24, Math.floor(payload.inspectionHours))
      : state.platformConfig.inspectionHours;

  const nextConfig: PlatformConfig = {
    brandNewEnabled:
      payload.brandNewEnabled !== undefined
        ? payload.brandNewEnabled
        : state.platformConfig.brandNewEnabled,
    inspectionHours: nextHours,
    categories: payload.categories || state.platformConfig.categories,
  };

  return {
    ...state,
    platformConfig: nextConfig,
    auditLog: appendAudit(state, {
      actorRole: 'admin',
      actorName: payload.adminName || 'UsedRight Admin',
      actionType: 'admin_config_changed',
      entityRef: 'PlatformConfig',
      details: `Updated config: inspectionHours=${nextHours}h, brandNewEnabled=${nextConfig.brandNewEnabled}, activeCategories=${nextConfig.categories.filter((c) => c.enabled).length}.`,
    }),
  };
}

export type RoleLockedOrderAction =
  | 'accept_order'
  | 'start_preparation'
  | 'request_courier_pickup'
  | 'confirm_customer_receipt'
  | 'start_inspection_timer'
  | 'release_escrow_early'
  | 'report_problem';

/**
 * Enforces strict role-locked guardrails across customer, vendor, and support workflows.
 * Vendors CANNOT confirm receipt on behalf of buyers, start the 24h inspection timer, or release protected funds.
 */
export function canRolePerformOrderAction(
  role: 'buyer' | 'vendor' | 'admin',
  action: RoleLockedOrderAction,
  orderStatus: Order['fulfillmentStatus']
): { allowed: boolean; reason?: string } {
  if (
    action === 'confirm_customer_receipt' ||
    action === 'start_inspection_timer'
  ) {
    if (role !== 'buyer') {
      return {
        allowed: false,
        reason:
          'Role-locked: Only the customer can confirm physical receipt and start the 24-hour inspection period.',
      };
    }
    const eligibleStatuses: Order['fulfillmentStatus'][] = [
      'In transit',
      'Ready for Pickup',
      'Delivered',
    ];
    if (!eligibleStatuses.includes(orderStatus)) {
      return {
        allowed: false,
        reason: 'Physical receipt can only be confirmed after dispatch or courier delivery scan.',
      };
    }
    return { allowed: true };
  }

  if (action === 'release_escrow_early') {
    if (role === 'vendor') {
      return {
        allowed: false,
        reason:
          'Role-locked: Vendors cannot release protected escrow funds early. Funds release automatically after the buyer inspection window.',
      };
    }
    return { allowed: true };
  }

  if (
    action === 'accept_order' ||
    action === 'start_preparation' ||
    action === 'request_courier_pickup'
  ) {
    if (role !== 'vendor') {
      return {
        allowed: false,
        reason: 'Only the fulfilling vendor can perform order preparation and dispatch actions.',
      };
    }
    return { allowed: true };
  }

  if (action === 'report_problem') {
    if (role !== 'buyer') {
      return {
        allowed: false,
        reason: 'Only the customer can report a post-delivery problem.',
      };
    }
    return { allowed: true };
  }

  return { allowed: true };
}

export interface MultiVendorCheckoutPayload {
  buyerId: string;
  orderOwnerId?: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  cartItems: CartItem[];
  deliveryMethod: DeliveryMethod;
  referralDiscount?: number;
  idempotencyKey?: string;
  paymentProviderRef?: string;
  isDemoTransaction?: boolean;
  thirdPartyPayer?: ThirdPartyPayerDeclaration;
  payerInfo?: PayerInfoRecord;
  paymentRequestId?: string;
  paymentRequestReference?: string;
  isGift?: boolean;
  giftDetails?: GiftOrderDetails;
  deliveryAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    landmark?: string;
  };
}

/**
 * Multi-vendor checkout creating 1 ParentOrderRecord + N independent vendor child Orders,
 * each with immutable product/condition/fee snapshots, separate PaymentHolds, chats, stock decrements,
 * and idempotent deduplication.
 */
export function createMultiVendorOrdersFromCheckout(
  state: MarketplaceState,
  payload: MultiVendorCheckoutPayload
): {
  state: MarketplaceState;
  parentOrder: ParentOrderRecord;
  childOrders: Order[];
  duplicateSkipped?: boolean;
  error?: string;
} {
  if (payload.idempotencyKey && state.parentOrders) {
    const existingParent = state.parentOrders.find(
      (p) => p.idempotencyKey === payload.idempotencyKey
    );
    if (existingParent) {
      const existingChildren = state.orders.filter((o) =>
        existingParent.childOrderIds.includes(o.id)
      );
      return {
        state,
        parentOrder: existingParent,
        childOrders: existingChildren,
        duplicateSkipped: true,
      };
    }
  }

  const quote = calculateMultiVendorCheckoutQuote({
    cartItems: payload.cartItems,
    deliveryMethod: payload.deliveryMethod,
    listings: state.listings,
    vendors: state.vendors,
    feeConfig: state.feeConfig,
    deliveryConfig: state.deliveryConfig,
    referralDiscount: payload.referralDiscount || 0,
  });

  if (quote.vendorGroups.length === 0) {
    throw new Error('Cannot create order from an empty cart.');
  }

  const parentOrderNumber = generateOrderId();
  const transactionNumber = payload.paymentProviderRef || generateTransactionId();
  const parentOrderId = `pord-${Date.now()}`;
  const inspectionHours = Math.max(24, state.platformConfig.inspectionHours || 24);
  const isDemo = payload.isDemoTransaction !== false;
  const createdOrders: Order[] = [];
  const createdHolds: PaymentHold[] = [];
  const createdConvs: MessageConversation[] = [];
  const createdNotifications = [...state.notifications];
  let updatedListings = [...state.listings];
  let auditCursor = state.auditLog;

  let remainingReferralDiscount = quote.referralDiscount;

  quote.vendorGroups.forEach((group, idx) => {
    const orderId = `ord-${Date.now()}-${idx}`;
    const subOrderNumber =
      quote.vendorGroups.length === 1 ? parentOrderNumber : generateSubOrderId(idx + 1);
    const primaryItem = group.items[0];
    const listingSnapshot: DeviceListing = JSON.parse(JSON.stringify(primaryItem.listing));
    const variationSnapshot: ProductVariation | undefined = primaryItem.selectedVariation
      ? JSON.parse(JSON.stringify(primaryItem.selectedVariation))
      : undefined;

    const subDiscount =
      idx === quote.vendorGroups.length - 1
        ? remainingReferralDiscount
        : Math.min(remainingReferralDiscount, Math.round((group.vendorSubtotal / Math.max(1, quote.subtotal)) * quote.referralDiscount));
    remainingReferralDiscount = Math.max(0, remainingReferralDiscount - subDiscount);

    const subTotalAmount = Math.max(
      0,
      group.vendorSubtotal + group.customerFeeShare + group.vendorDeliveryFee - subDiscount
    );
    const accessoriesAll = group.items.flatMap((i) => i.selectedAccessories || []);
    const accessoriesPrice = group.items.reduce((s, i) => s + i.accessoriesTotal, 0);

    const vendorRecord = state.vendors.find((v) => v.id === group.vendorId);
    const warrantySnapshot = {
      ...createOrderWarrantySnapshot({
        orderId,
        orderNumber: subOrderNumber,
        listing: listingSnapshot,
        vendor: vendorRecord,
        warrantyConfig: state.warrantyConfig,
      }),
      buyerId: payload.buyerId,
    };

    const normalizedGiftDetails: GiftOrderDetails | undefined =
      payload.isGift && payload.giftDetails
        ? {
            ...payload.giftDetails,
            isGift: true,
            giftMessage: sanitizeGiftMessage(payload.giftDetails.giftMessage) || undefined,
            hidePriceFromPackage: true,
            specialPackagingGuaranteed: false,
            recipientPortalToken:
              payload.giftDetails.recipientPortalToken || generateRandomUrlToken(18),
            recipientAccessTokenHash:
              payload.giftDetails.recipientAccessTokenHash ||
              sha256Hex(payload.giftDetails.recipientPortalToken || 'gift-portal'),
          }
        : undefined;

    const effectiveDeliveryAddress = normalizedGiftDetails
      ? normalizedGiftDetails.recipientAddress
      : payload.deliveryAddress;
    const ownerId = payload.orderOwnerId || payload.buyerId;
    const refundTargetSummary = payload.payerInfo
      ? `Original payment ref ${payload.paymentProviderRef || transactionNumber} (Payer: ${payload.payerInfo.payerName})`
      : `Original payment ref ${payload.paymentProviderRef || transactionNumber} (Purchaser: ${payload.buyerName})`;

    const vendorOrder: Order = {
      id: orderId,
      orderNumber: subOrderNumber,
      parentOrderId,
      parentOrderNumber,
      subOrderNumber,
      transactionNumber,
      vendorId: group.vendorId,
      vendorName: group.vendorName,
      vendorNumber: vendorRecord?.vendorNumber || group.vendorNumber,
      isDemoTransaction: isDemo,
      listing: listingSnapshot,
      selectedVariation: variationSnapshot,
      variation: variationSnapshot,
      items: group.items.map((item) => ({
        listing: JSON.parse(JSON.stringify(item.listing)),
        selectedVariation: item.selectedVariation
          ? JSON.parse(JSON.stringify(item.selectedVariation))
          : undefined,
        quantity: item.quantity,
        selectedAccessories: item.selectedAccessories,
        includedFreeGift: item.listing.freeGift,
        unitPriceSnapshot: item.unitPrice,
        conditionSummarySnapshot:
          item.selectedVariation?.conditionSummary || item.listing.cosmeticDescription,
      })),
      buyerId: ownerId,
      orderOwnerId: ownerId,
      buyerName: payload.buyerName,
      buyerEmail: payload.buyerEmail,
      buyerPhone: payload.buyerPhone,
      payerInfo: payload.payerInfo,
      thirdPartyPayer: payload.thirdPartyPayer,
      paymentRequestId: payload.paymentRequestId,
      paymentRequestReference: payload.paymentRequestReference,
      isGift: Boolean(normalizedGiftDetails),
      giftDetails: normalizedGiftDetails,
      deliveryMethod: payload.deliveryMethod,
      pickupOtp: payload.deliveryMethod === 'physical_pickup' ? generatePickupOtp() : undefined,
      pickupLocation:
        payload.deliveryMethod === 'physical_pickup' ? group.pickupLocation : undefined,
      pickupInstructions:
        payload.deliveryMethod === 'physical_pickup' ? group.pickupInstructions : undefined,
      pickupHours: group.pickupHours,
      deliveryAddress: effectiveDeliveryAddress,
      dispatchDetails: {
        dispatchStatus: 'pending_dispatch',
        dispatcherOrCourierName: '',
        dispatchReference: '',
        expectedDeliveryWindow: group.estimatedDeliveryWindow,
      },
      warranty: warrantySnapshot,
      deliveryVerificationAttempts: [],
      itemPrice: unitPriceSumFromSubtotal(group.vendorSubtotal, accessoriesPrice),
      accessoriesPrice,
      feeBaseAmount: group.vendorSubtotal,
      customerFeeRate: quote.customerFeeRate,
      customer_platform_service_fee: group.customerFeeShare,
      vendorFeeRate: group.vendorFeeRate,
      vendor_platform_service_fee: group.vendor_platform_service_fee,
      buyerServiceCharge: group.customerFeeShare,
      deliveryFee: group.vendorDeliveryFee,
      fixedDeliveryFeeApplied: group.vendorDeliveryFee,
      totalAmount: subTotalAmount,
      paymentStatus: isDemo ? 'Paid (Demo Verified)' : 'Paid (Escrow Secured)',
      fulfillmentStatus: 'Order placed',
      trackingNumber:
        payload.deliveryMethod === 'physical_pickup'
          ? 'IN-STORE-PICKUP'
          : 'Awaiting Vendor Dispatch',
      courierName:
        payload.deliveryMethod === 'physical_pickup'
          ? 'Vendor Storefront Pickup Desk'
          : 'Vendor-Managed Dispatch',
      estimatedDelivery: group.estimatedDeliveryWindow,
      createdAt: isoNow(),
      events: [
        {
          title: normalizedGiftDetails
            ? `Gift order payment confirmed for ${subOrderNumber} (${group.vendorName}) — pricing omitted for recipient`
            : `Payment confirmed for ${subOrderNumber} (${group.vendorName})`,
          time: nowLabel(),
          done: true,
        },
      ],
      accessories: accessoriesAll,
      freeGift: primaryItem.listing.freeGift,
      referralDiscountApplied: subDiscount,
      inspectionWindowHours: inspectionHours,
      inspectionRemainingSeconds: inspectionHours * 3600,
      disputePaused: false,
      disputeStatus: 'None',
      refundTargetSummary,
      isReviewed: false,
    };

    createdOrders.push(vendorOrder);

    const hold: PaymentHold = {
      id: `hold-${Date.now()}-${idx}`,
      orderId,
      orderNumber: subOrderNumber,
      transactionNumber,
      vendorId: group.vendorId,
      vendorNumber: group.vendorNumber,
      vendorName: group.vendorName,
      buyerId: ownerId,
      buyerName: payload.buyerName,
      deviceTitle:
        group.items.length > 1
          ? `${primaryItem.listing.title} + ${group.items.length - 1} more`
          : primaryItem.listing.title,
      itemTitle: primaryItem.listing.title,
      deviceImage: variationSnapshot?.images?.[0] || listingSnapshot.images[0],
      variationInfo: variationSnapshot
        ? `${variationSnapshot.color} · ${variationSnapshot.grade}`
        : listingSnapshot.cosmeticGrade,
      grossAmount: subTotalAmount,
      amount: subTotalAmount,
      platformFeeBuyer: group.customerFeeShare,
      platformFeeVendor: group.vendor_platform_service_fee,
      customer_platform_service_fee: group.customerFeeShare,
      vendor_platform_service_fee: group.vendor_platform_service_fee,
      customerFeeRate: quote.customerFeeRate,
      vendorFeeRate: group.vendorFeeRate,
      deliveryFeeAllocated: group.vendorDeliveryFee,
      netVendorPayout: group.netVendorPayout,
      paymentReceivedAt: nowLabel(),
      createdAt: nowLabel(),
      inspectionHours,
      remainingSeconds: inspectionHours * 3600,
      status: 'Payment Received',
      isDisputed: false,
    };
    createdHolds.push(hold);

    const giftVendorNote = normalizedGiftDetails
      ? ` GIFT ORDER for ${normalizedGiftDetails.recipientName}. PACKING RULE: Exclude prices & payment receipt from package.${
          normalizedGiftDetails.senderVisibility === 'anonymous'
            ? ' SENDER IS ANONYMOUS — Do NOT disclose sender identity.'
            : ` Sender: ${normalizedGiftDetails.senderDisplayName || payload.buyerName}.`
        }`
      : '';

    const conv: MessageConversation = {
      id: `conv-${Date.now()}-${idx}`,
      vendorId: group.vendorId,
      vendorName: group.vendorName,
      vendorAvatar: listingSnapshot.images[0],
      buyerId: ownerId,
      buyerName: payload.buyerName,
      listingId: listingSnapshot.id,
      listingTitle:
        group.items.length > 1
          ? `${listingSnapshot.title} (+${group.items.length - 1})`
          : listingSnapshot.title,
      listingPrice: group.vendorSubtotal,
      listingImage: variationSnapshot?.images?.[0] || listingSnapshot.images[0],
      orderId,
      orderNumber: subOrderNumber,
      stage: 'post_purchase',
      lastMessage: `Order ${subOrderNumber} paid (${transactionNumber}).${normalizedGiftDetails ? ' Gift Order.' : ''} Vendor notified to arrange fulfilment.`,
      lastMessageTime: 'Just now',
      unreadCount: 0,
      unreadCountVendor: 1,
      unreadCountBuyer: 0,
      messages: [
        {
          id: `msg-${Date.now()}-${idx}`,
          sender: 'system',
          orderNumber: subOrderNumber,
          text: `Sub-order ${subOrderNumber} under Parent Order ${parentOrderNumber} confirmed. ${group.vendorName} will arrange ${
            payload.deliveryMethod === 'physical_pickup' ? 'store pickup' : 'vendor-managed dispatch'
          } and share tracking details.${giftVendorNote}`,
          timestamp: nowLabel(),
          dateLabel: 'Today',
        },
      ],
    };
    createdConvs.push(conv);

    // Notify vendor per sub-order ONLY after verified payment
    createdNotifications.unshift({
      id: `notif-vnd-ord-${Date.now()}-${idx}`,
      title: normalizedGiftDetails
        ? `New Paid Gift Order ${subOrderNumber}`
        : `New Paid Order ${subOrderNumber}`,
      message: normalizedGiftDetails
        ? `Gift order for ${normalizedGiftDetails.recipientName} (${group.items.length} item(s), ${effectiveDeliveryAddress.city}, ${effectiveDeliveryAddress.state}). Exclude prices/receipts from box.${
            normalizedGiftDetails.senderVisibility === 'anonymous'
              ? ' Keep sender anonymous.'
              : ''
          }`
        : `${payload.buyerName} paid ₦${subTotalAmount.toLocaleString('en-NG')} for ${group.items.length} item(s). Arrange dispatch to send delivery confirmation code.`,
      time: 'Just now',
      read: false,
      type: 'order',
      recipientRole: 'vendor',
      orderId,
      conversationId: conv.id,
    });

    // Decrement stock for each item purchased from this vendor
    group.items.forEach((line) => {
      updatedListings = updatedListings.map((item) => {
        if (item.id !== line.listing.id) return item;
        if (line.selectedVariation && item.variations) {
          const nextVars = item.variations.map((v) =>
            v.id === line.selectedVariation?.id
              ? {
                  ...v,
                  stockQuantity: Math.max(0, v.stockQuantity - line.quantity),
                  isAvailable: Math.max(0, v.stockQuantity - line.quantity) > 0,
                }
              : v
          );
          return {
            ...item,
            variations: nextVars,
            totalStock: nextVars.reduce((s, v) => s + v.stockQuantity, 0),
          };
        }
        const nextStock = Math.max(0, (item.stockQuantity ?? 1) - line.quantity);
        return {
          ...item,
          stockQuantity: nextStock,
          totalStock: Math.max(0, (item.totalStock ?? nextStock + line.quantity) - line.quantity),
        };
      });
    });

    auditCursor = [
      {
        id: `aud-${Date.now()}-${idx}`,
        timestamp: isoNow(),
        actorRole: 'buyer',
        actorName: payload.buyerName,
        actionType: 'order_created',
        entityRef: subOrderNumber,
        details: `Created sub-order ${subOrderNumber} (Parent ${parentOrderNumber})${normalizedGiftDetails ? ' [GIFT ORDER]' : ''} for ₦${subTotalAmount.toLocaleString('en-NG')}.`,
      },
      ...auditCursor,
    ];
  });

  // Notify cart/order owner once with consolidated parent summary
  const firstGift = createdOrders[0]?.giftDetails;
  createdNotifications.unshift({
    id: `notif-buy-ord-${Date.now()}`,
    title: firstGift
      ? `Gift Order ${parentOrderNumber} Confirmed`
      : `Order ${parentOrderNumber} Confirmed`,
    message: firstGift
      ? `Gift order for ${firstGift.recipientName} confirmed (₦${quote.totalAmount.toLocaleString('en-NG')}) across ${quote.vendorCount} vendor(s). ${
          payload.payerInfo && payload.payerInfo.payerId !== payload.buyerId
            ? `Paid by ${payload.payerInfo.payerName}. `
            : ''
        }Recipient pricing is hidden.`
      : `${
          payload.payerInfo && payload.payerInfo.payerId !== payload.buyerId
            ? `Paid by ${payload.payerInfo.payerName} (₦${quote.totalAmount.toLocaleString('en-NG')}) across `
            : `Paid ₦${quote.totalAmount.toLocaleString('en-NG')} across `
        }${quote.vendorCount} vendor(s). Watch notifications for dispatch & Delivery Verification Code.`,
    time: 'Just now',
    read: false,
    type: 'order',
    recipientRole: 'buyer',
    orderId: createdOrders[0]?.id,
  });

  if (payload.payerInfo && payload.payerInfo.payerId !== payload.buyerId) {
    createdNotifications.unshift({
      id: `notif-pay-rcpt-${Date.now() + 2}`,
      title: `Electronic Payment Receipt · ${transactionNumber}`,
      message: `Paid ₦${quote.totalAmount.toLocaleString('en-NG')} for ${payload.buyerName.split(' ')[0]}'s UsedRight order (${parentOrderNumber}).`,
      time: 'Just now',
      read: false,
      type: 'order',
      recipientRole: 'payer',
      paymentRequestId: payload.paymentRequestId,
      orderId: createdOrders[0]?.id,
    });
  }

  const parentOrder: ParentOrderRecord = {
    id: parentOrderId,
    parentOrderNumber,
    transactionNumber,
    paymentProviderRef: payload.paymentProviderRef,
    paymentStatus: isDemo ? 'Paid (Demo Verified)' : 'Paid (Paystack Verified)',
    isDemoTransaction: isDemo,
    buyerId: payload.orderOwnerId || payload.buyerId,
    orderOwnerId: payload.orderOwnerId || payload.buyerId,
    buyerName: payload.buyerName,
    buyerEmail: payload.buyerEmail,
    buyerPhone: payload.buyerPhone,
    payerInfo: payload.payerInfo,
    thirdPartyPayer: payload.thirdPartyPayer,
    paymentRequestId: payload.paymentRequestId,
    paymentRequestReference: payload.paymentRequestReference,
    isGift: Boolean(payload.isGift && payload.giftDetails),
    giftDetails: createdOrders[0]?.giftDetails,
    deliveryMethod: payload.deliveryMethod,
    deliveryAddress: createdOrders[0]?.deliveryAddress || payload.deliveryAddress,
    childOrderIds: createdOrders.map((o) => o.id),
    vendorCount: quote.vendorCount,
    totalItemsCount: quote.totalItemsCount,
    subtotalAmount: quote.subtotal,
    customerFeeRate: quote.customerFeeRate,
    customer_platform_service_fee: quote.customer_platform_service_fee,
    deliveryFeeTotal: quote.deliveryFeeTotal,
    referralDiscountApplied: quote.referralDiscount,
    totalPaid: quote.totalAmount,
    createdAt: isoNow(),
    idempotencyKey: payload.idempotencyKey,
  };

  return {
    state: {
      ...state,
      listings: updatedListings,
      orders: [...createdOrders, ...state.orders],
      paymentHolds: [...createdHolds, ...state.paymentHolds],
      conversations: [...createdConvs, ...state.conversations],
      parentOrders: [parentOrder, ...(state.parentOrders || [])],
      notifications: createdNotifications,
      auditLog: auditCursor,
    },
    parentOrder,
    childOrders: createdOrders,
  };
}

function unitPriceSumFromSubtotal(subtotal: number, accessoriesTotal: number): number {
  return Math.max(0, subtotal - accessoriesTotal);
}

/**
 * Vendor arranges vendor-managed delivery or marks ready for pickup.
 * Generates the confidential one-time Delivery Verification Code distinct from all order/tracking refs,
 * routes Gift PIN to recipient (respecting sender anonymity & hiding prices), notifies the buyer/purchaser,
 * and NEVER lets the vendor mark the order Delivered directly.
 */
export function vendorArrangeDispatch(
  state: MarketplaceState,
  payload: {
    orderId: string;
    dispatcherOrCourierName: string;
    dispatcherPhone?: string;
    dispatchReference: string;
    dispatchDate?: string;
    expectedDeliveryWindow: string;
    deliveryNotes?: string;
  }
): { state: MarketplaceState; verificationCode?: string; error?: string } {
  const order = state.orders.find((o) => o.id === payload.orderId);
  if (!order) return { state, error: 'Order not found.' };

  if (!payload.dispatcherOrCourierName.trim()) {
    return { state, error: 'Dispatcher or logistics provider name is required.' };
  }

  const isPickup = order.deliveryMethod === 'physical_pickup';
  const code = order.deliveryVerificationCode || generateDeliveryVerificationCode();
  const expiresAt = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();
  const nextStatus: Order['fulfillmentStatus'] = isPickup ? 'Ready for Pickup' : 'In transit';

  const dispatchDetails: VendorDispatchDetails = {
    dispatchStatus: isPickup ? 'ready_for_pickup' : 'dispatched',
    dispatcherOrCourierName: payload.dispatcherOrCourierName.trim(),
    dispatcherPhone: payload.dispatcherPhone?.trim(),
    dispatchReference:
      payload.dispatchReference.trim() ||
      (isPickup ? 'IN-STORE-PICKUP' : `DSP-${Math.floor(100000 + Math.random() * 899999)}`),
    dispatchDate: payload.dispatchDate || new Date().toISOString().slice(0, 10),
    expectedDeliveryWindow: payload.expectedDeliveryWindow.trim() || '1–3 business days',
    deliveryNotes: payload.deliveryNotes?.trim(),
    arrangedByVendorName: order.vendorName || order.listing.sellerName,
    arrangedAt: isoNow(),
  };

  const eventLabel = isPickup
    ? `Ready for store pickup at ${order.pickupLocation || 'vendor storefront'}. Confidential Delivery Verification Code generated${order.isGift ? ' for gift recipient' : ' for customer'}.`
    : `Dispatched by vendor via ${dispatchDetails.dispatcherOrCourierName} (Ref: ${dispatchDetails.dispatchReference}). Delivery Verification Code sent${order.isGift ? ' to gift recipient' : ' to customer'}.`;

  const dispatchNotifs: AppNotification[] = [];
  if (order.isGift) {
    const isAnon = order.giftDetails?.senderVisibility === 'anonymous';
    const recipientName = order.giftDetails?.recipientName || order.deliveryAddress.fullName;
    const senderPhrase = isAnon
      ? 'from an anonymous sender'
      : `from ${order.giftDetails?.senderDisplayName || order.buyerName}`;

    // Recipient-safe notification (no prices, no fees, anonymous sender respected)
    dispatchNotifs.push({
      id: `notif-gift-pin-${Date.now()}`,
      title: `Gift on the way! Delivery PIN: ${code} (${order.orderNumber})`,
      message: `${recipientName}, a UsedRight gift (${order.listing.title}) ${senderPhrase} is on the way via ${dispatchDetails.dispatcherOrCourierName}. Share PIN ${code} ONLY after you physically receive and check the parcel.${
        order.giftDetails?.giftMessage ? ` Gift Note: "${order.giftDetails.giftMessage}"` : ''
      }`,
      time: 'Just now',
      read: false,
      type: 'order',
      recipientRole: 'recipient',
      isRecipientSafe: true,
      orderId: order.id,
    });

    // Purchaser update notification
    dispatchNotifs.push({
      id: `notif-gift-buy-dsp-${Date.now() + 1}`,
      title: `Gift Order Dispatched: ${order.orderNumber}`,
      message: `${order.vendorName || order.listing.sellerName} dispatched your gift to ${recipientName} via ${dispatchDetails.dispatcherOrCourierName} (${dispatchDetails.dispatchReference}). Delivery PIN routed to recipient.`,
      time: 'Just now',
      read: false,
      type: 'order',
      recipientRole: 'buyer',
      orderId: order.id,
    });
  } else {
    dispatchNotifs.push({
      id: `notif-otp-${Date.now()}`,
      title: isPickup
        ? `Ready for Pickup: ${order.orderNumber}`
        : `Order Dispatched: ${order.orderNumber}`,
      message: `Your Delivery Verification Code is ready (${code}). Only share this code when you have received your package. Never give it out before delivery.`,
      time: 'Just now',
      read: false,
      type: 'order',
      recipientRole: 'buyer',
      orderId: order.id,
    });
  }

  return {
    verificationCode: code,
    state: {
      ...state,
      orders: state.orders.map((o) =>
        o.id === order.id
          ? {
              ...o,
              fulfillmentStatus: nextStatus,
              courierName: dispatchDetails.dispatcherOrCourierName,
              trackingNumber: dispatchDetails.dispatchReference,
              estimatedDelivery: dispatchDetails.expectedDeliveryWindow,
              dispatchDetails,
              deliveryVerificationCode: code,
              deliveryCodeGeneratedAt: o.deliveryCodeGeneratedAt || isoNow(),
              deliveryCodeExpiresAt: expiresAt,
              deliveryCodeAttempts: o.deliveryCodeAttempts || 0,
              events: [...o.events, { title: eventLabel, time: nowLabel(), done: true }],
            }
          : o
      ),
      paymentHolds: state.paymentHolds.map((h) =>
        h.orderId === order.id ? { ...h, status: 'Dispatched' } : h
      ),
      conversations: state.conversations.map((c) =>
        c.orderId === order.id
          ? {
              ...c,
              lastMessage: eventLabel,
              lastMessageTime: 'Just now',
              unreadCountBuyer: (c.unreadCountBuyer || 0) + 1,
              messages: [
                ...c.messages,
                {
                  id: `msg-dsp-${Date.now()}`,
                  sender: 'system',
                  orderNumber: order.orderNumber,
                  text: eventLabel,
                  timestamp: nowLabel(),
                },
              ],
            }
          : c
      ),
      notifications: [...dispatchNotifs, ...state.notifications],
      auditLog: appendAudit(state, {
        actorRole: 'seller_approved',
        actorName: order.vendorName || order.listing.sellerName,
        actionType: 'dispatch_confirmed',
        entityRef: order.orderNumber,
        details: eventLabel,
      }),
    },
  };
}

/**
 * Verifies the customer's one-time Delivery Verification Code entered by vendor/dispatcher,
 * enforcing single-use, expiration, vendor ownership, and 5-attempt brute-force lockout.
 */
export function verifyDeliveryCodeAndStartInspection(
  state: MarketplaceState,
  payload: {
    orderId: string;
    enteredCode: string;
    actorVendorId?: string;
    actorName?: string;
  }
): {
  state: MarketplaceState;
  verified: boolean;
  error?: string;
  remainingAttempts?: number;
} {
  const order = state.orders.find((o) => o.id === payload.orderId);
  if (!order) {
    return { state, verified: false, error: 'Order not found.' };
  }

  const orderVendorId = order.vendorId || order.listing.sellerId;
  if (payload.actorVendorId && payload.actorVendorId !== orderVendorId) {
    return {
      state,
      verified: false,
      error: 'Unauthorized: You can only verify delivery for your own sub-orders.',
    };
  }

  if (order.deliveryCodeUsedAt || order.fulfillmentStatus === 'Delivered_In_Inspection' || order.fulfillmentStatus === 'Completed') {
    return {
      state,
      verified: false,
      error: 'Delivery Verification Code has already been redeemed for this shipment.',
    };
  }

  if (!order.deliveryVerificationCode) {
    return {
      state,
      verified: false,
      error: 'Dispatch must be arranged before verifying a Delivery Verification Code.',
    };
  }

  if (order.deliveryCodeLockedUntil && new Date(order.deliveryCodeLockedUntil).getTime() > Date.now()) {
    return {
      state,
      verified: false,
      error: 'Too many invalid attempts. Code entry is temporarily locked; customer may request a refreshed PIN or Admin may intervene.',
    };
  }

  if (order.deliveryCodeExpiresAt && new Date(order.deliveryCodeExpiresAt).getTime() < Date.now()) {
    const expLog: DeliveryVerificationAttemptLog = {
      id: `dlog-${Date.now()}`,
      timestamp: isoNow(),
      actorName: payload.actorName || order.vendorName || 'Dispatcher',
      actorVendorId: payload.actorVendorId,
      result: 'expired',
      note: 'Attempted verification with an expired Delivery Verification PIN.',
    };
    return {
      state: {
        ...state,
        orders: state.orders.map((o) =>
          o.id === order.id
            ? {
                ...o,
                deliveryVerificationAttempts: [...(o.deliveryVerificationAttempts || []), expLog],
              }
            : o
        ),
      },
      verified: false,
      error: 'This Delivery Verification Code has expired. Customer can generate a fresh PIN from Order Details.',
    };
  }

  const normalizedInput = payload.enteredCode.trim().toUpperCase();
  const normalizedExpected = order.deliveryVerificationCode.trim().toUpperCase();

  if (normalizedInput !== normalizedExpected) {
    const nextAttempts = (order.deliveryCodeAttempts || 0) + 1;
    const locked = nextAttempts >= 5;
    const lockUntil = locked ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : undefined;
    const remaining = Math.max(0, 5 - nextAttempts);
    const attemptLog: DeliveryVerificationAttemptLog = {
      id: `dlog-${Date.now()}`,
      timestamp: isoNow(),
      actorName: payload.actorName || order.vendorName || 'Dispatcher',
      actorVendorId: payload.actorVendorId,
      result: locked ? 'locked' : 'failed_attempt',
      note: locked
        ? 'Locked after 5 incorrect Delivery PIN attempts.'
        : `Incorrect PIN entered (${remaining} attempts remaining).`,
    };

    return {
      verified: false,
      remainingAttempts: remaining,
      error: locked
        ? 'Maximum 5 failed code attempts reached. Verification locked — Customer may refresh PIN or Admin review required.'
        : `Incorrect Delivery Verification Code. ${remaining} attempt(s) remaining before lockout.`,
      state: {
        ...state,
        orders: state.orders.map((o) =>
          o.id === order.id
            ? {
                ...o,
                deliveryCodeAttempts: nextAttempts,
                deliveryCodeLockedUntil: lockUntil,
                deliveryVerificationAttempts: [...(o.deliveryVerificationAttempts || []), attemptLog],
              }
            : o
        ),
      },
    };
  }

  // Valid code matched — mark receipt confirmed & start 24h inspection + 3-month warranty
  const confirmedState = confirmPhysicalDeliveryOrReceipt(state, order.id, 'courier');
  const confirmedAt = isoNow();
  const inspectionHours = Math.max(24, order.inspectionWindowHours || state.platformConfig.inspectionHours);
  const successLog: DeliveryVerificationAttemptLog = {
    id: `dlog-${Date.now()}`,
    timestamp: confirmedAt,
    actorName: payload.actorName || order.vendorName || order.listing.sellerName,
    actorVendorId: payload.actorVendorId,
    result: 'success',
    note: 'Single-use Delivery Verification Code validated cleanly.',
  };

  return {
    verified: true,
    state: {
      ...confirmedState,
      orders: confirmedState.orders.map((o) =>
        o.id === order.id
          ? {
              ...o,
              deliveryCodeUsedAt: confirmedAt,
              deliveryCodeAttempts: 0,
              deliveryCodeLockedUntil: undefined,
              deliveryVerificationAttempts: [...(o.deliveryVerificationAttempts || []), successLog],
              dispatchDetails: o.dispatchDetails
                ? {
                    ...o.dispatchDetails,
                    dispatchStatus: 'delivered',
                    actualDeliveryConfirmedAt: confirmedAt,
                  }
                : undefined,
            }
          : o
      ),
      auditLog: appendAudit(confirmedState, {
        actorRole: 'seller_approved',
        actorName: payload.actorName || order.vendorName || order.listing.sellerName,
        actionType: 'delivery_otp_verified',
        entityRef: order.orderNumber,
        details: `Verified one-time Delivery Verification Code and started ${inspectionHours}h inspection period + 3-month warranty.`,
      }),
    },
  };
}

export function adminOverrideDeliveryConfirmation(
  state: MarketplaceState,
  payload: { orderId: string; adminName: string; reason: string }
): { state: MarketplaceState; error?: string } {
  if (!payload.reason || payload.reason.trim().length < 5) {
    return { state, error: 'Provide a clear audit reason (minimum 5 characters) for admin delivery override.' };
  }
  const confirmedState = confirmPhysicalDeliveryOrReceipt(state, payload.orderId, 'system');
  const now = isoNow();

  return {
    state: {
      ...confirmedState,
      orders: confirmedState.orders.map((o) =>
        o.id === payload.orderId
          ? {
              ...o,
              deliveryCodeUsedAt: now,
              deliveryCodeLockedUntil: undefined,
              deliveryCodeOverrideReason: payload.reason.trim(),
              deliveryCodeOverriddenBy: payload.adminName,
              dispatchDetails: o.dispatchDetails
                ? {
                    ...o.dispatchDetails,
                    dispatchStatus: 'delivered',
                    actualDeliveryConfirmedAt: now,
                  }
                : undefined,
              events: [
                ...o.events,
                {
                  title: `Admin override delivery confirmation by ${payload.adminName}: ${payload.reason.trim()}`,
                  time: nowLabel(),
                  done: true,
                },
              ],
            }
          : o
      ),
      auditLog: appendAudit(confirmedState, {
        actorRole: 'admin',
        actorName: payload.adminName,
        actionType: 'delivery_otp_override',
        entityRef: payload.orderId,
        details: `Admin delivery override: ${payload.reason.trim()}`,
      }),
    },
  };
}

export function reportDeliveryProblemOrReschedule(
  state: MarketplaceState,
  payload: {
    orderId: string;
    type: DeliveryProblemType;
    details: string;
    requestedNewDate?: string;
    buyerName: string;
  }
): MarketplaceState {
  const order = state.orders.find((o) => o.id === payload.orderId);
  if (!order) return state;

  const problemId = `prob-${Date.now()}`;
  const summaryText = `Delivery report (${payload.type.replace('_', ' ')}): ${payload.details}${
    payload.requestedNewDate ? ` · Requested reschedule: ${payload.requestedNewDate}` : ''
  }`;

  return {
    ...state,
    orders: state.orders.map((o) =>
      o.id === order.id
        ? {
            ...o,
            deliveryProblemReport: {
              id: problemId,
              type: payload.type,
              details: payload.details,
              reportedAt: isoNow(),
              requestedNewDate: payload.requestedNewDate,
              status: 'Open',
            },
            dispatchDetails: o.dispatchDetails
              ? { ...o.dispatchDetails, dispatchStatus: 'issue_reported' }
              : undefined,
            events: [...o.events, { title: summaryText, time: nowLabel(), done: true }],
          }
        : o
    ),
    notifications: [
      {
        id: `notif-prob-adm-${Date.now()}`,
        title: `Delivery Issue Reported (${order.orderNumber})`,
        message: `${payload.buyerName} reported ${payload.type.replace('_', ' ')} on ${order.orderNumber}.`,
        time: 'Just now',
        read: false,
        type: 'dispute',
        recipientRole: 'admin',
        orderId: order.id,
      },
      {
        id: `notif-prob-vnd-${Date.now() + 1}`,
        title: `Delivery Update Requested (${order.orderNumber})`,
        message: summaryText,
        time: 'Just now',
        read: false,
        type: 'order',
        recipientRole: 'vendor',
        orderId: order.id,
      },
      ...state.notifications,
    ],
    auditLog: appendAudit(state, {
      actorRole: 'buyer',
      actorName: payload.buyerName,
      actionType: 'delivery_problem_reported',
      entityRef: order.orderNumber,
      details: summaryText,
    }),
  };
}

export function adminUpdatePlatformFees(
  state: MarketplaceState,
  payload: {
    customerFeeRate: number;
    vendorFeeRate: number;
    vendorSpecificRates?: Record<string, number>;
    promotionalLabel?: string;
    effectiveDate?: string;
    expiryDate?: string;
    eligibilityRules?: string;
    reason: string;
    adminName: string;
  }
): { state: MarketplaceState; errors: string[] } {
  const validation = validatePlatformFeeConfig({
    customerFeeRate: payload.customerFeeRate,
    vendorFeeRate: payload.vendorFeeRate,
    vendorSpecificRates: payload.vendorSpecificRates,
  });

  if (!validation.valid) {
    return { state, errors: validation.errors };
  }

  const prev = state.feeConfig;
  const effectiveDate = payload.effectiveDate || new Date().toISOString().slice(0, 10);
  const nextFeeConfig: PlatformFeeConfig = {
    customerFeeRate: payload.customerFeeRate,
    vendorFeeRate: payload.vendorFeeRate,
    maxCustomerFeeRate: MAX_CUSTOMER_FEE_RATE,
    maxVendorFeeRate: MAX_VENDOR_FEE_RATE,
    promotionalLabel: payload.promotionalLabel,
    effectiveDate,
    expiryDate: payload.expiryDate,
    eligibilityRules:
      payload.eligibilityRules ||
      prev?.eligibilityRules ||
      'Applies to eligible product subtotal only. Delivery charges excluded.',
    vendorSpecificRates: payload.vendorSpecificRates ?? prev?.vendorSpecificRates ?? {},
    updatedAt: isoNow(),
    updatedBy: payload.adminName,
  };

  const newAuditEntries = [];
  if (!prev || prev.customerFeeRate !== payload.customerFeeRate) {
    newAuditEntries.push({
      id: `faud-c-${Date.now()}`,
      timestamp: isoNow(),
      adminName: payload.adminName,
      targetType: 'customer_default' as const,
      previousRate: prev?.customerFeeRate ?? BUYER_FEE_RATE,
      newRate: payload.customerFeeRate,
      effectiveDate,
      reason: payload.reason || 'Admin updated default Customer Platform Service Fee',
    });
  }
  if (!prev || prev.vendorFeeRate !== payload.vendorFeeRate) {
    newAuditEntries.push({
      id: `faud-v-${Date.now() + 1}`,
      timestamp: isoNow(),
      adminName: payload.adminName,
      targetType: 'vendor_default' as const,
      previousRate: prev?.vendorFeeRate ?? SELLER_FEE_RATE,
      newRate: payload.vendorFeeRate,
      effectiveDate,
      reason: payload.reason || 'Admin updated default Vendor Platform Service Fee',
    });
  }

  return {
    errors: [],
    state: {
      ...state,
      feeConfig: nextFeeConfig,
      feeAuditLog: [...newAuditEntries, ...(state.feeAuditLog || [])],
      auditLog: appendAudit(state, {
        actorRole: 'admin',
        actorName: payload.adminName,
        actionType: 'fee_config_changed',
        entityRef: 'PlatformFeeConfig',
        details: `Customer fee ${(payload.customerFeeRate * 100).toFixed(2)}%, Vendor fee ${(payload.vendorFeeRate * 100).toFixed(2)}%. Reason: ${payload.reason}`,
      }),
    },
  };
}

export function adminUpdateDeliveryConfig(
  state: MarketplaceState,
  payload: Partial<DeliveryConfig> & { adminName: string }
): { state: MarketplaceState; error?: string } {
  if (payload.fixedDeliveryFee !== undefined && payload.fixedDeliveryFee < 0) {
    return { state, error: 'Fixed delivery fee cannot be negative.' };
  }
  const prev = state.deliveryConfig;
  const next: DeliveryConfig = {
    fixedDeliveryFee: payload.fixedDeliveryFee ?? prev?.fixedDeliveryFee ?? DEFAULT_FIXED_DELIVERY_FEE,
    freePickupEnabled: payload.freePickupEnabled ?? prev?.freePickupEnabled ?? true,
    supportedDeliveryStates:
      payload.supportedDeliveryStates ??
      prev?.supportedDeliveryStates ?? [
        'Lagos State',
        'Abuja (FCT)',
        'Rivers State',
        'Oyo State',
        'Ogun State',
        'Enugu State',
        'Kano State',
        'Edo State',
        'Delta State',
        'Kaduna State',
      ],
    estimatedDeliveryWindow:
      payload.estimatedDeliveryWindow ??
      prev?.estimatedDeliveryWindow ??
      '1–3 business days after vendor dispatch',
    deliveryNotes:
      payload.deliveryNotes ??
      prev?.deliveryNotes ??
      'Vendors arrange dispatch with personal riders or logistics partners. One fixed fee applies per distinct vendor.',
    updatedAt: isoNow(),
    updatedBy: payload.adminName,
  };

  return {
    state: {
      ...state,
      deliveryConfig: next,
      auditLog: appendAudit(state, {
        actorRole: 'admin',
        actorName: payload.adminName,
        actionType: 'admin_config_changed',
        entityRef: 'DeliveryConfig',
        details: `Updated fixed delivery fee to ₦${next.fixedDeliveryFee.toLocaleString('en-NG')} per vendor.`,
      }),
    },
  };
}

export function adminSavePolicyVersion(
  state: MarketplaceState,
  payload: {
    policyId?: string;
    title: string;
    slug?: string;
    category?: PolicyDocument['category'];
    summary: string;
    version: string;
    status: PolicyDocument['status'];
    effectiveDate: string;
    changeSummary: string;
    requiresVendorReacceptance?: boolean;
    sections: PolicyDocument['sections'];
    adminName: string;
  }
): MarketplaceState {
  const existingPolicies = state.policies || [];
  const nowDate = new Date().toISOString().slice(0, 10);
  const existing = existingPolicies.find((p) => p.id === payload.policyId);

  if (existing) {
    const newVersionEntry = {
      version: payload.version,
      status: payload.status,
      effectiveDate: payload.effectiveDate,
      publishedAt: nowDate,
      updatedBy: payload.adminName,
      changeSummary: payload.changeSummary,
      requiresVendorReacceptance: payload.requiresVendorReacceptance,
      sections: payload.sections,
    };

    const updated = existingPolicies.map((p) => {
      if (p.id !== existing.id) return p;
      return {
        ...p,
        title: payload.title,
        summary: payload.summary,
        currentVersion: payload.status === 'Published' ? payload.version : p.currentVersion,
        effectiveDate: payload.status === 'Published' ? payload.effectiveDate : p.effectiveDate,
        lastUpdated: nowDate,
        status: payload.status,
        requiresVendorReacceptance: Boolean(payload.requiresVendorReacceptance),
        sections: payload.status === 'Published' ? payload.sections : p.sections,
        versions: [newVersionEntry, ...p.versions],
      };
    });

    return {
      ...state,
      policies: updated,
      auditLog: appendAudit(state, {
        actorRole: 'admin',
        actorName: payload.adminName,
        actionType: 'policy_published',
        entityRef: `${existing.slug} v${payload.version}`,
        details: `${payload.status} policy "${payload.title}" (${payload.version}): ${payload.changeSummary}`,
      }),
    };
  }

  const nextNum = existingPolicies.length + 1;
  const slug =
    payload.slug ||
    payload.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  const created: PolicyDocument = {
    id: `pol-${Date.now()}`,
    slug,
    number: nextNum,
    title: payload.title,
    category: payload.category || 'Core Terms',
    summary: payload.summary,
    currentVersion: payload.version,
    effectiveDate: payload.effectiveDate,
    lastUpdated: nowDate,
    status: payload.status,
    requiresVendorReacceptance: Boolean(payload.requiresVendorReacceptance),
    relatedSlugs: ['about-usedright'],
    sections: payload.sections,
    versions: [
      {
        version: payload.version,
        status: payload.status,
        effectiveDate: payload.effectiveDate,
        publishedAt: nowDate,
        updatedBy: payload.adminName,
        changeSummary: payload.changeSummary,
        requiresVendorReacceptance: payload.requiresVendorReacceptance,
        sections: payload.sections,
      },
    ],
  };

  return {
    ...state,
    policies: [...existingPolicies, created],
    auditLog: appendAudit(state, {
      actorRole: 'admin',
      actorName: payload.adminName,
      actionType: 'policy_published',
      entityRef: `${created.slug} v${payload.version}`,
      details: `Created & ${payload.status} new policy "${payload.title}"`,
    }),
  };
}

export function recordVendorAgreementAcceptance(
  state: MarketplaceState,
  payload: {
    vendorId: string;
    vendorName: string;
    agreementVersion: string;
    policyVersion: string;
    declarationsAccepted: boolean[];
    finalConsentAccepted: boolean;
    verifiedIdentityRef?: string;
  }
): MarketplaceState {
  const acceptanceRecord = {
    id: `vac-${Date.now()}`,
    vendorId: payload.vendorId,
    vendorName: payload.vendorName,
    verifiedIdentityRef: payload.verifiedIdentityRef,
    agreementVersion: payload.agreementVersion,
    policyVersion: payload.policyVersion,
    acceptedAt: isoNow(),
    status: 'Accepted' as const,
    declarationsAccepted: payload.declarationsAccepted,
    finalConsentAccepted: payload.finalConsentAccepted,
    userAgentSummary: 'UsedRight Web Client',
  };

  return {
    ...state,
    vendors: state.vendors.map((v) =>
      v.id === payload.vendorId
        ? {
            ...v,
            agreementAcceptedVersion: payload.agreementVersion,
            agreementAcceptedAt: acceptanceRecord.acceptedAt,
          }
        : v
    ),
    vendorAcceptances: [
      acceptanceRecord,
      ...(state.vendorAcceptances || []).map((rec) =>
        rec.vendorId === payload.vendorId ? { ...rec, status: 'Superseded' as const } : rec
      ),
    ],
    auditLog: appendAudit(state, {
      actorRole: 'seller_approved',
      actorName: payload.vendorName,
      actionType: 'vendor_agreement_accepted',
      entityRef: payload.vendorId,
      details: `Accepted Vendor Agreement v${payload.agreementVersion} (15+1 declarations recorded).`,
    }),
  };
}

/**
 * Generates and stores a fresh single-use 6-digit Delivery Verification PIN (when expired, locked, or lost),
 * keeping it strictly visible to the customer only.
 */
export function resendDeliveryVerificationCode(
  state: MarketplaceState,
  payload: { orderId: string; buyerId: string; customCode?: string }
): { state: MarketplaceState; code?: string; error?: string } {
  const order = state.orders.find((o) => o.id === payload.orderId);
  if (!order) return { state, error: 'Order not found.' };
  if (order.buyerId !== payload.buyerId) {
    return { state, error: 'Unauthorized: Only the customer for this order can refresh the Delivery PIN.' };
  }
  if (order.deliveryCodeUsedAt || order.fulfillmentStatus === 'Delivered_In_Inspection' || order.fulfillmentStatus === 'Completed') {
    return { state, error: 'Delivery PIN has already been redeemed after physical handover.' };
  }

  const nextCode = payload.customCode || generateDeliveryVerificationCode();
  const nextExpiry = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const resendLog: DeliveryVerificationAttemptLog = {
    id: `dlog-res-${Date.now()}`,
    timestamp: isoNow(),
    actorName: order.buyerName,
    result: 'resent',
    note: 'Customer requested a refreshed confidential Delivery PIN.',
  };

  return {
    code: nextCode,
    state: {
      ...state,
      orders: state.orders.map((o) =>
        o.id === order.id
          ? {
              ...o,
              deliveryVerificationCode: nextCode,
              deliveryCodeGeneratedAt: isoNow(),
              deliveryCodeExpiresAt: nextExpiry,
              deliveryCodeAttempts: 0,
              deliveryCodeLockedUntil: undefined,
              deliveryVerificationAttempts: [...(o.deliveryVerificationAttempts || []), resendLog],
            }
          : o
      ),
      notifications: [
        {
          id: `notif-pin-ref-${Date.now()}`,
          title: `Refreshed Delivery PIN Ready (${order.orderNumber})`,
          message: `New confidential Delivery Verification PIN: ${nextCode}. Share only upon physical inspection of your package.`,
          time: 'Just now',
          read: false,
          type: 'order',
          recipientRole: 'buyer',
          orderId: order.id,
        },
        ...state.notifications,
      ],
      auditLog: appendAudit(state, {
        actorRole: 'buyer',
        actorName: order.buyerName,
        actionType: 'delivery_otp_resend',
        entityRef: order.orderNumber,
        details: `Regenerated confidential Delivery Verification PIN and reset attempt counter.`,
      }),
    },
  };
}

/**
 * Allows customer to authorize an alternative recipient (e.g. spouse, security desk, family) to hand over the Delivery PIN.
 */
export function setOrderAlternativeRecipient(
  state: MarketplaceState,
  payload: {
    orderId: string;
    buyerId: string;
    name: string;
    phone: string;
    relationship: string;
    note?: string;
  }
): { state: MarketplaceState; error?: string } {
  const order = state.orders.find((o) => o.id === payload.orderId);
  if (!order) return { state, error: 'Order not found.' };
  if (order.buyerId !== payload.buyerId) {
    return { state, error: 'Only the order customer can authorize an alternative recipient.' };
  }
  if (!payload.name.trim() || !payload.phone.trim()) {
    return { state, error: 'Alternative recipient full name and Nigerian phone number are required.' };
  }

  const authorizedAt = isoNow();
  const recipientRecord = {
    name: payload.name.trim(),
    phone: payload.phone.trim(),
    relationship: payload.relationship.trim() || 'Authorized Representative',
    note: payload.note?.trim(),
    authorizedAt,
    authorizedByBuyerId: payload.buyerId,
  };

  const noteText = `Customer authorized alternative recipient for ${order.orderNumber}: ${recipientRecord.name} (${recipientRecord.relationship}, ${recipientRecord.phone}).`;

  return {
    state: {
      ...state,
      orders: state.orders.map((o) =>
        o.id === order.id
          ? {
              ...o,
              alternativeRecipient: recipientRecord,
              events: [...o.events, { title: noteText, time: nowLabel(), done: true }],
            }
          : o
      ),
      conversations: state.conversations.map((c) =>
        c.orderId === order.id
          ? {
              ...c,
              lastMessage: noteText,
              lastMessageTime: 'Just now',
              unreadCountVendor: (c.unreadCountVendor || 0) + 1,
              messages: [
                ...c.messages,
                {
                  id: `msg-alt-${Date.now()}`,
                  sender: 'system',
                  orderNumber: order.orderNumber,
                  text: noteText,
                  timestamp: nowLabel(),
                },
              ],
            }
          : c
      ),
      auditLog: appendAudit(state, {
        actorRole: 'buyer',
        actorName: order.buyerName,
        actionType: 'alternative_recipient_set',
        entityRef: order.orderNumber,
        details: noteText,
      }),
    },
  };
}

/**
 * Allows fulfilling vendor to record a failed delivery attempt and reschedule window cleanly without releasing funds.
 */
export function markDeliveryAttemptFailed(
  state: MarketplaceState,
  payload: {
    orderId: string;
    actorVendorId?: string;
    reason: string;
    rescheduledWindow?: string;
  }
): { state: MarketplaceState; error?: string } {
  const order = state.orders.find((o) => o.id === payload.orderId);
  if (!order) return { state, error: 'Order not found.' };
  const ownerVendorId = order.vendorId || order.listing.sellerId;
  if (payload.actorVendorId && payload.actorVendorId !== ownerVendorId) {
    return { state, error: 'Unauthorized: Only the fulfilling vendor can update delivery attempts.' };
  }
  if (!payload.reason.trim()) {
    return { state, error: 'Specify the reason for the failed delivery attempt.' };
  }

  const nextFailedCount = (order.dispatchDetails?.failedAttemptCount || 0) + 1;
  const nextStatus = payload.rescheduledWindow ? 'rescheduled' : 'failed_attempt';
  const summaryText = `Delivery attempt #${nextFailedCount} unsuccessful: ${payload.reason.trim()}${
    payload.rescheduledWindow ? ` · Rescheduled for: ${payload.rescheduledWindow.trim()}` : ''
  }`;

  return {
    state: {
      ...state,
      orders: state.orders.map((o) =>
        o.id === order.id
          ? {
              ...o,
              estimatedDelivery: payload.rescheduledWindow?.trim() || o.estimatedDelivery,
              deliveryAttemptFailedReason: payload.reason.trim(),
              deliveryRescheduledWindow: payload.rescheduledWindow?.trim(),
              dispatchDetails: o.dispatchDetails
                ? {
                    ...o.dispatchDetails,
                    dispatchStatus: nextStatus,
                    expectedDeliveryWindow:
                      payload.rescheduledWindow?.trim() || o.dispatchDetails.expectedDeliveryWindow,
                    failedAttemptCount: nextFailedCount,
                    lastFailedReason: payload.reason.trim(),
                    lastFailedAt: isoNow(),
                  }
                : undefined,
              events: [...o.events, { title: summaryText, time: nowLabel(), done: true }],
            }
          : o
      ),
      notifications: [
        {
          id: `notif-fail-del-${Date.now()}`,
          title: `Delivery Update (${order.orderNumber})`,
          message: summaryText,
          time: 'Just now',
          read: false,
          type: 'order',
          recipientRole: 'buyer',
          orderId: order.id,
        },
        ...state.notifications,
      ],
      auditLog: appendAudit(state, {
        actorRole: 'seller_approved',
        actorName: order.vendorName || order.listing.sellerName,
        actionType: 'delivery_attempt_failed',
        entityRef: order.orderNumber,
        details: summaryText,
      }),
    },
  };
}

/**
 * Customer submits a post-delivery 3-Month Vendor Warranty Claim.
 * Strictly separate from 24-hour escrow disputes: DOES NOT reverse completed escrow payouts or freeze holds.
 */
export function submitWarrantyClaim(
  state: MarketplaceState,
  payload: {
    orderId: string;
    buyerId: string;
    buyerName: string;
    issueCategory: WarrantyClaimCategory;
    description: string;
    attachmentNames?: string[];
    attachmentPreviews?: string[];
  }
): { state: MarketplaceState; claim?: WarrantyClaim; error?: string } {
  const order = state.orders.find((o) => o.id === payload.orderId);
  if (!order) return { state, error: 'Order not found.' };
  if (order.buyerId !== payload.buyerId) {
    return { state, error: 'Only the verified customer for this order may submit a warranty claim.' };
  }
  if (!order.warranty || !isWarrantyActive(order.warranty)) {
    return {
      state,
      error: 'The 3-month vendor hardware warranty is only active after confirmed delivery and before expiry.',
    };
  }
  if (!payload.description || payload.description.trim().length < 10) {
    return { state, error: 'Describe the hardware issue clearly (minimum 10 characters).' };
  }

  const claimId = `wrn-${Date.now()}`;
  const claimNumber = `UR-WRN-CLM-${Math.floor(100000 + Math.random() * 900000)}`;
  const now = isoNow();
  const vendorId = order.vendorId || order.listing.sellerId;
  const vendor = state.vendors.find((v) => v.id === vendorId);
  const vendorNumber = order.vendorNumber || vendor?.vendorNumber || 'U-0001';

  const newClaim: WarrantyClaim = {
    id: claimId,
    claimNumber,
    warrantyId: order.warranty.warrantyId,
    orderId: order.id,
    orderNumber: order.orderNumber,
    buyerId: payload.buyerId,
    buyerName: payload.buyerName,
    vendorId,
    vendorNumber,
    vendorName: order.vendorName || order.listing.sellerName,
    deviceTitle: order.listing.title,
    issueCategory: payload.issueCategory,
    description: payload.description.trim(),
    attachmentNames: payload.attachmentNames,
    attachmentPreviews: payload.attachmentPreviews,
    status: 'Submitted',
    createdAt: now,
    updatedAt: now,
    activity: [
      {
        id: `wact-${Date.now()}`,
        actorRole: 'buyer',
        actorName: payload.buyerName,
        action: `Submitted 3-month warranty claim (${claimNumber}) for ${payload.issueCategory}. Escrow settlement remains independent.`,
        timestamp: nowLabel(),
      },
    ],
  };

  const chatAlert = `WARRANTY CLAIM OPENED (${claimNumber}) under 3-Month Vendor Warranty (${order.warranty.warrantyId}): ${payload.issueCategory}. Responsible Vendor: ${newClaim.vendorName} (${vendorNumber}). Note: Warranty claims are handled independently of completed escrow settlements.`;

  return {
    claim: newClaim,
    state: {
      ...state,
      warrantyClaims: [newClaim, ...(state.warrantyClaims || [])],
      orders: state.orders.map((o) =>
        o.id === order.id && o.warranty
          ? {
              ...o,
              warranty: { ...o.warranty, status: 'Claim Open' },
              events: [...o.events, { title: chatAlert, time: nowLabel(), done: true }],
            }
          : o
      ),
      conversations: state.conversations.map((c) =>
        c.orderId === order.id
          ? {
              ...c,
              lastMessage: chatAlert,
              lastMessageTime: 'Just now',
              unreadCountVendor: (c.unreadCountVendor || 0) + 1,
              messages: [
                ...c.messages,
                {
                  id: `msg-wrn-${Date.now()}`,
                  sender: 'system',
                  warrantyClaimId: claimId,
                  orderNumber: order.orderNumber,
                  text: chatAlert,
                  timestamp: nowLabel(),
                },
              ],
            }
          : c
      ),
      notifications: [
        {
          id: `notif-wrn-vnd-${Date.now()}`,
          title: `3-Month Warranty Claim (${claimNumber})`,
          message: `${payload.buyerName} opened a warranty claim on ${order.orderNumber}: ${payload.issueCategory}. Respond within 48h.`,
          time: 'Just now',
          read: false,
          type: 'warranty',
          recipientRole: 'vendor',
          orderId: order.id,
        },
        {
          id: `notif-wrn-adm-${Date.now() + 1}`,
          title: `Warranty Claim Logged (${claimNumber})`,
          message: `${order.orderNumber} · ${payload.issueCategory} · Vendor ${newClaim.vendorName} (${vendorNumber}).`,
          time: 'Just now',
          read: false,
          type: 'warranty',
          recipientRole: 'admin',
          orderId: order.id,
        },
        ...state.notifications,
      ],
      auditLog: appendAudit(state, {
        actorRole: 'buyer',
        actorName: payload.buyerName,
        actionType: 'warranty_claim_opened',
        entityRef: claimNumber,
        details: `Opened ${claimNumber} under ${order.warranty.warrantyId} (${order.orderNumber}): ${payload.issueCategory}.`,
      }),
    },
  };
}

export function vendorRespondWarrantyClaim(
  state: MarketplaceState,
  payload: {
    claimId: string;
    vendorId: string;
    vendorName: string;
    proposedRemedy: WarrantyClaim['proposedRemedy'];
    vendorResponse: string;
    nextStatus?: WarrantyClaimStatus;
  }
): { state: MarketplaceState; error?: string } {
  const claim = (state.warrantyClaims || []).find((c) => c.id === payload.claimId);
  if (!claim) return { state, error: 'Warranty claim not found.' };
  if (claim.vendorId !== payload.vendorId) {
    return { state, error: 'Unauthorized: Only the responsible vendor can respond to this warranty claim.' };
  }
  if (!payload.vendorResponse.trim()) {
    return { state, error: 'Provide clear inspection or remedy instructions for the customer.' };
  }

  const nextStatus: WarrantyClaimStatus =
    payload.nextStatus ||
    (payload.proposedRemedy === 'Declined (Excluded Damage)' ? 'Vendor Reviewing' : 'Repair / Remedy Proposed');

  const msgText = `Vendor Warranty Update (${claim.claimNumber}) — Proposed Remedy: ${payload.proposedRemedy}. ${payload.vendorResponse.trim()}`;

  return {
    state: {
      ...state,
      warrantyClaims: (state.warrantyClaims || []).map((c) =>
        c.id === claim.id
          ? {
              ...c,
              status: nextStatus,
              proposedRemedy: payload.proposedRemedy,
              vendorResponse: payload.vendorResponse.trim(),
              updatedAt: isoNow(),
              activity: [
                ...c.activity,
                {
                  id: `wact-${Date.now()}`,
                  actorRole: 'vendor',
                  actorName: payload.vendorName,
                  action: `${payload.proposedRemedy}: ${payload.vendorResponse.trim()}`,
                  timestamp: nowLabel(),
                },
              ],
            }
          : c
      ),
      conversations: state.conversations.map((c) =>
        c.orderId === claim.orderId
          ? {
              ...c,
              lastMessage: msgText,
              lastMessageTime: 'Just now',
              unreadCountBuyer: (c.unreadCountBuyer || 0) + 1,
              messages: [
                ...c.messages,
                {
                  id: `msg-wrn-rsp-${Date.now()}`,
                  sender: 'vendor',
                  warrantyClaimId: claim.id,
                  orderNumber: claim.orderNumber,
                  text: msgText,
                  timestamp: nowLabel(),
                },
              ],
            }
          : c
      ),
      notifications: [
        {
          id: `notif-wrn-res-${Date.now()}`,
          title: `Warranty Update (${claim.claimNumber})`,
          message: msgText,
          time: 'Just now',
          read: false,
          type: 'warranty',
          recipientRole: 'buyer',
          orderId: claim.orderId,
        },
        ...state.notifications,
      ],
      auditLog: appendAudit(state, {
        actorRole: 'seller_approved',
        actorName: payload.vendorName,
        actionType: 'warranty_claim_updated',
        entityRef: claim.claimNumber,
        details: msgText,
      }),
    },
  };
}

export function adminUpdateWarrantyClaim(
  state: MarketplaceState,
  payload: {
    claimId: string;
    adminName: string;
    status: WarrantyClaimStatus;
    resolutionSummary?: string;
    adminNotes?: string;
  }
): MarketplaceState {
  const claim = (state.warrantyClaims || []).find((c) => c.id === payload.claimId);
  if (!claim) return state;

  const noteSummary = `USED RIGHT SUPPORT updated warranty claim ${claim.claimNumber} to ${payload.status}.${
    payload.resolutionSummary ? ` ${payload.resolutionSummary}` : ''
  }`;

  return {
    ...state,
    warrantyClaims: (state.warrantyClaims || []).map((c) =>
      c.id === claim.id
        ? {
            ...c,
            status: payload.status,
            resolutionSummary: payload.resolutionSummary || c.resolutionSummary,
            adminNotes: payload.adminNotes || c.adminNotes,
            updatedAt: isoNow(),
            activity: [
              ...c.activity,
              {
                id: `wact-adm-${Date.now()}`,
                actorRole: 'admin',
                actorName: payload.adminName,
                action: noteSummary,
                timestamp: nowLabel(),
              },
            ],
          }
        : c
    ),
    orders:
      payload.status === 'Resolved'
        ? state.orders.map((o) =>
            o.id === claim.orderId && o.warranty
              ? { ...o, warranty: { ...o.warranty, status: 'Active' } }
              : o
          )
        : state.orders,
    auditLog: appendAudit(state, {
      actorRole: 'admin',
      actorName: payload.adminName,
      actionType: 'warranty_claim_updated',
      entityRef: claim.claimNumber,
      details: noteSummary,
    }),
  };
}

export function adminUpdateWarrantyConfig(
  state: MarketplaceState,
  payload: Partial<WarrantyPolicyConfig> & { adminName: string }
): MarketplaceState {
  const prev = state.warrantyConfig || DEFAULT_WARRANTY_POLICY_CONFIG;
  const next: WarrantyPolicyConfig = {
    ...prev,
    defaultDurationMonths:
      payload.defaultDurationMonths !== undefined
        ? Math.max(1, Math.min(24, Math.floor(payload.defaultDurationMonths)))
        : prev.defaultDurationMonths,
    claimResponseSlaHours:
      payload.claimResponseSlaHours !== undefined
        ? Math.max(12, Math.floor(payload.claimResponseSlaHours))
        : prev.claimResponseSlaHours,
    coveredSummary: payload.coveredSummary || prev.coveredSummary,
    excludedSummary: payload.excludedSummary || prev.excludedSummary,
    updatedAt: isoNow(),
    updatedBy: payload.adminName,
  };

  return {
    ...state,
    warrantyConfig: next,
    auditLog: appendAudit(state, {
      actorRole: 'admin',
      actorName: payload.adminName,
      actionType: 'admin_config_changed',
      entityRef: 'WarrantyPolicyConfig',
      details: `Updated default warranty policy: ${next.defaultDurationMonths} months, vendor SLA ${next.claimResponseSlaHours}h.`,
    }),
  };
}

export function flagOffPlatformAttempt(
  state: MarketplaceState,
  payload: {
    userId: string;
    userName: string;
    userRole: 'buyer' | 'vendor';
    orderId?: string;
    orderNumber?: string;
    conversationId?: string;
    messageId?: string;
    contentType: ModerationFlag['contentType'];
    flaggedContent: string;
    attachmentPreviewUrl?: string;
    triggers: string[];
    riskLevel: ModerationRiskLevel;
  }
): { state: MarketplaceState; flag: ModerationFlag } {
  const existingWarnings = (state.moderationFlags || []).filter(
    (f) => f.userId === payload.userId && f.status !== 'Dismissed'
  ).length;

  const flag: ModerationFlag = {
    id: `mod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: isoNow(),
    userId: payload.userId,
    userName: payload.userName,
    userRole: payload.userRole,
    orderId: payload.orderId,
    orderNumber: payload.orderNumber,
    conversationId: payload.conversationId,
    messageId: payload.messageId,
    contentType: payload.contentType,
    flaggedContent: payload.flaggedContent,
    attachmentPreviewUrl: payload.attachmentPreviewUrl,
    triggers: payload.triggers,
    riskLevel: payload.riskLevel,
    priorWarningsCount: existingWarnings,
    status: 'Pending Review',
  };

  return {
    flag,
    state: {
      ...state,
      moderationFlags: [flag, ...(state.moderationFlags || [])],
      notifications: [
        {
          id: `notif-mod-${Date.now()}`,
          title: `Safety Flag (${payload.riskLevel} Risk)`,
          message: `${payload.userName} (${payload.userRole}) triggered ${payload.triggers.join(', ')}.`,
          time: 'Just now',
          read: false,
          type: 'safety',
          recipientRole: 'admin',
          orderId: payload.orderId,
          conversationId: payload.conversationId,
        },
        ...state.notifications,
      ],
      auditLog: appendAudit(state, {
        actorRole: 'system',
        actorName: 'UsedRight Safety Filter',
        actionType: 'moderation_flag_created',
        entityRef: payload.orderNumber || payload.userName,
        details: `${payload.riskLevel} risk flag created (${payload.triggers.join(', ')}).`,
      }),
    },
  };
}

export function adminModerateFlag(
  state: MarketplaceState,
  payload: {
    flagId: string;
    action: 'warn' | 'restrict_messaging' | 'suspend_vendor' | 'dismiss';
    adminName: string;
    note?: string;
  }
): MarketplaceState {
  const flag = (state.moderationFlags || []).find((f) => f.id === payload.flagId);
  if (!flag) return state;

  const statusMap: Record<typeof payload.action, ModerationFlag['status']> = {
    warn: 'Warned',
    restrict_messaging: 'Messaging Restricted',
    suspend_vendor: 'Account Suspended',
    dismiss: 'Dismissed',
  };

  const nextStatus = statusMap[payload.action];
  const restricted = new Set(state.restrictedMessagingUserIds || []);
  if (payload.action === 'restrict_messaging' || payload.action === 'suspend_vendor') {
    restricted.add(flag.userId);
  }

  return {
    ...state,
    restrictedMessagingUserIds: Array.from(restricted),
    vendors:
      payload.action === 'suspend_vendor' && flag.userRole === 'vendor'
        ? state.vendors.map((v) =>
            v.id === flag.userId || v.name === flag.userName
              ? { ...v, isSuspended: true, verificationBadge: false, verificationStatus: 'Rejected' }
              : v
          )
        : state.vendors,
    moderationFlags: (state.moderationFlags || []).map((f) =>
      f.id === flag.id
        ? {
            ...f,
            status: nextStatus,
            reviewedBy: payload.adminName,
            reviewedAt: isoNow(),
            resolutionNote: payload.note?.trim(),
          }
        : f
    ),
    auditLog: appendAudit(state, {
      actorRole: 'admin',
      actorName: payload.adminName,
      actionType: 'moderation_action_taken',
      entityRef: flag.userName,
      details: `Moderation decision "${nextStatus}" on ${flag.userName}${payload.note ? `: ${payload.note}` : ''}`,
    }),
  };
}

export function adminReviewVendorVerification(
  state: MarketplaceState,
  payload: {
    vendorId: string;
    decision: 'Approved' | 'Rejected' | 'Needs Info';
    identityStatus?: 'Approved' | 'Under Review' | 'Rejected' | 'Needs Info';
    socialStatus?: 'Approved' | 'Under Review' | 'Rejected' | 'Needs Info';
    notes?: string;
    adminName: string;
  }
): MarketplaceState {
  const isApproved = payload.decision === 'Approved';
  let nextSeq = state.nextVendorSeq || 49;

  // Handle both catalog vendors and pendingSellerState
  const updatedVendors = state.vendors.map((v) => {
    if (v.id !== payload.vendorId) return v;
    const assignedNumber = v.vendorNumber || generateVendorNumber(nextSeq++);
    return {
      ...v,
      vendorNumber: assignedNumber,
      verificationStatus: payload.decision,
      verificationBadge: isApproved,
      identityVerificationStatus: payload.identityStatus || payload.decision,
      socialVerificationStatus: payload.socialStatus || payload.decision,
      socialLinks: v.socialLinks?.map((l) => ({ ...l, verified: isApproved })),
      verificationReview: {
        reviewedBy: payload.adminName,
        reviewedAt: isoNow(),
        notes: payload.notes?.trim(),
        decision: payload.decision,
      },
    };
  });

  const pendingMatches =
    payload.vendorId === 'pending-seller' ||
    payload.vendorId === state.pendingSellerState.businessName;

  const nextPendingState = pendingMatches
    ? {
        ...state.pendingSellerState,
        status:
          payload.decision === 'Approved'
            ? ('Approved' as const)
            : payload.decision === 'Rejected'
              ? ('Rejected' as const)
              : ('Additional Information Required' as const),
        vendorNumber:
          state.pendingSellerState.vendorNumber || generateVendorNumber(nextSeq++),
        socialVerificationStatus: payload.socialStatus || payload.decision,
      }
    : state.pendingSellerState;

  return {
    ...state,
    nextVendorSeq: nextSeq,
    vendors: updatedVendors,
    pendingSellerState: nextPendingState,
    listings: state.listings.map((l) =>
      l.sellerId === payload.vendorId ? { ...l, sellerVerified: isApproved } : l
    ),
    auditLog: appendAudit(state, {
      actorRole: 'admin',
      actorName: payload.adminName,
      actionType: 'vendor_verification_reviewed',
      entityRef: payload.vendorId,
      details: `Vendor verification marked "${payload.decision}" (Social: ${payload.socialStatus || payload.decision}).${
        payload.notes ? ` Notes: ${payload.notes}` : ''
      }`,
    }),
  };
}

export function toggleFollowVendor(
  state: MarketplaceState,
  vendorId: string
): { state: MarketplaceState; isFollowing: boolean } {
  const existing = new Set(state.followedVendorIds || []);
  const wasFollowing = existing.has(vendorId);
  if (wasFollowing) existing.delete(vendorId);
  else existing.add(vendorId);

  return {
    isFollowing: !wasFollowing,
    state: {
      ...state,
      followedVendorIds: Array.from(existing),
      vendors: state.vendors.map((v) =>
        v.id === vendorId
          ? {
              ...v,
              followerCount: Math.max(0, (v.followerCount || 40) + (wasFollowing ? -1 : 1)),
            }
          : v
      ),
    },
  };
}

/**
 * Admin updates configurable Payment Request validity duration (1–168 hours, default 24 hours).
 */
export function adminUpdatePaymentRequestConfig(
  state: MarketplaceState,
  payload: { validityHours: number; adminName: string }
): MarketplaceState {
  const rawHours = Number.isFinite(payload.validityHours)
    ? Math.floor(payload.validityHours)
    : DEFAULT_PAYMENT_REQUEST_VALIDITY_HOURS;
  const clampedHours = Math.max(
    MIN_PAYMENT_REQUEST_VALIDITY_HOURS,
    Math.min(MAX_PAYMENT_REQUEST_VALIDITY_HOURS, rawHours)
  );

  return {
    ...state,
    platformConfig: {
      ...state.platformConfig,
      paymentRequestValidityHours: clampedHours,
    },
    auditLog: appendAudit(state, {
      actorRole: 'admin',
      actorName: payload.adminName,
      actionType: 'admin_config_changed',
      entityRef: 'PaymentRequestValidityHours',
      details: `Updated Payment Request validity window to ${clampedHours} hours.`,
    }),
  };
}

export interface CreatePaymentRequestPayload {
  orderOwnerId: string;
  orderOwnerName: string;
  orderOwnerEmail: string;
  orderOwnerPhone: string;
  cartItems: CartItem[];
  deliveryMethod: DeliveryMethod;
  deliveryAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    landmark?: string;
  };
  isGift?: boolean;
  giftInput?: Partial<{
    recipientName: string;
    recipientPhone: string;
    street: string;
    city: string;
    state: string;
    landmark?: string;
    deliveryInstructions?: string;
    giftMessage?: string;
    senderVisibility?: 'show_name' | 'anonymous';
    senderDisplayName?: string;
    occasion?: string;
  }>;
  asDraft?: boolean;
  validityHours?: number;
  customRawToken?: string;
}

/**
 * Creates a persisted, locked Payment Request from a cart.
 * NEVER creates confirmed orders and NEVER notifies vendors before verified payment.
 */
export function createPaymentRequestRecord(
  state: MarketplaceState,
  payload: CreatePaymentRequestPayload
): { state: MarketplaceState; request?: PaymentRequestRecord; rawToken?: string; error?: string } {
  if (!payload.cartItems || payload.cartItems.length === 0) {
    return { state, error: 'Your cart is empty. Add at least one item before requesting payment.' };
  }

  let validatedGift: GiftOrderDetails | undefined;
  let effectiveAddress = payload.deliveryAddress;

  if (payload.isGift) {
    const giftRes = validateGiftOrderDetails(
      {
        ...(payload.giftInput || {}),
        recipientName: payload.giftInput?.recipientName ?? payload.deliveryAddress.fullName,
        recipientPhone: payload.giftInput?.recipientPhone ?? payload.deliveryAddress.phone,
        street: payload.giftInput?.street ?? payload.deliveryAddress.street,
        city: payload.giftInput?.city ?? payload.deliveryAddress.city,
        state: payload.giftInput?.state ?? payload.deliveryAddress.state,
        landmark: payload.giftInput?.landmark ?? payload.deliveryAddress.landmark,
        senderDisplayName: payload.giftInput?.senderDisplayName || payload.orderOwnerName,
      },
      payload.deliveryMethod
    );
    if (!giftRes.valid || !giftRes.giftDetails) {
      return { state, error: giftRes.errors.join(' ') };
    }
    validatedGift = giftRes.giftDetails;
    effectiveAddress = validatedGift.recipientAddress;
  } else if (payload.deliveryMethod === 'usedright_delivery') {
    if (!effectiveAddress.fullName?.trim() || !effectiveAddress.street?.trim() || !effectiveAddress.city?.trim()) {
      return { state, error: 'Complete the delivery recipient name, street address, city, and state before requesting payment.' };
    }
  }

  const quote = calculateMultiVendorCheckoutQuote({
    cartItems: payload.cartItems,
    deliveryMethod: payload.deliveryMethod,
    listings: state.listings,
    vendors: state.vendors,
    feeConfig: state.feeConfig,
    deliveryConfig: state.deliveryConfig,
  });

  if (quote.unavailableItemIds.length > 0) {
    return {
      state,
      error: 'One or more cart items are currently out of stock or unavailable. Remove unavailable items first.',
    };
  }
  if (quote.vendorGroups.length === 0) {
    return { state, error: 'No active items available for payment request.' };
  }

  const rawToken = payload.customRawToken || generateRandomUrlToken(24);
  const tokenHash = sha256Hex(rawToken);
  const validityHours = Math.max(
    MIN_PAYMENT_REQUEST_VALIDITY_HOURS,
    Math.min(
      MAX_PAYMENT_REQUEST_VALIDITY_HOURS,
      Math.floor(payload.validityHours ?? state.platformConfig.paymentRequestValidityHours ?? DEFAULT_PAYMENT_REQUEST_VALIDITY_HOURS)
    )
  );
  const createdAtIso = isoNow();
  const expiresAtIso = new Date(Date.now() + validityHours * 3600 * 1000).toISOString();
  const requestReference = generatePaymentRequestRef();
  const reqId = `preq-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const itemsSnapshot: PaymentRequestItemSnapshot[] = quote.vendorGroups.flatMap((group) =>
    group.items.map((line) => ({
      cartItemId: line.cartItemId,
      listingId: line.listing.id,
      variationId: line.selectedVariation?.id,
      title: line.listing.title,
      brand: line.listing.brand,
      model: line.listing.model,
      category: line.listing.category,
      condition: line.listing.condition,
      cosmeticGrade: line.selectedVariation?.grade || line.listing.cosmeticGrade,
      color: line.selectedVariation?.color || line.listing.color,
      storage: line.selectedVariation?.storage || line.listing.storage,
      ram: line.selectedVariation?.ram || line.listing.ram,
      image: line.selectedVariation?.images?.[0] || line.listing.images[0] || '',
      vendorId: group.vendorId,
      vendorName: group.vendorName,
      vendorState: group.vendorState,
      vendorNumber: group.vendorNumber,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      accessoriesTotal: line.accessoriesTotal,
      lineSubtotal: line.lineSubtotal,
      disclosedFaults: line.selectedVariation?.disclosedFaults || line.listing.disclosedFaults || [],
      selectedAccessories: JSON.parse(JSON.stringify(line.selectedAccessories || [])),
      includedFreeGift: line.listing.freeGift ? JSON.parse(JSON.stringify(line.listing.freeGift)) : undefined,
    }))
  );

  const vendorGroupsSummary = quote.vendorGroups.map((g) => ({
    vendorId: g.vendorId,
    vendorName: g.vendorName,
    vendorState: g.vendorState,
    subtotal: g.vendorSubtotal,
    deliveryFee: g.vendorDeliveryFee,
    vendorFee: g.vendor_platform_service_fee,
    customerFeeShare: g.customerFeeShare,
  }));

  const status = payload.asDraft ? ('Draft' as const) : ('Pending payment' as const);

  const requestRecord: PaymentRequestRecord = {
    id: reqId,
    requestReference,
    tokenHash,
    shareTokenDemo: rawToken,
    orderOwnerId: payload.orderOwnerId,
    orderOwnerName: payload.orderOwnerName,
    orderOwnerEmail: payload.orderOwnerEmail,
    orderOwnerPhone: payload.orderOwnerPhone,
    status,
    createdAt: createdAtIso,
    expiresAt: expiresAtIso,
    validityHours,
    deliveryMethod: payload.deliveryMethod,
    deliveryAddress: effectiveAddress,
    isGift: Boolean(validatedGift),
    giftDetails: validatedGift,
    cartItemsSnapshot: JSON.parse(JSON.stringify(payload.cartItems)),
    itemsSnapshot,
    vendorGroupsSummary,
    subtotalAmount: quote.subtotal,
    customerFeeRate: quote.customerFeeRate,
    customer_platform_service_fee: quote.customer_platform_service_fee,
    deliveryFeeTotal: quote.deliveryFeeTotal,
    totalPayableAmount: quote.totalAmount,
    currency: 'NGN',
    suspiciousAttemptsCount: 0,
    auditEvents: [
      {
        id: `paud-${Date.now()}`,
        timestamp: createdAtIso,
        actorRole: 'buyer',
        actorName: payload.orderOwnerName,
        action: status === 'Draft' ? 'Saved payment request draft' : 'Generated shareable payment request link',
        note: `Locked total ₦${quote.totalAmount.toLocaleString('en-NG')} across ${quote.vendorCount} vendor(s). Expires in ${validityHours}h.`,
      },
    ],
  };

  return {
    request: requestRecord,
    rawToken,
    state: {
      ...state,
      paymentRequests: [requestRecord, ...(state.paymentRequests || [])],
      notifications: [
        {
          id: `notif-preq-crt-${Date.now()}`,
          title: `Payment Request Created (${requestReference})`,
          message: `Share link ready for ₦${quote.totalAmount.toLocaleString('en-NG')} (${itemsSnapshot.length} item(s)). Valid for ${validityHours} hours. Vendors are NOT notified until payment clears.`,
          time: 'Just now',
          read: false,
          type: 'order',
          recipientRole: 'buyer',
          paymentRequestId: reqId,
        },
        ...state.notifications,
      ],
      auditLog: appendAudit(state, {
        actorRole: 'buyer',
        actorName: payload.orderOwnerName,
        actionType: 'payment_request_created',
        entityRef: requestReference,
        details: `Created payment request ${requestReference} (${status}) for ₦${quote.totalAmount.toLocaleString('en-NG')}${validatedGift ? ` [Gift for ${validatedGift.recipientName}]` : ''}.`,
      }),
    },
  };
}

/**
 * Checks a Payment Request against live expiry/stock/prices and transitions unpaid stale requests to Expired or Invalidated.
 */
export function refreshPaymentRequestState(
  state: MarketplaceState,
  paymentRequestId: string,
  nowMs: number = Date.now()
): { state: MarketplaceState; request?: PaymentRequestRecord; availability: ReturnType<typeof evaluatePaymentRequestAvailability> } {
  const existing = (state.paymentRequests || []).find((r) => r.id === paymentRequestId);
  if (!existing) {
    return {
      state,
      availability: {
        valid: false,
        reason: 'Payment request not found.',
        priceChangedItems: [],
        unavailableItems: [],
      },
    };
  }

  const evalRes = evaluatePaymentRequestAvailability({
    request: existing,
    listings: state.listings,
    vendors: state.vendors,
    nowMs,
  });

  if (evalRes.shouldExpire && existing.status !== 'Expired') {
    const expiredReq: PaymentRequestRecord = {
      ...existing,
      status: 'Expired',
      auditEvents: [
        ...existing.auditEvents,
        {
          id: `paud-exp-${Date.now()}`,
          timestamp: isoNow(),
          actorRole: 'system',
          actorName: 'Payment Request Expiry Guard',
          action: 'Marked payment request Expired',
          note: 'Validity window elapsed without verified payment.',
        },
      ],
    };
    return {
      request: expiredReq,
      availability: evalRes,
      state: {
        ...state,
        paymentRequests: (state.paymentRequests || []).map((r) => (r.id === existing.id ? expiredReq : r)),
        notifications: [
          {
            id: `notif-preq-exp-${Date.now()}`,
            title: `Payment Request Expired (${existing.requestReference})`,
            message: `Your payment request link (${existing.requestReference}) expired unpaid. Create a new link from Shared Payments & Gifts if needed.`,
            time: 'Just now',
            read: false,
            type: 'order',
            recipientRole: 'buyer',
            paymentRequestId: existing.id,
          },
          ...state.notifications,
        ],
        auditLog: appendAudit(state, {
          actorRole: 'system',
          actorName: 'Payment Request Expiry Guard',
          actionType: 'payment_request_expired',
          entityRef: existing.requestReference,
          details: `Payment request ${existing.requestReference} expired automatically.`,
        }),
      },
    };
  }

  if (evalRes.shouldInvalidate && existing.status !== 'Invalidated') {
    const invReq: PaymentRequestRecord = {
      ...existing,
      status: 'Invalidated',
      invalidatedReason: evalRes.reason,
      auditEvents: [
        ...existing.auditEvents,
        {
          id: `paud-inv-${Date.now()}`,
          timestamp: isoNow(),
          actorRole: 'system',
          actorName: 'Catalog Integrity Guard',
          action: 'Invalidated payment request due to stock/price change',
          note: evalRes.reason,
        },
      ],
    };
    return {
      request: invReq,
      availability: evalRes,
      state: {
        ...state,
        paymentRequests: (state.paymentRequests || []).map((r) => (r.id === existing.id ? invReq : r)),
        notifications: [
          {
            id: `notif-preq-inv-${Date.now()}`,
            title: `Payment Link Needs Refresh (${existing.requestReference})`,
            message: evalRes.reason || 'Product stock or price changed before payment. Review cart and issue a fresh payment link.',
            time: 'Just now',
            read: false,
            type: 'order',
            recipientRole: 'buyer',
            paymentRequestId: existing.id,
          },
          ...state.notifications,
        ],
        auditLog: appendAudit(state, {
          actorRole: 'system',
          actorName: 'Catalog Integrity Guard',
          actionType: 'payment_request_invalidated',
          entityRef: existing.requestReference,
          details: evalRes.reason || 'Stock or price changed before payment.',
        }),
      },
    };
  }

  return { state, request: existing, availability: evalRes };
}

/**
 * Cancels an unpaid Payment Request strictly by the cart/order owner.
 */
export function cancelPaymentRequestRecord(
  state: MarketplaceState,
  payload: { paymentRequestId: string; actorBuyerId: string }
): { state: MarketplaceState; error?: string } {
  const existing = (state.paymentRequests || []).find((r) => r.id === payload.paymentRequestId);
  if (!existing) return { state, error: 'Payment request not found.' };
  if (existing.orderOwnerId !== payload.actorBuyerId) {
    return { state, error: 'Forbidden: Only the cart owner can cancel this payment request.' };
  }
  if (existing.status === 'Paid' || existing.status === 'Payment processing') {
    return { state, error: 'Paid or processing requests cannot be cancelled from here; use Order Details / Support.' };
  }
  if (existing.status === 'Cancelled') {
    return { state };
  }

  const cancelledAt = isoNow();
  const updatedReq: PaymentRequestRecord = {
    ...existing,
    status: 'Cancelled',
    cancelledAt,
    auditEvents: [
      ...existing.auditEvents,
      {
        id: `paud-can-${Date.now()}`,
        timestamp: cancelledAt,
        actorRole: 'buyer',
        actorName: existing.orderOwnerName,
        action: 'Cancelled unpaid payment request',
      },
    ],
  };

  return {
    state: {
      ...state,
      paymentRequests: (state.paymentRequests || []).map((r) =>
        r.id === existing.id ? updatedReq : r
      ),
      notifications: [
        {
          id: `notif-preq-can-${Date.now()}`,
          title: `Payment Request Cancelled (${existing.requestReference})`,
          message: `You cancelled payment request ${existing.requestReference}. Anyone opening the old link will be blocked.`,
          time: 'Just now',
          read: false,
          type: 'order',
          recipientRole: 'buyer',
          paymentRequestId: existing.id,
        },
        ...state.notifications,
      ],
      auditLog: appendAudit(state, {
        actorRole: 'buyer',
        actorName: existing.orderOwnerName,
        actionType: 'payment_request_cancelled',
        entityRef: existing.requestReference,
        details: `Cancelled unpaid payment request ${existing.requestReference}.`,
      }),
    },
  };
}

/**
 * Atomically executes payment for a Payment Request:
 * - Enforces replay protection, expiry, stock/price integrity, and server-side amount verification
 * - Never allows a payer to change items, quantities, vendors, recipient, or cart owner account
 * - Records Cart Owner, Payer, and Recipient distinctly and notifies all parties appropriately
 */
export function attemptPaymentRequestCheckout(
  state: MarketplaceState,
  payload: {
    paymentRequestId: string;
    payerName: string;
    payerEmail: string;
    payerPhone: string;
    payerId?: string;
    isAuthenticatedCustomer?: boolean;
    outcome: 'success' | 'pending' | 'failed';
    paymentProviderRef?: string;
    idempotencyKey?: string;
    expectedAmount?: number;
    nowMs?: number;
  }
): {
  state: MarketplaceState;
  status: PaymentRequestRecord['status'];
  parentOrder?: ParentOrderRecord;
  childOrders?: Order[];
  error?: string;
} {
  const existing = (state.paymentRequests || []).find((r) => r.id === payload.paymentRequestId);
  if (!existing) {
    return { state, status: 'Invalidated', error: 'Payment request not found.' };
  }

  // Tamper / Replay guard on Paid / Processing / Cancelled / Expired / Amount mismatch
  const isAmountTampered =
    payload.expectedAmount !== undefined &&
    Math.round(payload.expectedAmount) !== Math.round(existing.totalPayableAmount);

  if (
    existing.status === 'Paid' ||
    existing.status === 'Payment processing' ||
    isAmountTampered
  ) {
    const suspiciousMsg = isAmountTampered
      ? `Rejected manipulated payment amount (${payload.expectedAmount} vs expected ${existing.totalPayableAmount}) on ${existing.requestReference}.`
      : `Blocked duplicate/replay payment attempt on ${existing.status} request ${existing.requestReference}.`;

    const flaggedReq: PaymentRequestRecord = {
      ...existing,
      suspiciousAttemptsCount: (existing.suspiciousAttemptsCount || 0) + 1,
      auditEvents: [
        ...existing.auditEvents,
        {
          id: `paud-susp-${Date.now()}`,
          timestamp: isoNow(),
          actorRole: 'system',
          actorName: 'Payment Security Guard',
          action: suspiciousMsg,
        },
      ],
    };

    return {
      status: existing.status,
      error: suspiciousMsg,
      state: {
        ...state,
        paymentRequests: (state.paymentRequests || []).map((r) =>
          r.id === existing.id ? flaggedReq : r
        ),
        auditLog: appendAudit(state, {
          actorRole: 'system',
          actorName: 'Payment Security Guard',
          actionType: 'payment_request_suspicious',
          entityRef: existing.requestReference,
          details: suspiciousMsg,
        }),
      },
    };
  }

  // Run fresh stock/price/expiry check
  const refreshed = refreshPaymentRequestState(state, existing.id, payload.nowMs);
  if (!refreshed.availability.valid) {
    return {
      state: refreshed.state,
      status: refreshed.request?.status || 'Invalidated',
      error: refreshed.availability.reason || 'Payment request is no longer valid.',
    };
  }

  let nextState = refreshed.state;
  const payerName = payload.payerName.trim();
  const payerEmail = payload.payerEmail.trim();
  const payerPhone = payload.payerPhone.trim();

  if (payerName.length < 2 || !payerEmail.includes('@') || payerPhone.length < 7) {
    return {
      state: nextState,
      status: existing.status,
      error: 'Enter the payer’s full name, email address (for receipt), and valid phone number.',
    };
  }

  const providerRef = payload.paymentProviderRef || `UR-PSK-REQ-${Date.now()}`;
  const payerInfo: PayerInfoRecord = {
    payerId: payload.payerId,
    payerName,
    payerEmail,
    payerPhone,
    relationship: 'Shared Payment Request Payer',
    isAuthenticatedCustomer: Boolean(payload.isAuthenticatedCustomer),
    paymentProviderRef: providerRef,
  };

  if (payload.outcome === 'failed') {
    const failReason = 'Payment authorization failed or was declined. No confirmed order was created.';
    const failedReq: PaymentRequestRecord = {
      ...existing,
      status: 'Failed',
      lastFailureReason: failReason,
      payerInfo,
      auditEvents: [
        ...existing.auditEvents,
        {
          id: `paud-fail-${Date.now()}`,
          timestamp: isoNow(),
          actorRole: 'payer',
          actorName: payerName,
          action: 'Payment attempt failed (no order created)',
          note: failReason,
        },
      ],
    };
    return {
      status: 'Failed',
      error: failReason,
      state: {
        ...nextState,
        paymentRequests: (nextState.paymentRequests || []).map((r) =>
          r.id === existing.id ? failedReq : r
        ),
        notifications: [
          {
            id: `notif-preq-fail-buy-${Date.now()}`,
            title: `Shared Payment Failed (${existing.requestReference})`,
            message: `${payerName}'s payment attempt for ₦${existing.totalPayableAmount.toLocaleString('en-NG')} failed. Vendors were not notified; link remains active until expiry.`,
            time: 'Just now',
            read: false,
            type: 'order',
            recipientRole: 'buyer',
            paymentRequestId: existing.id,
          },
          {
            id: `notif-preq-fail-pay-${Date.now() + 1}`,
            title: `Payment Failed (${existing.requestReference})`,
            message: failReason,
            time: 'Just now',
            read: false,
            type: 'order',
            recipientRole: 'payer',
            paymentRequestId: existing.id,
          },
          ...nextState.notifications,
        ],
        auditLog: appendAudit(nextState, {
          actorRole: payload.isAuthenticatedCustomer ? 'buyer' : 'visitor',
          actorName: `Payer: ${payerName}`,
          actionType: 'payment_request_failed',
          entityRef: existing.requestReference,
          details: failReason,
        }),
      },
    };
  }

  if (payload.outcome === 'pending') {
    const procReq: PaymentRequestRecord = {
      ...existing,
      status: 'Payment processing',
      payerInfo,
      paymentProviderRef: providerRef,
      auditEvents: [
        ...existing.auditEvents,
        {
          id: `paud-proc-${Date.now()}`,
          timestamp: isoNow(),
          actorRole: 'payer',
          actorName: payerName,
          action: 'Payment initiated and awaiting verification',
          note: `Ref: ${providerRef}`,
        },
      ],
    };
    return {
      status: 'Payment processing',
      state: {
        ...nextState,
        paymentRequests: (nextState.paymentRequests || []).map((r) =>
          r.id === existing.id ? procReq : r
        ),
      },
    };
  }

  // Verified Success -> Create multi-vendor order(s) preserving distinct Owner, Payer & Recipient
  const paidAtIso = isoNow();
  const verifiedPayerInfo: PayerInfoRecord = {
    ...payerInfo,
    paidAt: paidAtIso,
  };

  const orderResult = createMultiVendorOrdersFromCheckout(nextState, {
    buyerId: existing.orderOwnerId,
    orderOwnerId: existing.orderOwnerId,
    buyerName: existing.orderOwnerName,
    buyerEmail: existing.orderOwnerEmail,
    buyerPhone: existing.orderOwnerPhone,
    cartItems: existing.cartItemsSnapshot,
    deliveryMethod: existing.deliveryMethod,
    idempotencyKey: payload.idempotencyKey || `preq-idem-${existing.id}`,
    paymentProviderRef: providerRef,
    isDemoTransaction: true,
    payerInfo: verifiedPayerInfo,
    thirdPartyPayer: {
      relationship: 'Approved Third-Party Payer',
      payerFullName: payerName,
      note: `Paid via Payment Request ${existing.requestReference}`,
      acknowledgedNameGuidance: true,
      requiresVerificationFlag: false,
    },
    paymentRequestId: existing.id,
    paymentRequestReference: existing.requestReference,
    isGift: existing.isGift,
    giftDetails: existing.giftDetails,
    deliveryAddress: existing.deliveryAddress,
  });

  nextState = orderResult.state;

  const paidReq: PaymentRequestRecord = {
    ...existing,
    status: 'Paid',
    paidAt: paidAtIso,
    payerInfo: verifiedPayerInfo,
    paymentProviderRef: providerRef,
    parentOrderId: orderResult.parentOrder.id,
    parentOrderNumber: orderResult.parentOrder.parentOrderNumber,
    childOrderIds: orderResult.childOrders.map((o) => o.id),
    auditEvents: [
      ...existing.auditEvents,
      {
        id: `paud-paid-${Date.now()}`,
        timestamp: paidAtIso,
        actorRole: 'payer',
        actorName: payerName,
        action: `Payment verified (${providerRef}) & order ${orderResult.parentOrder.parentOrderNumber} created`,
        note: `Amount ₦${existing.totalPayableAmount.toLocaleString('en-NG')}. No duplicate customer fee charged.`,
      },
    ],
  };

  return {
    status: 'Paid',
    parentOrder: orderResult.parentOrder,
    childOrders: orderResult.childOrders,
    state: {
      ...nextState,
      paymentRequests: (nextState.paymentRequests || []).map((r) =>
        r.id === existing.id ? paidReq : r
      ),
      auditLog: appendAudit(nextState, {
        actorRole: payload.isAuthenticatedCustomer ? 'buyer' : 'visitor',
        actorName: `Payer: ${payerName}`,
        actionType: 'payment_request_paid',
        entityRef: existing.requestReference,
        details: `Paid ₦${existing.totalPayableAmount.toLocaleString('en-NG')} for ${existing.orderOwnerName}'s request ${existing.requestReference} -> ${orderResult.parentOrder.parentOrderNumber}${existing.isGift ? ` (Gift to ${existing.giftDetails?.recipientName})` : ''}.`,
      }),
    },
  };
}

/**
 * Allows a Gift Recipient (without creating a customer account) to submit an order-scoped delivery or product complaint.
 * Notifies Purchaser, Vendor, and UsedRight Admin while preserving Purchaser's primary refund authority.
 */
export function submitRecipientProblemReport(
  state: MarketplaceState,
  payload: {
    orderId: string;
    category: RecipientComplaintCategory;
    description: string;
    reporterName?: string;
  }
): { state: MarketplaceState; complaint?: RecipientComplaintRecord; error?: string } {
  const order = state.orders.find((o) => o.id === payload.orderId);
  if (!order || !order.isGift) {
    return { state, error: 'Gift order not found.' };
  }
  if (!payload.description || payload.description.trim().length < 10) {
    return { state, error: 'Describe the problem clearly (minimum 10 characters).' };
  }

  const complaintNumber = generateRecipientComplaintNumber();
  const complaintId = `gcmp-${Date.now()}`;
  const cleanDescription = sanitizeGiftMessage(payload.description);
  const recipientName =
    payload.reporterName?.trim() ||
    order.giftDetails?.recipientName ||
    order.deliveryAddress.fullName;

  // Map gift complaint category to formal dispute reason if not already disputed
  const reasonMap: Record<RecipientComplaintCategory, DisputeReason> = {
    'Wrong product': 'Wrong product received',
    'Undisclosed defect': 'Device has an undisclosed issue',
    'Missing accessories': 'Missing accessory',
    'Incorrect product condition': 'Product not as described',
    'Delivery damage': 'Product damaged',
    Other: 'Other',
  };

  let nextState = state;
  let linkedDisputeId = order.disputeId;

  if (!order.disputeId && order.fulfillmentStatus !== 'Refunded') {
    const conv = state.conversations.find((c) => c.orderId === order.id);
    const dspRes = openDisputeInChat(state, {
      orderId: order.id,
      conversationId: conv?.id || '',
      reason: reasonMap[payload.category],
      description: `[Gift Recipient Report ${complaintNumber} by ${recipientName}]: ${cleanDescription}`,
      requestedResolution: 'Full Refund to Customer',
    });
    nextState = dspRes.state;
    linkedDisputeId = dspRes.dispute?.id;
  }

  const complaint: RecipientComplaintRecord = {
    id: complaintId,
    complaintNumber,
    orderId: order.id,
    orderNumber: order.orderNumber,
    vendorId: order.vendorId || order.listing.sellerId,
    vendorName: order.vendorName || order.listing.sellerName,
    buyerId: order.buyerId,
    recipientName,
    category: payload.category,
    description: cleanDescription,
    createdAt: isoNow(),
    status: 'Open',
    disputeId: linkedDisputeId,
  };

  return {
    complaint,
    state: {
      ...nextState,
      recipientComplaints: [complaint, ...(nextState.recipientComplaints || [])],
      notifications: [
        {
          id: `notif-gcmp-buy-${Date.now()}`,
          title: `Gift Recipient Reported a Problem (${complaintNumber})`,
          message: `Recipient ${recipientName} reported "${payload.category}" on Gift Order ${order.orderNumber}. As the primary purchaser, only you authorize financial refund resolution.`,
          time: 'Just now',
          read: false,
          type: 'dispute',
          recipientRole: 'buyer',
          orderId: order.id,
        },
        {
          id: `notif-gcmp-adm-${Date.now() + 1}`,
          title: `Gift Complaint ${complaintNumber} (${order.orderNumber})`,
          message: `${recipientName} submitted "${payload.category}" on ${order.orderNumber}. Funds paused pending purchaser & support review.`,
          time: 'Just now',
          read: false,
          type: 'dispute',
          recipientRole: 'admin',
          orderId: order.id,
        },
        ...nextState.notifications,
      ],
      auditLog: appendAudit(nextState, {
        actorRole: 'buyer',
        actorName: `Gift Recipient: ${recipientName}`,
        actionType: 'gift_recipient_complaint',
        entityRef: complaintNumber,
        details: `Submitted ${complaintNumber} on ${order.orderNumber}: ${payload.category} — ${cleanDescription}`,
      }),
    },
  };
}



